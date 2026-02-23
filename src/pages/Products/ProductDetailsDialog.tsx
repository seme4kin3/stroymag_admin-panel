import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Dialog as MuiDialog,
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

import { useEffect, useMemo, useRef, useState } from 'react';

import ConfirmDialog from '../../components/ConfirmDialog';
import { ProductsApi } from '../../api/products.api';
import { CategoriesApi } from '../../api/categories.api';

import CategorySelectDialog from '../Categories/CategorySelectDialog';
import BrandSelectDialog from '../Brands/BrandSelectDialog';
import UnitSelectDialog from '../Attributes/UnitSelectDialog';

import type { CategoryDetailsDto, CategoryAttributeDto } from '../../models/categoryDetails';
import type { CategoryDto } from '../../models/category';
import type { Brand } from '../../models/brand';
import type { MeasurementUnit } from '../../models/unit';

import type { AttributeDataType } from '../../models/attribute';
import type { ProductAdminListItemDto, ProductAttributeValueDto } from '../../models/product';

import { buildAttributeValuesMap } from './productAttributeMapper';

interface Props {
  open: boolean;
  product: ProductAdminListItemDto | null;
  onClose: () => void;
  onChanged: () => void;
}

function mergeCategoryAttributes(details: CategoryDetailsDto): CategoryAttributeDto[] {
  const merged = [...(details.inheritedAttributes ?? []), ...(details.ownAttributes ?? [])];
  const map = new Map<string, CategoryAttributeDto>();
  for (const a of merged) map.set(a.attributeDefinitionId, a);
  return Array.from(map.values()).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

function emptyProductAttr(a: CategoryAttributeDto): ProductAttributeValueDto {
  const dt = a.dataType as AttributeDataType;
  return {
    attributeDefinitionId: a.attributeDefinitionId,
    attributeName: a.attributeName,
    attributeKey: a.attributeKey,
    dataType: dt,
    stringValue: dt === 0 ? '' : null,
    numericValue: dt === 1 || dt === 2 ? null : null,
    boolValue: dt === 3 ? false : null,
  };
}

function splitLines(text: string): string[] {
  return text
    .split('\n')
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

function parseDecimalInput(raw: string): number | null {
  const s = raw.trim().replace(',', '.');
  if (s === '') return null;
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

function generateTempId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

type NewImageDraft = {
  tempId: string;
  file: File;
  previewUrl: string; // objectURL
};

type ImageTile =
  | { kind: 'server'; key: string; url: string; isMain: boolean }
  | { kind: 'new'; key: string; url: string; isMain: boolean; tempId: string };

export default function ProductDetailsDialog({ open, product, onClose, onChanged }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // как в категории: локальная модель просмотра
  const [viewProduct, setViewProduct] = useState<ProductAdminListItemDto | null>(null);

  // draft поля
  const [draftSku, setDraftSku] = useState('');
  const [draftArticle, setDraftArticle] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');

  const [draftBrandId, setDraftBrandId] = useState<string | null>(null);
  const [draftBrandName, setDraftBrandName] = useState('');
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);

  const [draftCategoryId, setDraftCategoryId] = useState<string | null>(null);
  const [draftCategoryName, setDraftCategoryName] = useState('');
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  const [draftUnitId, setDraftUnitId] = useState<string | null>(null);
  const [draftUnitName, setDraftUnitName] = useState('');
  const [draftUnitSymbol, setDraftUnitSymbol] = useState('');
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);

  const [draftPrice, setDraftPrice] = useState('');
  const [draftRrp, setDraftRrp] = useState('');
  const [draftHasStock, setDraftHasStock] = useState(false);

  const [advantagesText, setAdvantagesText] = useState('');
  const [complectationText, setComplectationText] = useState('');

  const [attributes, setAttributes] = useState<ProductAttributeValueDto[]>([]);

  // ---------- IMAGE DRAFT (как у категории, но множественные) ----------
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [pendingNewImages, setPendingNewImages] = useState<NewImageDraft[]>([]);
  const [pendingRemoveServerIds, setPendingRemoveServerIds] = useState<Set<string>>(new Set());
  const [pendingMainKey, setPendingMainKey] = useState<string | null>(null); // server:<id> | new:<tempId>
  const [isImageBusy, setIsImageBusy] = useState(false);

  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  const clearPendingPreviews = () => {
    for (const x of pendingNewImages) URL.revokeObjectURL(x.previewUrl);
    setPendingNewImages([]);
  };

  const resetImageDraft = () => {
    clearPendingPreviews();
    setPendingRemoveServerIds(new Set());
    setPendingMainKey(null);
  };

  // sync props -> view state (как в категории)
  useEffect(() => {
    setViewProduct(product);
    setIsEditing(false);
    setBrandDialogOpen(false);
    setCategoryDialogOpen(false);
    setUnitDialogOpen(false);

    setImageViewerOpen(false);
    setViewerUrl(null);

    resetImageDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, open]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      for (const x of pendingNewImages) URL.revokeObjectURL(x.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSave = useMemo(() => {
    return (
      isEditing &&
      draftSku.trim().length > 0 &&
      draftName.trim().length > 0 &&
      draftBrandId !== null &&
      draftCategoryId !== null &&
      draftUnitId !== null &&
      parseDecimalInput(draftPrice) !== null
    );
  }, [isEditing, draftSku, draftName, draftBrandId, draftCategoryId, draftUnitId, draftPrice]);

  const displayedAttributes = useMemo<ProductAttributeValueDto[]>(() => {
    const p = viewProduct;
    if (!p) return [];
    return isEditing ? attributes : (p.attributes ?? []);
  }, [viewProduct, isEditing, attributes]);

  const openViewer = (url: string) => {
    setViewerUrl(url);
    setImageViewerOpen(true);
  };

  // что сейчас считаем "main" в VIEW
  const viewMainKey = useMemo(() => {
    const p = viewProduct;
    if (!p) return null;
    const primary = (p.images ?? []).find((x) => x.isPrimary);
    return primary ? `server:${primary.id}` : null;
  }, [viewProduct]);

  // в режиме редактирования main берём из pendingMainKey, иначе из viewMainKey
  const effectiveMainKey = isEditing ? pendingMainKey : viewMainKey;

  // tiles (preview state), чтобы рендер был одинаковый в view/edit
  const imageTiles = useMemo<ImageTile[]>(() => {
    const p = viewProduct;
    if (!p) return [];

    const tiles: ImageTile[] = [];

    // server images (minus removed)
    for (const img of p.images ?? []) {
      if (pendingRemoveServerIds.has(img.id)) continue;

      const key = `server:${img.id}`;
      tiles.push({
        kind: 'server',
        key,
        url: img.url,
        isMain: effectiveMainKey === key,
      });
    }

    // new previews
    for (const n of pendingNewImages) {
      const key = `new:${n.tempId}`;
      tiles.push({
        kind: 'new',
        key,
        tempId: n.tempId,
        url: n.previewUrl,
        isMain: effectiveMainKey === key,
      });
    }

    return tiles;
  }, [viewProduct, pendingRemoveServerIds, pendingNewImages, effectiveMainKey]);

  const hasImageDraftChanges = useMemo(() => {
    return (
      pendingNewImages.length > 0 || pendingRemoveServerIds.size > 0 || pendingMainKey !== null
    );
  }, [pendingNewImages.length, pendingRemoveServerIds, pendingMainKey]);

  const hasNewFilesToReplace = pendingNewImages.length > 0;

  const handleClose = () => {
    setIsEditing(false);
    setImageViewerOpen(false);
    setViewerUrl(null);
    resetImageDraft();
    onClose();
  };

  const setAttrValue = (attrId: string, patch: Partial<ProductAttributeValueDto>) => {
    setAttributes((prev) =>
      prev.map((x) => (x.attributeDefinitionId === attrId ? { ...x, ...patch } : x)),
    );
  };

  const loadCategoryAttributes = async (categoryId: string, keepExistingValues: boolean) => {
    const res = await CategoriesApi.getDetails(categoryId);
    const all = mergeCategoryAttributes(res.data);

    if (!keepExistingValues) {
      setAttributes(all.map((a) => emptyProductAttr(a)));
      return;
    }

    const prevByKey = new Map<string, ProductAttributeValueDto>();
    for (const p of attributes) if (p.attributeKey) prevByKey.set(p.attributeKey, p);

    setAttributes(
      all.map((a) => {
        const base = emptyProductAttr(a);
        const prev = prevByKey.get(base.attributeKey);
        if (!prev) return base;
        return {
          ...base,
          stringValue: prev.stringValue,
          numericValue: prev.numericValue,
          boolValue: prev.boolValue,
        };
      }),
    );
  };

  const handleStartEdit = () => {
    if (!viewProduct) return;

    setDraftSku(viewProduct.sku ?? '');
    setDraftArticle(viewProduct.article ?? '');
    setDraftName(viewProduct.name ?? '');
    setDraftDescription(viewProduct.description ?? '');

    setDraftBrandId(viewProduct.brandId);
    setDraftBrandName(viewProduct.brandName ?? '');

    setDraftCategoryId(viewProduct.categoryId);
    setDraftCategoryName(viewProduct.categoryName ?? '');

    setDraftUnitId(viewProduct.unitId);
    setDraftUnitName(viewProduct.unitName ?? '');
    setDraftUnitSymbol(viewProduct.unitSymbol ?? '');

    setDraftPrice(String(viewProduct.price ?? ''));
    setDraftRrp(
      viewProduct.recommendedRetailPrice === null ? '' : String(viewProduct.recommendedRetailPrice),
    );
    setDraftHasStock(Boolean(viewProduct.hasStock));

    setAdvantagesText((viewProduct.advantages ?? []).join('\n'));
    setComplectationText((viewProduct.complectation ?? []).join('\n'));

    setAttributes((viewProduct.attributes ?? []).map((x) => ({ ...x })));

    // image draft reset + main = текущий серверный isPrimary
    resetImageDraft();
    setPendingMainKey(viewMainKey);

    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setBrandDialogOpen(false);
    setCategoryDialogOpen(false);
    setUnitDialogOpen(false);
    resetImageDraft();
  };

  // -------- IMAGE actions (no backend calls) --------
  const addFiles = (files: File[]) => {
    if (!files.length) return;

    const list: NewImageDraft[] = files.map((f) => ({
      tempId: generateTempId(),
      file: f,
      previewUrl: URL.createObjectURL(f),
    }));

    setPendingNewImages((prev) => {
      const next = [...prev, ...list];
      // если main ещё не установлен — ставим первую новую
      if (!pendingMainKey && list.length > 0) setPendingMainKey(`new:${list[0].tempId}`);
      return next;
    });
  };

  const handlePickImages: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (!isEditing || isImageBusy) return;
    addFiles(list);
  };

  const handleRemoveTileFromForm = (tile: ImageTile) => {
    if (!isEditing) return;

    // remove new image draft
    if (tile.kind === 'new') {
      setPendingNewImages((prev) => {
        const found = prev.find((x) => x.tempId === tile.tempId);
        if (found) URL.revokeObjectURL(found.previewUrl);

        const next = prev.filter((x) => x.tempId !== tile.tempId);

        // если удалили main — сбросим
        if (pendingMainKey === tile.key) setPendingMainKey(null);
        return next;
      });
      return;
    }

    // mark server image to be removed on save
    const id = tile.key.replace('server:', '');
    setPendingRemoveServerIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    if (pendingMainKey === tile.key) setPendingMainKey(null);
  };

  const handleSetMain = (tileKey: string) => {
    if (!isEditing || isImageBusy) return;
    setPendingMainKey(tileKey);
  };

  // -------- SAVE / DELETE --------
  const handleSave = async () => {
    if (!viewProduct) return;

    const priceValue = parseDecimalInput(draftPrice);
    if (priceValue === null) return;

    const rrpValue = draftRrp.trim() ? parseDecimalInput(draftRrp) : null;

    const payload = {
      sku: draftSku.trim(),
      name: draftName.trim(),
      brandId: draftBrandId as string,
      categoryId: draftCategoryId as string,
      unitId: draftUnitId as string,
      price: priceValue,
      description: draftDescription.trim() ? draftDescription.trim() : null,
      article: draftArticle.trim(),
      recommendedRetailPrice: rrpValue,
      hasStock: draftHasStock,
      attributeValues: buildAttributeValuesMap(attributes),
      advantages: splitLines(advantagesText),
      complectation: splitLines(complectationText),
    };

    await ProductsApi.update(viewProduct.id, payload);

    // картинки применяем только при наличии новых файлов (ограничение replaceImages)
    if (hasImageDraftChanges) {
      if (!hasNewFilesToReplace) {
        // ничего не делаем — покажем предупреждение выше в UI
      } else {
        setIsImageBusy(true);
        try {
          const files = pendingNewImages.map((x) => x.file);
          const mainFlags = pendingNewImages.map((x) => pendingMainKey === `new:${x.tempId}`);
          await ProductsApi.replaceImages(viewProduct.id, files, mainFlags);
        } finally {
          setIsImageBusy(false);
        }
      }
    }

    setIsEditing(false);
    resetImageDraft();
    await onChanged();
  };

  const handleDeleteClick = () => setConfirmOpen(true);

  const handleConfirmDelete = async () => {
    if (!viewProduct) return;
    setConfirmOpen(false);
    await ProductsApi.delete(viewProduct.id);
    await onChanged();
    onClose();
  };

  if (!viewProduct) return null;

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
        <DialogTitle sx={{ pr: 6 }}>
          Товар
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="SKU"
                fullWidth
                value={isEditing ? draftSku : viewProduct.sku}
                disabled={!isEditing}
                onChange={(e) => setDraftSku(e.target.value)}
              />
              <TextField
                label="Артикул"
                fullWidth
                value={isEditing ? draftArticle : viewProduct.article}
                disabled={!isEditing}
                onChange={(e) => setDraftArticle(e.target.value)}
              />
            </Stack>

            <TextField
              label="Название"
              fullWidth
              value={isEditing ? draftName : viewProduct.name}
              disabled={!isEditing}
              onChange={(e) => setDraftName(e.target.value)}
            />

            <TextField
              label="Описание"
              fullWidth
              multiline
              minRows={3}
              value={isEditing ? draftDescription : (viewProduct.description ?? '')}
              disabled={!isEditing}
              onChange={(e) => setDraftDescription(e.target.value)}
            />

            {/* ---------- IMAGES (как в категории, только список) ---------- */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Фото товара
              </Typography>

              {isEditing && hasImageDraftChanges && !hasNewFilesToReplace && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  Для применения удаления/главной картинки нужен хотя бы один добавленный файл
                  (ограничение replaceImages). Сейчас новые файлы не выбраны — изменения картинок не
                  сохранятся.
                </Alert>
              )}

              <Stack
                direction="row"
                spacing={1}
                sx={{ overflowX: 'auto', pb: 1, alignItems: 'center' }}>
                {imageTiles.map((t) => (
                  <Box
                    key={t.key}
                    sx={{
                      position: 'relative',
                      width: 120,
                      height: 120,
                      borderRadius: 2,
                      overflow: 'hidden',
                      flex: '0 0 auto',
                      border: t.isMain ? '2px solid' : '1px solid',
                      borderColor: t.isMain ? 'primary.main' : 'rgba(0,0,0,0.15)',
                    }}>
                    <Box
                      component="img"
                      src={t.url}
                      alt="img"
                      sx={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                      onClick={() => openViewer(t.url)}
                    />

                    {/* main flag */}
                    {isEditing && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 6,
                          left: 6,
                          display: 'flex',
                          gap: 0.5,
                          alignItems: 'center',
                          bgcolor: 'rgba(0,0,0,0.55)',
                          borderRadius: 999,
                          px: 0.75,
                          py: 0.25,
                          color: 'white',
                          cursor: isImageBusy ? 'default' : 'pointer',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isImageBusy) handleSetMain(t.key);
                        }}>
                        {t.isMain ? (
                          <RadioButtonCheckedIcon fontSize="small" />
                        ) : (
                          <RadioButtonUncheckedIcon fontSize="small" />
                        )}
                        <Typography variant="caption" sx={{ lineHeight: 1 }}>
                          main
                        </Typography>
                      </Box>
                    )}

                    {/* actions */}
                    <Box
                      sx={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 0.5 }}
                      onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Просмотр">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => openViewer(t.url)}
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
                              onClick={() => handleRemoveTileFromForm(t)}
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
                  </Box>
                ))}

                {/* + tile */}
                {isEditing && (
                  <Box
                    onClick={() => {
                      if (!isImageBusy) fileInputRef.current?.click();
                    }}
                    sx={{
                      width: 120,
                      height: 120,
                      borderRadius: 2,
                      flex: '0 0 auto',
                      border: '1px dashed rgba(0,0,0,0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isImageBusy ? 'default' : 'pointer',
                      bgcolor: 'rgba(0,0,0,0.02)',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' },
                    }}>
                    <AddIcon sx={{ fontSize: 36, opacity: 0.7 }} />
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp"
                      hidden
                      disabled={!isEditing || isImageBusy}
                      onChange={handlePickImages}
                    />
                  </Box>
                )}
              </Stack>

              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.6 }}>
                PNG/JPG/WebP, до 5MB
              </Typography>
            </Box>

            {/* --- Brand / Category / Unit --- */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Бренд"
                fullWidth
                value={isEditing ? draftBrandName : viewProduct.brandName}
                disabled={!isEditing}
                InputProps={{
                  readOnly: true,
                  endAdornment: isEditing ? (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setBrandDialogOpen(true)}>
                        <MoreHorizIcon />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
                }}
                onClick={() => {
                  if (isEditing) setBrandDialogOpen(true);
                }}
              />

              <TextField
                label="Категория"
                fullWidth
                value={isEditing ? draftCategoryName : viewProduct.categoryName}
                disabled={!isEditing}
                InputProps={{
                  readOnly: true,
                  endAdornment: isEditing ? (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setCategoryDialogOpen(true)}>
                        <MoreHorizIcon />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
                }}
                onClick={() => {
                  if (isEditing) setCategoryDialogOpen(true);
                }}
                helperText={
                  isEditing ? 'При смене категории атрибуты подтянутся автоматически' : undefined
                }
              />

              <TextField
                label="Единица измерения"
                fullWidth
                value={
                  isEditing
                    ? draftUnitName
                      ? `${draftUnitName} (${draftUnitSymbol})`
                      : ''
                    : `${viewProduct.unitName} (${viewProduct.unitSymbol})`
                }
                disabled={!isEditing}
                InputProps={{
                  readOnly: true,
                  endAdornment: isEditing ? (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setUnitDialogOpen(true)}>
                        <MoreHorizIcon />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
                }}
                onClick={() => {
                  if (isEditing) setUnitDialogOpen(true);
                }}
              />
            </Stack>

            {/* --- price/rrp/stock --- */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Цена"
                fullWidth
                value={isEditing ? draftPrice : String(viewProduct.price)}
                disabled={!isEditing}
                onChange={(e) => setDraftPrice(e.target.value)}
                inputMode="decimal"
                helperText={isEditing ? 'Decimal: например 0.9' : undefined}
              />
              <TextField
                label="РРЦ"
                fullWidth
                value={
                  isEditing
                    ? draftRrp
                    : viewProduct.recommendedRetailPrice === null
                      ? ''
                      : String(viewProduct.recommendedRetailPrice)
                }
                disabled={!isEditing}
                onChange={(e) => setDraftRrp(e.target.value)}
                inputMode="decimal"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isEditing ? draftHasStock : viewProduct.hasStock}
                    disabled={!isEditing}
                    onChange={(e) => setDraftHasStock(e.target.checked)}
                  />
                }
                label="Есть остаток"
              />
            </Stack>

            {/* --- Attributes --- */}
            <Typography variant="h6" mt={2}>
              Атрибуты
            </Typography>

            {displayedAttributes.length === 0 ? (
              <Typography variant="body2">Нет атрибутов</Typography>
            ) : (
              <Stack spacing={1}>
                {displayedAttributes.map((a) => {
                  if (a.dataType === 3) {
                    return (
                      <FormControlLabel
                        key={a.attributeDefinitionId}
                        control={
                          <Checkbox
                            checked={Boolean(a.boolValue)}
                            disabled={!isEditing}
                            onChange={(e) =>
                              setAttrValue(a.attributeDefinitionId, {
                                boolValue: e.target.checked,
                                stringValue: null,
                                numericValue: null,
                              })
                            }
                          />
                        }
                        label={a.attributeName}
                      />
                    );
                  }

                  if (a.dataType === 0) {
                    return (
                      <TextField
                        key={a.attributeDefinitionId}
                        label={a.attributeName}
                        fullWidth
                        disabled={!isEditing}
                        value={a.stringValue ?? ''}
                        onChange={(e) =>
                          setAttrValue(a.attributeDefinitionId, {
                            stringValue: e.target.value,
                            numericValue: null,
                            boolValue: null,
                          })
                        }
                      />
                    );
                  }

                  return (
                    <TextField
                      key={a.attributeDefinitionId}
                      label={a.attributeName}
                      fullWidth
                      disabled={!isEditing}
                      value={a.numericValue === null ? '' : String(a.numericValue)}
                      inputMode="decimal"
                      onChange={(e) =>
                        setAttrValue(a.attributeDefinitionId, {
                          numericValue: parseDecimalInput(e.target.value),
                          stringValue: null,
                          boolValue: null,
                        })
                      }
                      helperText={a.dataType === 2 ? 'Decimal: например 0.9' : undefined}
                    />
                  );
                })}
              </Stack>
            )}

            <Typography variant="h6" mt={2}>
              Преимущества
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={3}
              value={isEditing ? advantagesText : (viewProduct.advantages ?? []).join('\n')}
              disabled={!isEditing}
              onChange={(e) => setAdvantagesText(e.target.value)}
              helperText="Каждое преимущество с новой строки"
            />

            <Typography variant="h6" mt={2}>
              Комплектация
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={3}
              value={isEditing ? complectationText : (viewProduct.complectation ?? []).join('\n')}
              disabled={!isEditing}
              onChange={(e) => setComplectationText(e.target.value)}
              helperText="Каждый пункт комплектации с новой строки"
            />
          </Stack>
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
              <Button variant="contained" onClick={handleSave} disabled={!canSave || isImageBusy}>
                Сохранить
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Fullscreen viewer */}
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
          {viewerUrl && (
            <Box
              component="img"
              src={viewerUrl}
              alt="full"
              sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          )}
        </DialogContent>
      </MuiDialog>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Удаление товара"
        message={`Вы действительно хотите удалить товар "${viewProduct.name}"? Это действие необратимо.`}
        confirmText="Удалить"
        cancelText="Отмена"
      />

      <BrandSelectDialog
        open={brandDialogOpen}
        onClose={() => setBrandDialogOpen(false)}
        onSelect={(b: Brand) => {
          setDraftBrandId(b.id);
          setDraftBrandName(b.name);
          setBrandDialogOpen(false);
        }}
      />

      <CategorySelectDialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        onSelect={(c: CategoryDto) => {
          setDraftCategoryId(c.id);
          setDraftCategoryName(c.name);
          setCategoryDialogOpen(false);
          void loadCategoryAttributes(c.id, true);
        }}
      />

      <UnitSelectDialog
        open={unitDialogOpen}
        onClose={() => setUnitDialogOpen(false)}
        onSelect={(u: MeasurementUnit) => {
          setDraftUnitId(u.id);
          setDraftUnitName(u.name);
          setDraftUnitSymbol(u.symbol);
          setUnitDialogOpen(false);
        }}
      />
    </>
  );
}
