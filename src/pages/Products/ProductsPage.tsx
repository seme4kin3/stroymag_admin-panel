import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_ColumnFiltersState,
  type MRT_PaginationState,
} from 'material-react-table';
import { Box, Button } from '@mui/material';

import { ProductsApi } from '../../api/products.api';
import type { ProductAdminListItemDto } from '../../models/product';
import ProductForm from './ProductForm';
import ProductDetailsDialog from './ProductDetailsDialog';

function getFilterParam(filters: MRT_ColumnFiltersState, field: string) {
  const f = filters.find((f) => f.id === field);
  return typeof f?.value === 'string' && f.value.trim() ? f.value.trim() : undefined;
}

export default function ProductsPage() {
  // data and fetching state
  const [data, setData] = useState<ProductAdminListItemDto[]>([]);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [rowCount, setRowCount] = useState(0);

  // table state
  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([]);
  const [appliedFilters, setAppliedFilters] = useState<MRT_ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<MRT_PaginationState>({ pageIndex: 0, pageSize: 25 });

  // dialogs
  const [openCreate, setOpenCreate] = useState(false);
  const [selected, setSelected] = useState<ProductAdminListItemDto | null>(null);
  const [openDetails, setOpenDetails] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // debounce фильтров, сброс страницы
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setAppliedFilters(columnFilters);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [columnFilters]);

  useEffect(() => {
    const fetchData = async () => {
      if (!data.length) {
        setIsLoading(true);
      } else {
        setIsRefetching(true);
      }

      try {
        const res = await ProductsApi.getPaged(
          pagination.pageIndex + 1,
          pagination.pageSize,
          getFilterParam(appliedFilters, 'name'),
          getFilterParam(appliedFilters, 'article'),
          getFilterParam(appliedFilters, 'sku'),
        );
        setData(res.data.items);
        setRowCount(res.data.total ?? 0);
      } catch {
        setIsError(true);
        return;
      }

      setIsError(false);
      setIsLoading(false);
      setIsRefetching(false);
    };

    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, pagination.pageIndex, pagination.pageSize]);

  const reload = () => {
    setAppliedFilters((prev) => [...prev]);
  };

  const columns = useMemo<MRT_ColumnDef<ProductAdminListItemDto>[]>(
    () => [
      { accessorKey: 'sku', header: 'Штрихкод' },
      { accessorKey: 'article', header: 'Артикул' },
      { accessorKey: 'name', header: 'Наименование' },
      { accessorKey: 'brandName', header: 'Бренд', enableColumnFilter: false },
      { accessorKey: 'categoryName', header: 'Категория', enableColumnFilter: false },
      { accessorKey: 'unitSymbol', header: 'Ед.', enableColumnFilter: false },
      { accessorKey: 'price', header: 'Цена', enableColumnFilter: false },
      {
        accessorKey: 'hasStock',
        header: 'В наличии',
        enableColumnFilter: false,
        Cell: ({ cell }) => (cell.getValue<boolean>() ? 'Да' : 'Нет'),
      },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data,
    getRowId: (row) => row.id,
    initialState: { showColumnFilters: true },
    manualFiltering: true,
    manualPagination: true,
    muiToolbarAlertBannerProps: isError
      ? { color: 'error', children: 'Ошибка загрузки данных' }
      : undefined,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    rowCount,
    state: {
      columnFilters,
      isLoading,
      pagination,
      showAlertBanner: isError,
      showProgressBars: isRefetching,
    },
    enableGlobalFilter: false,
    enableSorting: false,
    enableColumnActions: false,
    columnFilterDisplayMode: 'subheader',
    muiPaginationProps: { rowsPerPageOptions: [25, 50, 100] },
    localization: { rowsPerPage: 'Строк:' },
    muiTableBodyRowProps: ({ row }) => ({
      onDoubleClick: async () => {
        const res = await ProductsApi.getById(row.id);
        setSelected(res.data);
        setOpenDetails(true);
      },
      sx: { cursor: 'pointer' },
    }),
  });

  return (
    <Box p={2}>
      <Button variant="contained" onClick={() => setOpenCreate(true)}>
        Создать
      </Button>

      <Box mt={2}>
        <MaterialReactTable table={table} />
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
