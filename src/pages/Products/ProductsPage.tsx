import { useEffect, useState } from 'react';
import { Box, Button } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';

import { ProductsApi } from '../../api/products.api';
import type { ProductAdminListItemDto } from '../../models/product';

import ProductForm from './ProductForm';
import ProductDetailsDialog from './ProductDetailsDialog';

function hasRow(x: unknown): x is { row: ProductAdminListItemDto } {
  return typeof x === 'object' && x !== null && 'row' in x;
}

export default function ProductsPage() {
  const [items, setItems] = useState<ProductAdminListItemDto[]>([]);
  const [openCreate, setOpenCreate] = useState(false);

  const [selected, setSelected] = useState<ProductAdminListItemDto | null>(null);
  const [openDetails, setOpenDetails] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const res = await ProductsApi.getPaged(1, 1000);
      if (!ignore) setItems(res.data.items);
    }

    void load();

    return () => {
      ignore = true;
    };
  }, []);

  const reload = async () => {
    const res = await ProductsApi.getPaged(1, 1000);
    setItems(res.data.items);
  };

  const columns: GridColDef[] = [
    { field: 'sku', headerName: 'SKU', flex: 1 },
    { field: 'article', headerName: 'Артикул', flex: 1 },
    { field: 'name', headerName: 'Название', flex: 2 },
    { field: 'brandName', headerName: 'Бренд', flex: 1 },
    { field: 'categoryName', headerName: 'Категория', flex: 1 },
    { field: 'unitSymbol', headerName: 'Ед.', flex: 0.5 },
    { field: 'price', headerName: 'Цена', flex: 1 },
    { field: 'hasStock', headerName: 'В наличии', flex: 1 },
  ];

  const handleRowDoubleClick = async (params: unknown) => {
    if (!hasRow(params)) return;

    // если есть отдельный getById - лучше взять его
    const res = await ProductsApi.getById(params.row.id);
    setSelected(res.data);
    setOpenDetails(true);
  };

  return (
    <Box p={2}>
      <Button variant="contained" onClick={() => setOpenCreate(true)}>
        Создать товар
      </Button>

      <Box mt={2} sx={{ height: 650 }}>
        <DataGrid
          rows={items}
          columns={columns}
          getRowId={(r) => r.id}
          onRowDoubleClick={handleRowDoubleClick}
        />
      </Box>

      <ProductForm open={openCreate} onClose={() => setOpenCreate(false)} onSaved={reload} />

      <ProductDetailsDialog
        open={openDetails}
        product={selected}
        onClose={() => setOpenDetails(false)}
        onChanged={reload}
      />
    </Box>
  );
}
