// src/pages/Categories/CategoriesPage.tsx

import { useEffect, useMemo, useState } from 'react';
import { Box, Button } from '@mui/material';
import { DataGrid, getGridStringOperators } from '@mui/x-data-grid';
import type { GridColDef, GridFilterItem, GridFilterModel, GridPaginationModel } from '@mui/x-data-grid';

import { CategoriesApi } from '../../api/categories.api';
import type { CategoryDto } from '../../models/category';
import type { CategoryDetailsDto } from '../../models/categoryDetails';

import CategoryForm from './CategoryForm';
import CategoryDetailsDialog from './CategoryDetailsDialog';

type CategoryRow = CategoryDto & { attributesCount: number };

function hasRow(x: unknown): x is { row: CategoryRow } {
  return typeof x === 'object' && x !== null && 'row' in x;
}

function normalizeNameFilterModel(model: GridFilterModel): GridFilterModel {
  const nameItem = model.items.find((item) => item.field === 'name');

  if (!nameItem || typeof nameItem.value !== 'string' || nameItem.value.trim() === '') {
    return { ...model, items: [] };
  }

  const normalizedItem: GridFilterItem = {
    id: nameItem.id ?? 1,
    field: 'name',
    operator: 'contains',
    value: nameItem.value,
  };

  return { ...model, items: [normalizedItem] };
}

export default function CategoriesPage() {
  const [items, setItems] = useState<CategoryDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });
  const [appliedNameFilter, setAppliedNameFilter] = useState('');
  const [openForm, setOpenForm] = useState(false);

  const [selectedDetails, setSelectedDetails] = useState<CategoryDetailsDto | null>(null);
  const [openDetails, setOpenDetails] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nameFilterItem = filterModel.items.find((item) => item.field === 'name');
      const nextFilter = typeof nameFilterItem?.value === 'string' ? nameFilterItem.value.trim() : '';
      setAppliedNameFilter(nextFilter);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [filterModel]);

  useEffect(() => {
    let ignore = false;

    async function fetchList() {
      setLoading(true);
      try {
        const res = await CategoriesApi.getPaged(
          paginationModel.page + 1,
          paginationModel.pageSize,
          appliedNameFilter || undefined,
        );
        if (!ignore) {
          setItems(res.data.items);
          setTotal(res.data.total ?? 0);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void fetchList();

    return () => {
      ignore = true;
    };
  }, [appliedNameFilter, paginationModel.page, paginationModel.pageSize]);

  const reload = async () => {
    const res = await CategoriesApi.getPaged(
      paginationModel.page + 1,
      paginationModel.pageSize,
      appliedNameFilter || undefined,
    );
    setItems(res.data.items);
    setTotal(res.data.total ?? 0);
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
    {
      field: 'name',
      headerName: 'Название',
      flex: 1,
      filterOperators: getGridStringOperators().filter((operator) => operator.value === 'contains'),
    },
    {
      field: 'attributesCount',
      headerName: 'Кол-во атрибутов',
      flex: 1,
      filterable: false,
    },
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
        Создать
      </Button>

      <Box mt={2} sx={{ height: 500 }}>
        <DataGrid<CategoryRow>
          rows={rows}
          columns={columns}
          getRowId={(r) => r.id}
          loading={loading}
          pagination
          paginationMode="server"
          filterMode="server"
          filterModel={filterModel}
          onFilterModelChange={(nextModel) => {
            const normalizedModel = normalizeNameFilterModel(nextModel);
            setFilterModel(normalizedModel);
            setPaginationModel((prev) => (prev.page === 0 ? prev : { ...prev, page: 0 }));
          }}
          rowCount={total}
          pageSizeOptions={[25, 50, 100]}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
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
