import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';

import { BrandsApi } from '../../api/brands.api';
import type { Brand } from '../../models/brand';

interface BrandSelectDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (brand: Brand) => void;
}

function hasRow(x: unknown): x is { row: Brand } {
  return typeof x === 'object' && x !== null && 'row' in x;
}

export default function BrandSelectDialog({ open, onClose, onSelect }: BrandSelectDialogProps) {
  const [items, setItems] = useState<Brand[]>([]);

  useEffect(() => {
    if (!open) return;

    let ignore = false;

    async function load() {
      const res = await BrandsApi.getPaged(1, 1000);
      if (!ignore) setItems(res.data.items);
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [open]);

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Название', flex: 1 },
    { field: 'isActive', headerName: 'Активен', flex: 1 },
  ];

  const handleRowDoubleClick = (params: unknown) => {
    if (!hasRow(params)) return;
    onSelect(params.row);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pr: 6 }}>
        Выбор бренда
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ height: 520, mt: 1 }}>
          <DataGrid
            rows={items}
            columns={columns}
            getRowId={(r) => r.id}
            onRowDoubleClick={handleRowDoubleClick}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
}
