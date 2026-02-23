import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  IconButton,
  Typography,
  Box,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import { useMemo, useState, useEffect, useRef } from 'react';

import ConfirmDialog from '../../components/ConfirmDialog';
import { CategoriesApi } from '../../api/categories.api';

import type { CategoryDetailsDto, CategoryAttributeDto } from '../../models/categoryDetails';
import type { CategoryAttributeRequest, CreateCategory, CategoryDto } from '../../models/category';
import type { AttributeDto } from '../../models/attribute';
import type { MeasurementUnit } from '../../models/unit';

import CategorySelectDialog from './CategorySelectDialog';
import AttributeSelectDialog from './AttributeSelectDialog';
import UnitSelectDialog from '../Attributes/UnitSelectDialog';

interface CategoryDetailsDialogProps {
  open: boolean;
  details: CategoryDetailsDto | null;
  onClose: () => void;
  onChanged: () => void;
}

type OwnRow = {
  rowId: string;
  attributeDefinitionId: string | null;
  attributeName: string | null;

  unitId: string | null;
  unitSymbol: string | null;

  isRequired: boolean;
  sortOrder: number;
};

function uniqueByAttrId<T extends { attributeDefinitionId: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const x of items) map.set(x.attributeDefinitionId, x);
  return Array.from(map.values());
}

function toRequestAttrsFromOwnRows(
  rows: OwnRow[],
  inheritedIds: Set<string>,
): CategoryAttributeRequest[] {
  return uniqueByAttrId(
    rows
      .filter((r) => r.attributeDefinitionId !== null)
      .map((r) => ({
        attributeDefinitionId: r.attributeDefinitionId as string,
        unitId: r.unitId ?? null,
        isRequired: r.isRequired,
        sortOrder: r.sortOrder,
      }))
      .filter((x) => !inheritedIds.has(x.attributeDefinitionId)),
  );
}

function parentAttributesAsInherited(parentDetails: CategoryDetailsDto): CategoryAttributeDto[] {
  return uniqueByAttrId([
    ...(parentDetails.inheritedAttributes ?? []),
    ...(parentDetails.ownAttributes ?? []),
  ]).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export default function CategoryDetailsDialog({
  open,
  details,
  onClose,
  onChanged,
}: CategoryDetailsDialogProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [draftName, setDraftName] = useState('');
  const [draftSlug, setDraftSlug] = useState('');

  const [draftParentId, setDraftParentId] = useState<string | null>(null);
  const [draftParentName, setDraftParentName] = useState<string>('');
  const [parentDialogOpen, setParentDialogOpen] = useState(false);

  const [draftInherited, setDraftInherited] = useState<CategoryAttributeDto[]>([]);
  const [ownRows, setOwnRows] = useState<OwnRow[]>([]);

  const [selectAttrRowId, setSelectAttrRowId] = useState<string | null>(null);
  const [selectUnitRowId, setSelectUnitRowId] = useState<string | null>(null);

  const [viewDetails, setViewDetails] = useState<CategoryDetailsDto | null>(null);

  // --- image draft state (важное отличие) ---
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);

  // если true — при сохранении нужно удалить существующую картинку на сервере
  const [pendingRemoveImage, setPendingRemoveImage] = useState(false);

  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [isImageBusy, setIsImageBusy] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const clearPendingPreview = () => {
    if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview);
    setPendingImagePreview(null);
  };

  const resetImageDraft = () => {
    clearPendingPreview();
    setPendingImageFile(null);
    setPendingRemoveImage(false);
    setIsDragOver(false);
  };

  useEffect(() => {
    setViewDetails(details);
    setIsEditing(false);
    resetImageDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details?.id, open]);

  const refreshDetails = async () => {
    if (!viewDetails) return;
    const res = await CategoriesApi.getDetails(viewDetails.id);
    setViewDetails(res.data);
  };

  const inheritedIds = useMemo(() => {
    const set = new Set<string>();
    const list = isEditing ? draftInherited : viewDetails?.inheritedAttributes;
    for (const a of list ?? []) set.add(a.attributeDefinitionId);
    return set;
  }, [viewDetails, draftInherited, isEditing]);

  const inheritedSorted = useMemo(() => {
    const list = (isEditing ? draftInherited : viewDetails?.inheritedAttributes) ?? [];
    return [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [viewDetails, draftInherited, isEditing]);

  if (!viewDetails) return null;

  const initOwnRowsFromDetails = () => {
    const base = viewDetails.ownAttributes ?? [];
    setOwnRows(
      base
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((a) => ({
          rowId: crypto.randomUUID(),
          attributeDefinitionId: a.attributeDefinitionId,
          attributeName: a.attributeName,
          unitId: a.unitId ?? null,
          unitSymbol: a.unitSymbol ?? null,
          isRequired: a.isRequired,
          sortOrder: a.sortOrder,
        })),
    );
  };

  const handleStartEdit = () => {
    setDraftName(viewDetails.name);
    setDraftSlug(viewDetails.slug ?? '');

    setDraftParentId(viewDetails.parentId ?? null);
    setDraftParentName(viewDetails.parent?.name ?? '');

    setDraftInherited((viewDetails.inheritedAttributes ?? []).slice());

    initOwnRowsFromDetails();
    setIsEditing(true);
    resetImageDraft();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setParentDialogOpen(false);
    setSelectAttrRowId(null);
    setSelectUnitRowId(null);
    resetImageDraft();
  };

  const handleClose = () => {
    setIsEditing(false);
    setParentDialogOpen(false);
    setSelectAttrRowId(null);
    setSelectUnitRowId(null);
    resetImageDraft();
    setImageViewerOpen(false);
    onClose();
  };

  const patchOwnRow = (rowId: string, patch: Partial<OwnRow>) => {
    setOwnRows((prev) => prev.map((x) => (x.rowId === rowId ? { ...x, ...patch } : x)));
  };

  const addOwnRow = () => {
    setOwnRows((prev) => [
      ...prev,
      {
        rowId: crypto.randomUUID(),
        attributeDefinitionId: null,
        attributeName: null,
        unitId: null,
        unitSymbol: null,
        isRequired: false,
        sortOrder: (prev.length + 1) * 10,
      },
    ]);
  };

  const removeOwnRow = (rowId: string) => {
    setOwnRows((prev) => prev.filter((x) => x.rowId !== rowId));
  };

  // ---------- IMAGE: pick / drop / remove (NO BACKEND CALLS) ----------
  const setPickedFile = (f: File) => {
    // если выбрали новый файл — это отменяет "удалить на сервере"
    setPendingRemoveImage(false);

    setPendingImageFile(f);
    clearPendingPreview();
    setPendingImagePreview(URL.createObjectURL(f));
  };

  const handlePickImage: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) setPickedFile(f);
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!isEditing || isImageBusy) return;

    const f = e.dataTransfer.files?.[0];
    if (f) setPickedFile(f);
  };

  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isEditing || isImageBusy) return;
    setIsDragOver(true);
  };

  const handleDragLeave: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  // крестик: только убрать из формы (без запроса)
  const handleRemoveFromForm = () => {
    // если у нас есть выбранный новый файл — просто убираем его
    if (pendingImageFile || pendingImagePreview) {
      resetImageDraft();
      return;
    }

    // если показывалась серверная картинка — прячем её и ставим флаг на удаление при сохранении
    if (viewDetails.imageUrl) {
      setPendingRemoveImage(true);
    }
  };

  // что показываем прямо сейчас
  const shouldHideServerImage = pendingRemoveImage;
  const imageSrc =
    pendingImagePreview || (!shouldHideServerImage ? viewDetails.imageUrl : null) || null;

  const handleSave = async () => {
    const ownReq = toRequestAttrsFromOwnRows(ownRows, inheritedIds);

    const payload: CreateCategory = {
      name: draftName,
      slug: draftSlug || null,
      parentId: draftParentId,
      attributes: ownReq,
    };

    await CategoriesApi.update(viewDetails.id, payload);

    // применяем изменения картинки только при сохранении
    if (pendingRemoveImage) {
      setIsImageBusy(true);
      try {
        await CategoriesApi.deleteImage(viewDetails.id);
      } finally {
        setIsImageBusy(false);
      }
    }

    if (pendingImageFile) {
      setIsImageBusy(true);
      try {
        await CategoriesApi.uploadImage(viewDetails.id, pendingImageFile);
      } finally {
        setIsImageBusy(false);
      }
    }

    setIsEditing(false);
    resetImageDraft();
    await refreshDetails();
    await onChanged();
  };

  const handleDeleteClick = () => setConfirmOpen(true);

  const handleConfirmDelete = async () => {
    setConfirmOpen(false);
    await CategoriesApi.delete(viewDetails.id);
    await onChanged();
    onClose();
  };

  const renderReadOnlyAttrRow = (attrName: string, unitSymbol: string) => (
    <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
      <Box flex={3} minWidth={260}>
        <TextField label="Атрибут" fullWidth value={attrName} InputProps={{ readOnly: true }} />
      </Box>
      <Box width={160} minWidth={160}>
        <TextField label="Ед. изм." fullWidth value={unitSymbol} InputProps={{ readOnly: true }} />
      </Box>
    </Box>
  );

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
        <DialogTitle sx={{ pr: 6 }}>
          Категория
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Название"
              fullWidth
              value={isEditing ? draftName : viewDetails.name}
              onChange={(e) => setDraftName(e.target.value)}
              disabled={!isEditing}
            />

            <TextField
              label="Slug"
              fullWidth
              value={isEditing ? draftSlug : (viewDetails.slug ?? '')}
              onChange={(e) => setDraftSlug(e.target.value)}
              disabled={!isEditing}
            />

            {/* --- PHOTO DROPZONE --- */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Фото
              </Typography>

              <Box
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => {
                  if (isEditing && !isImageBusy) fileInputRef.current?.click();
                }}
                sx={{
                  position: 'relative',
                  width: 320,
                  height: 140,
                  borderRadius: 2,
                  border: '2px dashed',
                  borderColor: isDragOver ? 'primary.main' : 'rgba(0,0,0,0.25)',
                  bgcolor: isDragOver ? 'rgba(25, 118, 210, 0.06)' : 'rgba(0,0,0,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  cursor: isEditing && !isImageBusy ? 'pointer' : 'default',
                  userSelect: 'none',
                }}>
                {imageSrc ? (
                  <>
                    <Box
                      component="img"
                      src={imageSrc}
                      alt="category"
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onClick={() => setImageViewerOpen(true)}
                    />

                    {/* overlay actions */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        display: 'flex',
                        gap: 1,
                      }}
                      onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Просмотр">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => setImageViewerOpen(true)}
                            sx={{
                              bgcolor: 'rgba(0,0,0,0.55)',
                              color: 'white',
                              '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
                            }}>
                            <ZoomInIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>

                      {isEditing && (
                        <Tooltip title="Убрать из формы">
                          <span>
                            <IconButton
                              size="small"
                              disabled={isImageBusy}
                              onClick={handleRemoveFromForm}
                              sx={{
                                bgcolor: 'rgba(0,0,0,0.55)',
                                color: 'white',
                                '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
                              }}>
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </Box>

                    {isImageBusy && (
                      <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.25)' }} />
                    )}
                  </>
                ) : (
                  <Stack spacing={0.5} alignItems="center">
                    <Typography variant="subtitle1" sx={{ opacity: 0.8 }}>
                      Drag & drop to upload
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.6 }}>
                      or browse
                    </Typography>

                    {isEditing && pendingRemoveImage && (
                      <Typography variant="caption" sx={{ opacity: 0.75, mt: 0.5 }}>
                        Картинка будет удалена после сохранения
                      </Typography>
                    )}
                  </Stack>
                )}

                {/* hidden input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  disabled={!isEditing || isImageBusy}
                  onChange={handlePickImage}
                />
              </Box>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.6 }}>
                PNG/JPG/WebP, до 5MB
              </Typography>
            </Box>

            {/* parent */}
            <TextField
              label="Родительская категория"
              fullWidth
              value={isEditing ? draftParentName : (viewDetails.parent?.name ?? '')}
              disabled={!isEditing}
              InputProps={{
                readOnly: true,
                endAdornment: isEditing ? (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setParentDialogOpen(true)}>
                      <MoreHorizIcon />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              }}
              onClick={() => {
                if (isEditing) setParentDialogOpen(true);
              }}
            />
          </Stack>

          {/* inherited */}
          <Typography variant="h6" mt={3} mb={1}>
            Наследуемые атрибуты (read-only)
          </Typography>

          {inheritedSorted.length === 0 ? (
            <Typography variant="body2">Нет наследуемых атрибутов</Typography>
          ) : (
            <Stack spacing={1}>
              {inheritedSorted.map((a) => (
                <Box key={`${a.attributeDefinitionId}-${a.sortOrder}`}>
                  {renderReadOnlyAttrRow(a.attributeName, a.unitSymbol ?? '')}
                </Box>
              ))}
            </Stack>
          )}

          {/* own */}
          <Typography variant="h6" mt={3} mb={1}>
            Собственные атрибуты категории
          </Typography>

          {!isEditing && (
            <>
              {(viewDetails.ownAttributes ?? []).length === 0 ? (
                <Typography variant="body2">Нет собственных атрибутов</Typography>
              ) : (
                <Stack spacing={1}>
                  {viewDetails.ownAttributes
                    .slice()
                    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                    .map((a) => (
                      <Box key={`${a.attributeDefinitionId}-${a.sortOrder}`}>
                        {renderReadOnlyAttrRow(a.attributeName, a.unitSymbol ?? '')}
                      </Box>
                    ))}
                </Stack>
              )}
            </>
          )}

          {isEditing && (
            <>
              {ownRows.length === 0 ? (
                <Typography variant="body2">Нет собственных атрибутов</Typography>
              ) : (
                <Stack spacing={1}>
                  {ownRows
                    .slice()
                    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                    .map((row) => (
                      <Box
                        key={row.rowId}
                        display="flex"
                        gap={1}
                        flexWrap="wrap"
                        alignItems="center">
                        <Box flex={3} minWidth={260}>
                          <TextField
                            label="Атрибут"
                            fullWidth
                            value={row.attributeName ?? ''}
                            InputProps={{
                              readOnly: true,
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    size="small"
                                    onClick={() => setSelectAttrRowId(row.rowId)}>
                                    <MoreHorizIcon fontSize="small" />
                                  </IconButton>
                                </InputAdornment>
                              ),
                            }}
                            onClick={() => setSelectAttrRowId(row.rowId)}
                            helperText={
                              row.attributeDefinitionId &&
                              inheritedIds.has(row.attributeDefinitionId)
                                ? 'Этот атрибут уже унаследован от родителя'
                                : undefined
                            }
                          />
                        </Box>

                        <Box width={160} minWidth={160}>
                          <TextField
                            label="Ед. изм."
                            fullWidth
                            value={row.unitSymbol ?? ''}
                            InputProps={{
                              readOnly: true,
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    size="small"
                                    onClick={() => setSelectUnitRowId(row.rowId)}>
                                    <MoreHorizIcon fontSize="small" />
                                  </IconButton>
                                </InputAdornment>
                              ),
                            }}
                            onClick={() => setSelectUnitRowId(row.rowId)}
                          />
                        </Box>

                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={row.isRequired}
                              onChange={(e) =>
                                patchOwnRow(row.rowId, { isRequired: e.target.checked })
                              }
                            />
                          }
                          label="Обязательный"
                        />

                        <Box width={110} minWidth={110}>
                          <TextField
                            label="Порядок"
                            type="number"
                            fullWidth
                            value={row.sortOrder}
                            onChange={(e) =>
                              patchOwnRow(row.rowId, { sortOrder: Number(e.target.value) })
                            }
                          />
                        </Box>

                        <IconButton onClick={() => removeOwnRow(row.rowId)} aria-label="Удалить">
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    ))}
                </Stack>
              )}

              <Button sx={{ mt: 1 }} variant="outlined" startIcon={<AddIcon />} onClick={addOwnRow}>
                Добавить атрибут
              </Button>
            </>
          )}
        </DialogContent>

        <DialogActions>
          {!isEditing && (
            <>
              <Button color="error" onClick={handleDeleteClick}>
                Удалить
              </Button>
              <Button variant="contained" onClick={handleStartEdit}>
                Изменить
              </Button>
            </>
          )}

          {isEditing && (
            <>
              <Button onClick={handleCancelEdit} disabled={isImageBusy}>
                Отмена
              </Button>
              <Button variant="contained" onClick={handleSave} disabled={isImageBusy}>
                Сохранить
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Fullscreen viewer */}
      <Dialog open={imageViewerOpen} onClose={() => setImageViewerOpen(false)} fullScreen>
        <DialogTitle sx={{ pr: 6 }}>
          Просмотр
          <IconButton
            aria-label="close"
            onClick={() => setImageViewerOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: 'black' }}>
          {imageSrc && (
            <Box
              component="img"
              src={imageSrc}
              alt="full"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Удаление категории"
        message={`Вы действительно хотите удалить категорию "${viewDetails.name}"? Это действие необратимо.`}
        confirmText="Удалить"
        cancelText="Отмена"
      />

      <CategorySelectDialog
        open={parentDialogOpen}
        onClose={() => setParentDialogOpen(false)}
        onSelect={(cat: CategoryDto) => {
          setDraftParentId(cat.id);
          setDraftParentName(cat.name);
          setParentDialogOpen(false);

          void (async () => {
            const res = await CategoriesApi.getDetails(cat.id);
            setDraftInherited(parentAttributesAsInherited(res.data));
          })();
        }}
      />

      {isEditing && selectAttrRowId && (
        <AttributeSelectDialog
          open={true}
          onClose={() => setSelectAttrRowId(null)}
          onSelect={(attr: AttributeDto) => {
            if (inheritedIds.has(attr.id)) {
              setSelectAttrRowId(null);
              return;
            }

            patchOwnRow(selectAttrRowId, {
              attributeDefinitionId: attr.id,
              attributeName: attr.name,
            });
            setSelectAttrRowId(null);
          }}
        />
      )}

      {isEditing && selectUnitRowId && (
        <UnitSelectDialog
          open={true}
          onClose={() => setSelectUnitRowId(null)}
          onSelect={(unit: MeasurementUnit) => {
            patchOwnRow(selectUnitRowId, {
              unitId: unit.id,
              unitSymbol: unit.symbol,
            });
            setSelectUnitRowId(null);
          }}
        />
      )}
    </>
  );
}
