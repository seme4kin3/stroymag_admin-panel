// src/pages/Categories/CategoriesPage.tsx

import { useEffect, useMemo, useState } from 'react';
import { Box, Button } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';

import { CategoriesApi } from '../../api/categories.api';
import type { CategoryDto } from '../../models/category';
import type { CategoryDetailsDto } from '../../models/categoryDetails';

import CategoryForm from './CategoryForm';
import CategoryDetailsDialog from './CategoryDetailsDialog';

type CategoryRow = CategoryDto & { attributesCount: number };

function hasRow(x: unknown): x is { row: CategoryRow } {
  return typeof x === 'object' && x !== null && 'row' in x;
}

export default function CategoriesPage() {
  const [items, setItems] = useState<CategoryDto[]>([]);
  const [openForm, setOpenForm] = useState(false);

  const [selectedDetails, setSelectedDetails] = useState<CategoryDetailsDto | null>(null);
  const [openDetails, setOpenDetails] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function fetchList() {
      const res = await CategoriesApi.getPaged(1, 1000);
      if (!ignore) setItems(res.data.items);
    }

    fetchList();

    return () => {
      ignore = true;
    };
  }, []);

  const reload = async () => {
    const res = await CategoriesApi.getPaged(1, 1000);
    setItems(res.data.items);
  };

  const rows: CategoryRow[] = useMemo(
    () =>
      items.map((c) => ({
        ...c,
        attributesCount: c.attributes?.length ?? 0,
      })),
    [items],
  );

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Название', flex: 1 },
    { field: 'slug', headerName: 'Slug', flex: 1 },
    { field: 'attributesCount', headerName: 'Кол-во атрибутов', flex: 1 },
  ];

  const handleRowDoubleClick = async (params: unknown) => {
    if (!hasRow(params)) return;

    const id = params.row.id;
    const res = await CategoriesApi.getDetails(id);

    setSelectedDetails(res.data);
    setOpenDetails(true);
  };

  return (
    <Box p={2}>
      <Button variant="contained" onClick={() => setOpenForm(true)}>
        Создать категорию
      </Button>

      <Box mt={2} sx={{ height: 500 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(r) => r.id}
          onRowDoubleClick={handleRowDoubleClick}
        />
      </Box>

      <CategoryForm open={openForm} onClose={() => setOpenForm(false)} onSaved={reload} />

      <CategoryDetailsDialog
        open={openDetails}
        details={selectedDetails}
        onClose={() => setOpenDetails(false)}
        onChanged={reload}
      />
    </Box>
  );
}
