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
import { BrandsApi } from '../../api/brands.api';
import { parseApiError } from '../../utils/apiError';

interface BrandFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function BrandForm({ open, onClose, onSaved }: BrandFormProps) {
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      await BrandsApi.create({ name });
      setName('');
      setErrorMsg(null);
      onSaved();
      onClose();
    } catch (err) {
      setErrorMsg(parseApiError(err));
    }
  };

  const handleClose = () => {
    setName('');
    setErrorMsg(null);
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
