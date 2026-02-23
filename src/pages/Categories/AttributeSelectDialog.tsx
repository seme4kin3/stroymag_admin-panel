import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRowParams } from '@mui/x-data-grid';
import { AttributesApi } from '../../api/attributes.api';
import type { AttributeDto } from '../../models/attribute';

interface AttributeSelectDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (attribute: AttributeDto) => void;
}

export default function AttributeSelectDialog({
  open,
  onClose,
  onSelect,
}: AttributeSelectDialogProps) {
  const [items, setItems] = useState<AttributeDto[]>([]);
  const [selected, setSelected] = useState<AttributeDto | null>(null);

  useEffect(() => {
    if (!open) return;

    let ignore = false;

    async function load() {
      const res = await AttributesApi.getPaged();
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
    { field: 'key', headerName: 'Ключ', flex: 1 },
    { field: 'dataType', headerName: 'Тип данных', flex: 1 },
  ];

  const handleRowDoubleClick = (params: GridRowParams<AttributeDto>) => {
    onSelect(params.row as AttributeDto);
    onClose();
  };

  const handleRowClick = (params: GridRowParams<AttributeDto>) => {
    setSelected(params.row as AttributeDto);
  };

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Выбор атрибута</DialogTitle>
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
