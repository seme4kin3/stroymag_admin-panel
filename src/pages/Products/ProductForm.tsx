import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  IconButton,
  InputAdornment,
  Typography,
  Checkbox,
  FormControlLabel,
  Box,
  Tooltip,
  Dialog as MuiDialog,
} from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import CloseIcon from '@mui/icons-material/Close';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import DeleteIcon from '@mui/icons-material/Delete';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

import { useMemo, useRef, useState } from 'react';

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
import type { ProductAdminUpsertCommand, ProductAttributeValueDto } from '../../models/product';

import { buildAttributeValuesMap } from './productAttributeMapper';

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
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

type ImageDraft = {
  id: string;
  file: File;
  url: string; // objectURL
};

export default function ProductForm({ open, onClose, onSaved }: ProductFormProps) {
  const [sku, setSku] = useState('');
  const [article, setArticle] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState('');
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  const [unitId, setUnitId] = useState<string | null>(null);
  const [unitName, setUnitName] = useState('');
  const [unitSymbol, setUnitSymbol] = useState('');
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);

  const [price, setPrice] = useState('');
  const [rrp, setRrp] = useState('');
  const [hasStock, setHasStock] = useState(false);

  const [advantagesText, setAdvantagesText] = useState('');
  const [complectationText, setComplectationText] = useState('');

  const [attributes, setAttributes] = useState<ProductAttributeValueDto[]>([]);

  // ---- images (create) ----
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [images, setImages] = useState<ImageDraft[]>([]);
  const [mainImageId, setMainImageId] = useState<string | null>(null);

  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  const canSave = useMemo(() => {
    return (
      sku.trim().length > 0 &&
      article.trim().length > 0 &&
      name.trim().length > 0 &&
      brandId !== null &&
      categoryId !== null &&
      unitId !== null &&
      parseDecimalInput(price) !== null
    );
  }, [sku, article, name, brandId, categoryId, unitId, price]);

  const revokeAll = () => {
    for (const img of images) URL.revokeObjectURL(img.url);
  };

  const reset = () => {
    setSku('');
    setArticle('');
    setName('');
    setDescription('');

    setBrandId(null);
    setBrandName('');
    setBrandDialogOpen(false);

    setCategoryId(null);
    setCategoryName('');
    setCategoryDialogOpen(false);

    setUnitId(null);
    setUnitName('');
    setUnitSymbol('');
    setUnitDialogOpen(false);

    setPrice('');
    setRrp('');
    setHasStock(false);

    setAdvantagesText('');
    setComplectationText('');

    setAttributes([]);

    setIsDragOver(false);
    setMainImageId(null);
    setViewerUrl(null);
    setImageViewerOpen(false);

    revokeAll();
    setImages([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const loadCategoryAttributes = async (id: string) => {
    const res = await CategoriesApi.getDetails(id);
    const all = mergeCategoryAttributes(res.data);
    setAttributes(all.map((a) => emptyProductAttr(a)));
  };

  const setAttrValue = (attrId: string, patch: Partial<ProductAttributeValueDto>) => {
    setAttributes((prev) =>
      prev.map((x) => (x.attributeDefinitionId === attrId ? { ...x, ...patch } : x)),
    );
  };

  const addFiles = (files: File[]) => {
    if (files.length === 0) return;

    const drafts: ImageDraft[] = files.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      url: URL.createObjectURL(f),
    }));

    setImages((prev) => {
      const next = [...prev, ...drafts];
      // если главная ещё не выбрана — ставим первую
      if (!mainImageId && next.length > 0) setMainImageId(next[0].id);
      return next;
    });
  };

  const handlePickImages: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    addFiles(list);
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const list = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    addFiles(list);
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

  const removeImage = (id: string) => {
    setImages((prev) => {
      const img = prev.find((x) => x.id === id);
      if (img) URL.revokeObjectURL(img.url);

      const next = prev.filter((x) => x.id !== id);
      if (mainImageId === id) setMainImageId(next.length ? next[0].id : null);
      return next;
    });
  };

  const openViewer = (url: string) => {
    setViewerUrl(url);
    setImageViewerOpen(true);
  };

  const save = async () => {
    const priceValue = parseDecimalInput(price);
    if (priceValue === null) return;

    const rrpValue = rrp.trim() ? parseDecimalInput(rrp) : null;

    const payload: ProductAdminUpsertCommand = {
      sku: sku.trim(),
      name: name.trim(),
      brandId: brandId as string,
      categoryId: categoryId as string,
      unitId: unitId as string,
      price: priceValue,

      description: description.trim(),
      article: article.trim(),
      recommendedRetailPrice: rrpValue,
      hasStock,

      // ✅ ВАЖНО: на бэке Dictionary<Guid, string?> -> ключ = attributeDefinitionId
      attributeValues: buildAttributeValuesMap(attributes),

      advantages: splitLines(advantagesText),
      complectation: splitLines(complectationText),
    };

    // 1) create
    const created = await ProductsApi.create(payload);
    const productId = created.data.id;

    // 2) upload images (если есть)
    if (images.length > 0) {
      const files = images.map((x) => x.file);
      const mainFlags = images.map((x) => x.id === mainImageId);
      await ProductsApi.uploadImages(productId, files, mainFlags);
    }

    reset();
    await onSaved();
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
        <DialogTitle>Создание товара</DialogTitle>

        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="SKU"
                fullWidth
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
              <TextField
                label="Артикул"
                fullWidth
                value={article}
                onChange={(e) => setArticle(e.target.value)}
              />
            </Stack>

            <TextField
              label="Название"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <TextField
              label="Описание"
              fullWidth
              multiline
              minRows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {/* ✅ Images (drag&drop) */}
            <Box mt={1}>
              <Typography variant="subtitle2" gutterBottom>
                Фото товара
              </Typography>

              <Box
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  position: 'relative',
                  width: 520,
                  maxWidth: '100%',
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
                {images.length === 0 ? (
                  <Stack spacing={0.25} alignItems="center" sx={{ px: 2, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ opacity: 0.85, fontWeight: 500 }}>
                      Drag & drop
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.65 }}>
                      or click to browse (можно несколько)
                    </Typography>
                  </Stack>
                ) : (
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ px: 1, overflowX: 'auto', width: '100%' }}>
                    {images.map((img) => {
                      const isMain = img.id === mainImageId;

                      return (
                        <Box
                          key={img.id}
                          sx={{
                            position: 'relative',
                            width: 120,
                            height: 120,
                            borderRadius: 2,
                            overflow: 'hidden',
                            flex: '0 0 auto',
                            border: isMain ? '2px solid' : '1px solid',
                            borderColor: isMain ? 'primary.main' : 'rgba(0,0,0,0.15)',
                            cursor: 'default',
                          }}
                          onClick={(e) => e.stopPropagation()}>
                          <Box
                            component="img"
                            src={img.url}
                            alt="preview"
                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onClick={() => openViewer(img.url)}
                          />

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
                              cursor: 'pointer',
                            }}
                            onClick={() => setMainImageId(img.id)}>
                            {isMain ? (
                              <RadioButtonCheckedIcon fontSize="small" />
                            ) : (
                              <RadioButtonUncheckedIcon fontSize="small" />
                            )}
                            <Typography variant="caption" sx={{ lineHeight: 1 }}>
                              main
                            </Typography>
                          </Box>

                          <Box
                            sx={{
                              position: 'absolute',
                              top: 6,
                              right: 6,
                              display: 'flex',
                              gap: 0.5,
                            }}>
                            <Tooltip title="Просмотр">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => openViewer(img.url)}
                                  sx={{
                                    bgcolor: 'rgba(0,0,0,0.55)',
                                    color: 'white',
                                    '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
                                  }}>
                                  <ZoomInIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>

                            <Tooltip title="Удалить">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => removeImage(img.id)}
                                  sx={{
                                    bgcolor: 'rgba(0,0,0,0.55)',
                                    color: 'white',
                                    '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
                                  }}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={handlePickImages}
                />
              </Box>

              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.6 }}>
                PNG/JPG/WebP, до 5MB, можно несколько файлов. “main” отправляется как массив флагов.
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Бренд"
                fullWidth
                value={brandName}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setBrandDialogOpen(true)}>
                        <MoreHorizIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                onClick={() => setBrandDialogOpen(true)}
              />

              <TextField
                label="Категория"
                fullWidth
                value={categoryName}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setCategoryDialogOpen(true)}>
                        <MoreHorizIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                onClick={() => setCategoryDialogOpen(true)}
                helperText="При выборе категории атрибуты загрузятся автоматически"
              />

              <TextField
                label="Единица измерения"
                fullWidth
                value={unitName ? `${unitName} (${unitSymbol})` : ''}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setUnitDialogOpen(true)}>
                        <MoreHorizIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                onClick={() => setUnitDialogOpen(true)}
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Цена"
                fullWidth
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                helperText="Можно вводить 0.9 (decimal)"
              />
              <TextField
                label="РРЦ"
                fullWidth
                value={rrp}
                onChange={(e) => setRrp(e.target.value)}
                inputMode="decimal"
              />
              <FormControlLabel
                control={
                  <Checkbox checked={hasStock} onChange={(e) => setHasStock(e.target.checked)} />
                }
                label="Есть остаток"
              />
            </Stack>

            <Typography variant="h6" mt={2}>
              Атрибуты
            </Typography>

            {attributes.length === 0 ? (
              <Typography variant="body2">Выберите категорию, чтобы загрузить атрибуты</Typography>
            ) : (
              <Stack spacing={1}>
                {attributes.map((a) => {
                  if (a.dataType === 3) {
                    return (
                      <FormControlLabel
                        key={a.attributeDefinitionId}
                        control={
                          <Checkbox
                            checked={Boolean(a.boolValue)}
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
              value={advantagesText}
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
              value={complectationText}
              onChange={(e) => setComplectationText(e.target.value)}
              helperText="Каждый пункт комплектации с новой строки"
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Отмена</Button>
          <Button variant="contained" onClick={save} disabled={!canSave}>
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      {/* viewer */}
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

      <BrandSelectDialog
        open={brandDialogOpen}
        onClose={() => setBrandDialogOpen(false)}
        onSelect={(b: Brand) => {
          setBrandId(b.id);
          setBrandName(b.name);
          setBrandDialogOpen(false);
        }}
      />

      <CategorySelectDialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        onSelect={(c: CategoryDto) => {
          setCategoryId(c.id);
          setCategoryName(c.name);
          setCategoryDialogOpen(false);
          void loadCategoryAttributes(c.id);
        }}
      />

      <UnitSelectDialog
        open={unitDialogOpen}
        onClose={() => setUnitDialogOpen(false)}
        onSelect={(u: MeasurementUnit) => {
          setUnitId(u.id);
          setUnitName(u.name);
          setUnitSymbol(u.symbol);
          setUnitDialogOpen(false);
        }}
      />
    </>
  );
}
