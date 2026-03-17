import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
} from '@mui/material';
import { useState } from 'react';
import { UnitsApi } from '../../api/units.api';
import { parseApiError } from '../../utils/apiError';

interface UnitFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function UnitForm({ open, onClose, onSaved }: UnitFormProps) {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      await UnitsApi.create({ name, symbol });
      setName('');
      setSymbol('');
      setErrorMsg(null);
      await onSaved();
      onClose();
    } catch (err) {
      setErrorMsg(parseApiError(err));
    }
  };

  const handleClose = () => {
    setName('');
    setSymbol('');
    setErrorMsg(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Создание единицы измерения</DialogTitle>

      <DialogContent>
        <TextField
          label="Наименование"
          fullWidth
          margin="normal"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <TextField
          label="Обозначение"
          fullWidth
          margin="normal"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />
        {errorMsg && <Alert severity="error" sx={{ mt: 1 }}>{errorMsg}</Alert>}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Отмена</Button>
        <Button variant="contained" onClick={handleSave}>
          Создать
        </Button>
      </DialogActions>
    </Dialog>
  );
}
