import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Typography,
  Box,
  Stack,
  Tooltip,
  Dialog as MuiDialog,
  Alert,
} from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ZoomInIcon from '@mui/icons-material/ZoomIn';

import { useMemo, useRef, useState } from 'react';

import { CategoriesApi } from '../../api/categories.api';
import { parseApiError } from '../../utils/apiError';
import CategorySelectDialog from './CategorySelectDialog';
import AttributeSelectDialog from './AttributeSelectDialog';
import UnitSelectDialog from '../Attributes/UnitSelectDialog';

import type {
  CreateCategory,
  CategoryAttributeRequest,
  CategoryDto,
  CategoryAttributeViewDto,
} from '../../models/category';
import type { AttributeDto } from '../../models/attribute';
import type { MeasurementUnit } from '../../models/unit';

interface CategoryFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface OwnAttributeRow {
  id: string;
  attribute: AttributeDto | null;
  unit: MeasurementUnit | null;
  isRequired: boolean;
  sortOrder: number;
}

function uniqByAttributeDefinitionId(
  items: CategoryAttributeRequest[],
): CategoryAttributeRequest[] {
  const map = new Map<string, CategoryAttributeRequest>();
  for (const x of items) map.set(x.attributeDefinitionId, x);
  return Array.from(map.values());
}

export default function CategoryForm({ open, onClose, onSaved }: CategoryFormProps) {
  const [name, setName] = useState('');
  const [parent, setParent] = useState<CategoryDto | null>(null);

  // inherited (read-only)
  const [inheritedAttributes, setInheritedAttributes] = useState<CategoryAttributeViewDto[]>([]);

  // own (editable)
  const [ownAttributes, setOwnAttributes] = useState<OwnAttributeRow[]>([]);

  const [parentDialogOpen, setParentDialogOpen] = useState(false);
  const [attrSelectForId, setAttrSelectForId] = useState<string | null>(null);
  const [unitSelectForId, setUnitSelectForId] = useState<string | null>(null);

  // ---- image draft (create) ----
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const clearImagePreview = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
  };

  const reset = () => {
    setName('');
    setParent(null);
    setInheritedAttributes([]);
    setOwnAttributes([]);
    setParentDialogOpen(false);
    setAttrSelectForId(null);
    setUnitSelectForId(null);

    setSelectedImage(null);
    clearImagePreview();
    setIsDragOver(false);
    setImageViewerOpen(false);
    setErrorMsg(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const inheritedIds = useMemo(() => {
    return new Set(inheritedAttributes.map((x) => x.attributeDefinitionId));
  }, [inheritedAttributes]);

  const addOwnRow = () => {
    setOwnAttributes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        attribute: null,
        unit: null,
        isRequired: false,
        sortOrder: (prev.length + 1) * 10,
      },
    ]);
  };

  const removeOwnRow = (id: string) => {
    setOwnAttributes((prev) => prev.filter((x) => x.id !== id));
  };

  const updateOwnRow = (id: string, patch: Partial<OwnAttributeRow>) => {
    setOwnAttributes((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const setPickedFile = (f: File) => {
    setSelectedImage(f);
    clearImagePreview();
    setImagePreviewUrl(URL.createObjectURL(f));
  };

  const handlePickImage: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!f) return;
    setPickedFile(f);
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const f = e.dataTransfer.files?.[0];
    if (f) setPickedFile(f);
  };

  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  // крестик: только убрать из формы (в create — без бэка всегда)
  const handleRemoveFromForm = () => {
    setSelectedImage(null);
    clearImagePreview();
  };

  const handleSave = async () => {
    // inherited -> request
    const inheritedReq: CategoryAttributeRequest[] = inheritedAttributes.map((a) => ({
      attributeDefinitionId: a.attributeDefinitionId,
      unitId: a.unitId ?? null,
      isRequired: a.isRequired,
      sortOrder: a.sortOrder,
    }));

    // own -> request
    const ownReq: CategoryAttributeRequest[] = ownAttributes
      .filter((r) => r.attribute !== null)
      .map((r, idx) => ({
        attributeDefinitionId: r.attribute!.id,
        unitId: r.unit ? r.unit.id : null,
        isRequired: r.isRequired,
        sortOrder: r.sortOrder || (idx + 1) * 10,
      }))
      .filter((x) => !inheritedIds.has(x.attributeDefinitionId));

    const allAttributes = uniqByAttributeDefinitionId([...inheritedReq, ...ownReq]);

    const payload: CreateCategory = {
      name,
      slug: null,
      parentId: parent ? parent.id : null,
      attributes: allAttributes,
    };

    try {
      await CategoriesApi.createMultipart(payload, selectedImage);
      reset();
      await onSaved();
      onClose();
    } catch (err) {
      setErrorMsg(parseApiError(err));
    }
  };

  const imageSrc = imagePreviewUrl || null;

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
        <DialogTitle>Создание категории</DialogTitle>

        <DialogContent>
          {/* Основные поля */}
          <Stack spacing={2} mt={1}>
            <TextField
              label="Название"
              fullWidth
              margin="normal"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

          </Stack>
          {/* ✅ compact drag&drop */}
          <Box mt={1}>
            <Typography variant="subtitle2" gutterBottom>
              Фото
            </Typography>

            <Box
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
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
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'background-color .15s ease, border-color .15s ease',
              }}>
              {imageSrc ? (
                <>
                  <Box
                    component="img"
                    src={imageSrc}
                    alt="preview"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onClick={() => setImageViewerOpen(true)}
                  />

                  <Box
                    sx={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      display: 'flex',
                      gap: 0.75,
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

                    <Tooltip title="Убрать из формы">
                      <span>
                        <IconButton
                          size="small"
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
                  </Box>
                </>
              ) : (
                <Stack spacing={0.25} alignItems="center" sx={{ px: 2, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ opacity: 0.85, fontWeight: 500 }}>
                    Drag & drop
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.65 }}>
                    or click to browse
                  </Typography>
                </Stack>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={handlePickImage}
              />
            </Box>

            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.6 }}>
              PNG/JPG/WebP, до 5MB
            </Typography>
          </Box>
          {/* Родитель */}
          <TextField
            label="Родительская категория"
            fullWidth
            margin="normal"
            value={parent?.name ?? ''}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setParentDialogOpen(true)}>
                    <MoreHorizIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            onClick={() => setParentDialogOpen(true)}
            helperText="Нажмите, чтобы выбрать из справочника"
          />

          {/* inherited */}
          {inheritedAttributes.length > 0 && (
            <>
              <Typography variant="h6" mt={2} mb={1}>
                Атрибуты родительской категории (будут добавлены автоматически)
              </Typography>

              <Stack spacing={1}>
                {inheritedAttributes
                  .slice()
                  .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                  .map((a) => (
                    <Box
                      key={`${a.attributeDefinitionId}-${a.sortOrder}`}
                      display="flex"
                      flexWrap="wrap"
                      alignItems="center"
                      gap={1}>
                      <Box flex={3} minWidth={260}>
                        <TextField
                          label="Атрибут"
                          fullWidth
                          value={a.attributeName}
                          InputProps={{ readOnly: true }}
                        />
                      </Box>

                      <Box width={160} minWidth={160}>
                        <TextField
                          label="Ед. изм."
                          fullWidth
                          value={a.unitSymbol ?? ''}
                          InputProps={{ readOnly: true }}
                        />
                      </Box>
                    </Box>
                  ))}
              </Stack>
            </>
          )}

          {/* own attributes */}
          <Typography variant="h6" mt={3} mb={1}>
            Собственные атрибуты категории
          </Typography>

          <Stack spacing={1}>
            {ownAttributes.map((row) => {
              const attrDisplay = row.attribute
                ? `${row.attribute.name} (${row.attribute.key})`
                : '';
              const unitDisplay = row.unit ? `${row.unit.name} (${row.unit.symbol})` : '';

              return (
                <Box key={row.id} display="flex" flexWrap="wrap" alignItems="center" gap={1}>
                  <Box flex={3} minWidth={260}>
                    <TextField
                      label="Атрибут"
                      fullWidth
                      value={attrDisplay}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setAttrSelectForId(row.id)}>
                              <MoreHorizIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      onClick={() => setAttrSelectForId(row.id)}
                      helperText={
                        row.attribute && inheritedIds.has(row.attribute.id)
                          ? 'Этот атрибут уже есть в наследуемых'
                          : undefined
                      }
                    />
                  </Box>

                  <Box flex={2} minWidth={220}>
                    <TextField
                      label="Единица измерения"
                      fullWidth
                      value={unitDisplay}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setUnitSelectForId(row.id)}>
                              <MoreHorizIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      onClick={() => setUnitSelectForId(row.id)}
                    />
                  </Box>

                  <Box>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={row.isRequired}
                          onChange={(e) => updateOwnRow(row.id, { isRequired: e.target.checked })}
                        />
                      }
                      label="Обязательный"
                    />
                  </Box>

                  <Box width={110} minWidth={110}>
                    <TextField
                      label="Порядок"
                      type="number"
                      fullWidth
                      value={row.sortOrder}
                      onChange={(e) => updateOwnRow(row.id, { sortOrder: Number(e.target.value) })}
                    />
                  </Box>

                  <IconButton onClick={() => removeOwnRow(row.id)} aria-label="Удалить">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              );
            })}
          </Stack>

          <Button variant="outlined" startIcon={<AddIcon />} sx={{ mt: 1 }} onClick={addOwnRow}>
            Добавить атрибут
          </Button>
          {errorMsg && <Alert severity="error" sx={{ mt: 2 }}>{errorMsg}</Alert>}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Отмена</Button>
          <Button variant="contained" onClick={handleSave}>
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      {/* fullscreen viewer */}
      <MuiDialog open={imageViewerOpen} onClose={() => setImageViewerOpen(false)} fullScreen>
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
      </MuiDialog>

      {/* выбор родителя */}
      <CategorySelectDialog
        open={parentDialogOpen}
        onClose={() => setParentDialogOpen(false)}
        onSelect={(cat) => {
          setParent(cat);
          setInheritedAttributes(cat.attributes ?? []);
          setParentDialogOpen(false);
        }}
      />

      {attrSelectForId && (
        <AttributeSelectDialog
          open={!!attrSelectForId}
          onClose={() => setAttrSelectForId(null)}
          onSelect={(attr) => {
            if (inheritedIds.has(attr.id)) {
              setAttrSelectForId(null);
              return;
            }

            updateOwnRow(attrSelectForId, { attribute: attr });
            setAttrSelectForId(null);
          }}
        />
      )}

      {unitSelectForId && (
        <UnitSelectDialog
          open={!!unitSelectForId}
          onClose={() => setUnitSelectForId(null)}
          onSelect={(unit) => {
            updateOwnRow(unitSelectForId, { unit });
            setUnitSelectForId(null);
          }}
        />
      )}
    </>
  );
}
