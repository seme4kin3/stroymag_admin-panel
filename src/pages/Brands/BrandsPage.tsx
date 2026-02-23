import { useState, useEffect } from 'react';
import { Box, Button } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';

import { BrandsApi } from '../../api/brands.api';
import type { Brand } from '../../models/brand';
import BrandForm from './BrandForm';
import BrandDetailsDialog from './BrandDetailsDialog';

export default function BrandsPage() {
  const [items, setItems] = useState<Brand[]>([]);
  const [openForm, setOpenForm] = useState(false);

  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [openDetails, setOpenDetails] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const res = await BrandsApi.getPaged();
      if (!ignore) {
        setItems(res.data.items);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, []);

  const reload = async () => {
    const res = await BrandsApi.getPaged();
    setItems(res.data.items);
  };

  const handleOpenDetails = (brand: Brand) => {
    setSelectedBrand(brand);
    setOpenDetails(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleRowDoubleClick = (params: any) => {
    handleOpenDetails(params.row as Brand);
  };

  const columns: GridColDef<Brand>[] = [{ field: 'name', headerName: 'Название', flex: 1 }];

  return (
    <Box p={2}>
      <Button variant="contained" onClick={() => setOpenForm(true)}>
        Создать
      </Button>

      <Box mt={2} sx={{ height: 500 }}>
        <DataGrid<Brand>
          rows={items}
          columns={columns}
          getRowId={(r) => r.id}
          onRowDoubleClick={handleRowDoubleClick}
        />
      </Box>

      {/* Создание нового бренда */}
      <BrandForm open={openForm} onClose={() => setOpenForm(false)} onSaved={reload} />

      {/* Просмотр / редактирование / удаление существующего бренда */}
      <BrandDetailsDialog
        open={openDetails}
        brand={selectedBrand}
        onClose={() => setOpenDetails(false)}
        onChanged={reload}
      />
    </Box>
  );
}
