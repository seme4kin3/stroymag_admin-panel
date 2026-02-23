import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
import { useState } from 'react';
import { UnitsApi } from '../../api/units.api';

interface UnitFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function UnitForm({ open, onClose, onSaved }: UnitFormProps) {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');

  const handleSave = async () => {
    await UnitsApi.create({ name, symbol });
    setName('');
    setSymbol('');
    await onSaved();
    onClose();
  };

  const handleClose = () => {
    setName('');
    setSymbol('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Создание единицы измерения</DialogTitle>

      <DialogContent>
        <TextField
          label="Наименование полное"
          fullWidth
          margin="normal"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <TextField
          label="Наименование"
          fullWidth
          margin="normal"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />
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
