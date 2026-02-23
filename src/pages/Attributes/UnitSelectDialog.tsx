import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRowParams } from '@mui/x-data-grid';
import { UnitsApi } from '../../api/units.api';
import type { MeasurementUnit } from '../../models/unit';

interface UnitSelectDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (unit: MeasurementUnit) => void;
}

export default function UnitSelectDialog({ open, onClose, onSelect }: UnitSelectDialogProps) {
  const [items, setItems] = useState<MeasurementUnit[]>([]);
  const [selected, setSelected] = useState<MeasurementUnit | null>(null);

  useEffect(() => {
    if (!open) return;

    let ignore = false;

    async function load() {
      const res = await UnitsApi.getPaged();
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
    { field: 'name', headerName: 'Наименование полное', flex: 1 },
    { field: 'symbol', headerName: 'Наименование', flex: 1 },
  ];

  const handleRowDoubleClick = (params: GridRowParams<MeasurementUnit>) => {
    onSelect(params.row as MeasurementUnit);
    onClose();
  };

  const handleRowClick = (params: GridRowParams<MeasurementUnit>) => {
    setSelected(params.row as MeasurementUnit);
  };

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Выбор единицы измерения</DialogTitle>
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
        <Button onClick={handleConfirm} variant="contained" disabled={!selected}>
          Выбрать
        </Button>
      </DialogActions>
    </Dialog>
  );
}
