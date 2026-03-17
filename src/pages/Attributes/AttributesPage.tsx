import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_ColumnFiltersState,
  type MRT_PaginationState,
} from 'material-react-table';
import { Box, Button } from '@mui/material';

import { AttributesApi } from '../../api/attributes.api';
import type { AttributeDto } from '../../models/attribute';
import AttributeForm from './AttributeForm';
import AttributeDetailsDialog from './AttributeDetailsDialog';

const DATA_TYPE_LABELS: Record<number, string> = {
  0: 'Строка',
  1: 'Целое',
  2: 'Дробное',
  3: 'Булево',
};

function getFilterParam(filters: MRT_ColumnFiltersState, field: string) {
  const f = filters.find((f) => f.id === field);
  return typeof f?.value === 'string' && f.value.trim() ? f.value.trim() : undefined;
}

export default function AttributesPage() {
  const [data, setData] = useState<AttributeDto[]>([]);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [rowCount, setRowCount] = useState(0);

  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([]);
  const [appliedFilters, setAppliedFilters] = useState<MRT_ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<MRT_PaginationState>({ pageIndex: 0, pageSize: 25 });

  const [openForm, setOpenForm] = useState(false);
  const [selectedAttribute, setSelectedAttribute] = useState<AttributeDto | null>(null);
  const [openDetails, setOpenDetails] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        const res = await AttributesApi.getPaged(
          pagination.pageIndex + 1,
          pagination.pageSize,
          getFilterParam(appliedFilters, 'name'),
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

  const reload = () => setAppliedFilters((prev) => [...prev]);

  const columns = useMemo<MRT_ColumnDef<AttributeDto>[]>(
    () => [
      { accessorKey: 'name', header: 'Наименование' },
      {
        accessorKey: 'dataType',
        header: 'Тип данных',
        enableColumnFilter: false,
        Cell: ({ cell }) => DATA_TYPE_LABELS[cell.getValue<number>()] ?? cell.getValue<number>(),
      },
      {
        accessorKey: 'isActive',
        header: 'Активен',
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
      onDoubleClick: () => {
        setSelectedAttribute(row.original);
        setOpenDetails(true);
      },
      sx: { cursor: 'pointer' },
    }),
  });

  return (
    <Box p={2}>
      <Button variant="contained" onClick={() => setOpenForm(true)}>
        Создать
      </Button>

      <Box mt={2}>
        <MaterialReactTable table={table} />
      </Box>

      <AttributeForm open={openForm} onClose={() => setOpenForm(false)} onSaved={reload} />

      <AttributeDetailsDialog
        open={openDetails}
        attribute={selectedAttribute}
        onClose={() => setOpenDetails(false)}
        onChanged={reload}
      />
    </Box>
  );
}
