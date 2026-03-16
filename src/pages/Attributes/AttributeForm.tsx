import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useState } from 'react';
import { AttributesApi } from '../../api/attributes.api';
import type { AttributeDataType } from '../../models/attribute';

interface AttributeFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// отображаемые опции для enum'а
const dataTypeOptions: { value: AttributeDataType; label: string }[] = [
  { value: 0, label: 'Строка' },
  { value: 1, label: 'Целое число' },
  { value: 2, label: 'Число с точкой' },
  { value: 3, label: 'Логическое' },
];

export default function AttributeForm({ open, onClose, onSaved }: AttributeFormProps) {
  const [name, setName] = useState('');
  const [dataType, setDataType] = useState<AttributeDataType>(0);

  const handleSave = async () => {
    await AttributesApi.create({
      name,
      dataType, // отправляем число 0..3
    });

    setName('');
    setDataType(0);

    await onSaved();
    onClose();
  };

  const handleClose = () => {
    setName('');
    setDataType(0);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Создание атрибута</DialogTitle>

      <DialogContent>
        <TextField
          label="Название"
          fullWidth
          margin="normal"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <FormControl fullWidth margin="normal">
          <InputLabel id="attr-type-label">Тип данных</InputLabel>
          <Select
            labelId="attr-type-label"
            label="Тип данных"
            value={dataType}
            onChange={(e) => setDataType(Number(e.target.value) as AttributeDataType)}>
            {dataTypeOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
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
