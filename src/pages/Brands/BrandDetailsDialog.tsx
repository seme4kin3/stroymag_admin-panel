import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useState } from 'react';
import { BrandsApi } from '../../api/brands.api';
import type { Brand } from '../../models/brand';
import ConfirmDialog from '../../components/ConfirmDialog';

interface BrandDetailsDialogProps {
  open: boolean;
  brand: Brand | null;
  onClose: () => void;
  onChanged: () => void; // перезагрузка списка после изменений
}

export default function BrandDetailsDialog({
  open,
  brand,
  onClose,
  onChanged,
}: BrandDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!brand) return null;

  const handleStartEdit = () => {
    setDraftName(brand.name);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    await BrandsApi.update(brand.id, { name: draftName });
    setIsEditing(false);
    await onChanged();
  };

  const handleDeleteClick = () => {
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setConfirmOpen(false);
    await BrandsApi.delete(brand.id);
    await onChanged();
    onClose();
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pr: 6 }}>
          Бренд
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
              value={isEditing ? draftName : brand.name}
              onChange={(e) => setDraftName(e.target.value)}
              disabled={!isEditing}
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
        title="Удаление бренда"
        message={`Вы действительно хотите удалить бренд "${brand.name}"? Это действие необратимо.`}
        confirmText="Удалить"
        cancelText="Отмена"
      />
    </>
  );
}
