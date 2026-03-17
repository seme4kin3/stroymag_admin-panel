import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  IconButton,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useState } from 'react';
import { UnitsApi } from '../../api/units.api';
import type { MeasurementUnit } from '../../models/unit';
import ConfirmDialog from '../../components/ConfirmDialog';
import { parseApiError } from '../../utils/apiError';

interface UnitDetailsDialogProps {
  open: boolean;
  unit: MeasurementUnit | null;
  onClose: () => void;
  onChanged: () => void; // перезагрузка списка после изменений
}

export default function UnitDetailsDialog({
  open,
  unit,
  onClose,
  onChanged,
}: UnitDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftSymbol, setDraftSymbol] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!unit) return null;

  const handleStartEdit = () => {
    setDraftName(unit.name);
    setDraftSymbol(unit.symbol);
    setErrorMsg(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setErrorMsg(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      await UnitsApi.update(unit.id, { name: draftName, symbol: draftSymbol });
      setIsEditing(false);
      setErrorMsg(null);
      await onChanged();
    } catch (err) {
      setErrorMsg(parseApiError(err));
    }
  };

  const handleDeleteClick = () => {
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setConfirmOpen(false);
    try {
      await UnitsApi.delete(unit.id);
      await onChanged();
      onClose();
    } catch (err) {
      setErrorMsg(parseApiError(err));
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    setErrorMsg(null);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pr: 6 }}>
          Единица измерения
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
              value={isEditing ? draftName : unit.name}
              onChange={(e) => setDraftName(e.target.value)}
              disabled={!isEditing}
            />

            <TextField
              label="Обозначение"
              fullWidth
              value={isEditing ? draftSymbol : unit.symbol}
              onChange={(e) => setDraftSymbol(e.target.value)}
              disabled={!isEditing}
            />
          </Stack>
          {errorMsg && <Alert severity="error" sx={{ mt: 2 }}>{errorMsg}</Alert>}
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
        title="Удаление единицы измерения"
        message={`Вы действительно хотите удалить "${unit.name}"? Это действие необратимо.`}
        confirmText="Удалить"
        cancelText="Отмена"
      />
    </>
  );
}
