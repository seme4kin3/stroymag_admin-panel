import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_ColumnFiltersState,
  type MRT_PaginationState,
} from 'material-react-table';
import { Box, Button } from '@mui/material';

import { UnitsApi } from '../../api/units.api';
import type { MeasurementUnit } from '../../models/unit';
import UnitForm from './UnitForm';
import UnitDetailsDialog from './UnitDetailsDialog';

function getFilterParam(filters: MRT_ColumnFiltersState, field: string) {
  const f = filters.find((f) => f.id === field);
  return typeof f?.value === 'string' && f.value.trim() ? f.value.trim() : undefined;
}

export default function UnitsPage() {
  const [data, setData] = useState<MeasurementUnit[]>([]);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [rowCount, setRowCount] = useState(0);

  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([]);
  const [appliedFilters, setAppliedFilters] = useState<MRT_ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<MRT_PaginationState>({ pageIndex: 0, pageSize: 25 });

  const [openForm, setOpenForm] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<MeasurementUnit | null>(null);
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
        const res = await UnitsApi.getPaged(
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

  const columns = useMemo<MRT_ColumnDef<MeasurementUnit>[]>(
    () => [
      { accessorKey: 'name', header: 'Наименование' },
      { accessorKey: 'symbol', header: 'Обозначение', enableColumnFilter: false },
      {
        accessorKey: 'isActive',
        header: 'Активна',
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
        setSelectedUnit(row.original);
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

      <UnitForm open={openForm} onClose={() => setOpenForm(false)} onSaved={reload} />

      <UnitDetailsDialog
        open={openDetails}
        unit={selectedUnit}
        onClose={() => setOpenDetails(false)}
        onChanged={reload}
      />
    </Box>
  );
}
