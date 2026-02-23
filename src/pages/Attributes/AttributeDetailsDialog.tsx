import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useState } from 'react';

import { AttributesApi } from '../../api/attributes.api';
import type { AttributeDto, AttributeDataType } from '../../models/attribute';
import ConfirmDialog from '../../components/ConfirmDialog';

interface AttributeDetailsDialogProps {
  open: boolean;
  attribute: AttributeDto | null;
  onClose: () => void;
  onChanged: () => void; // перезагрузка списка после изменений
}

// те же опции, что и в форме создания
const dataTypeOptions: { value: AttributeDataType; label: string }[] = [
  { value: 0, label: 'String' },
  { value: 1, label: 'Integer' },
  { value: 2, label: 'Decimal' },
  { value: 3, label: 'Boolean' },
];

export default function AttributeDetailsDialog({
  open,
  attribute,
  onClose,
  onChanged,
}: AttributeDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftKey, setDraftKey] = useState('');
  const [draftDataType, setDraftDataType] = useState<AttributeDataType>(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!attribute) return null;

  const handleStartEdit = () => {
    setDraftName(attribute.name);
    setDraftKey(attribute.key);
    setDraftDataType(attribute.dataType);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    await AttributesApi.update(attribute.id, {
      name: draftName,
      key: draftKey,
      dataType: draftDataType,
    });
    setIsEditing(false);
    await onChanged();
  };

  const handleDeleteClick = () => {
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setConfirmOpen(false);
    await AttributesApi.delete(attribute.id);
    await onChanged();
    onClose();
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  const currentTypeLabel = dataTypeOptions.find((x) => x.value === attribute.dataType)?.label ?? '';

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pr: 6 }}>
          Атрибут
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Название"
              fullWidth
              value={isEditing ? draftName : attribute.name}
              onChange={(e) => setDraftName(e.target.value)}
              disabled={!isEditing}
            />

            <TextField
              label="Ключ"
              fullWidth
              value={isEditing ? draftKey : attribute.key}
              onChange={(e) => setDraftKey(e.target.value)}
              disabled={!isEditing}
            />

            {isEditing ? (
              <FormControl fullWidth>
                <InputLabel id="attr-type-label">Тип данных</InputLabel>
                <Select
                  labelId="attr-type-label"
                  label="Тип данных"
                  value={draftDataType}
                  onChange={(e) => setDraftDataType(Number(e.target.value) as AttributeDataType)}>
                  {dataTypeOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField label="Тип данных" fullWidth value={currentTypeLabel} disabled />
            )}

            <FormControlLabel
              control={<Checkbox checked={attribute.isActive} disabled />}
              label="Активен"
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
              <Button onClick={handleCancelEdit}>Отмена</Button>
              <Button variant="contained" onClick={handleSave}>
                Сохранить
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Удаление атрибута"
        message={`Вы действительно хотите удалить атрибут "${attribute.name}"? Это действие необратимо.`}
        confirmText="Удалить"
        cancelText="Отмена"
      />
    </>
  );
}
