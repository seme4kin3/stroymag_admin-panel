import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
import { useState } from 'react';
import { BrandsApi } from '../../api/brands.api';

interface BrandFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function BrandForm({ open, onClose, onSaved }: BrandFormProps) {
  const [name, setName] = useState('');

  const handleSave = async () => {
    await BrandsApi.create({ name });
    setName('');
    onSaved();
    onClose();
  };

  const handleClose = () => {
    setName('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Создание бренда</DialogTitle>

      <DialogContent>
        <TextField
          label="Наименование"
          fullWidth
          margin="normal"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
