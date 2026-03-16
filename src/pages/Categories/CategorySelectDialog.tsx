import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRowParams } from '@mui/x-data-grid';
import { CategoriesApi } from '../../api/categories.api';
import type { CategoryDto } from '../../models/category';

interface CategorySelectDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (category: CategoryDto) => void;
}

export default function CategorySelectDialog({
  open,
  onClose,
  onSelect,
}: CategorySelectDialogProps) {
  const [items, setItems] = useState<CategoryDto[]>([]);
  const [selected, setSelected] = useState<CategoryDto | null>(null);

  useEffect(() => {
    if (!open) return;

    let ignore = false;

    async function load() {
      const res = await CategoriesApi.getPaged();
      if (!ignore) {
        setItems(res.data.items);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [open]);

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Название', flex: 1 },
  ];

  const handleRowDoubleClick = (params: GridRowParams<CategoryDto>) => {
    onSelect(params.row as CategoryDto);
    onClose();
  };

  const handleRowClick = (params: GridRowParams<CategoryDto>) => {
    setSelected(params.row as CategoryDto);
  };

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Выбор родительской категории</DialogTitle>
      <DialogContent>
        <Box mt={1} sx={{ height: 400 }}>
          <DataGrid
            rows={items}
            columns={columns}
            getRowId={(r) => r.id}
            onRowDoubleClick={handleRowDoubleClick}
            onRowClick={handleRowClick}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained" onClick={handleConfirm} disabled={!selected}>
          Выбрать
        </Button>
      </DialogActions>
    </Dialog>
  );
}
