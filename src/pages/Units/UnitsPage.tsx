import { useEffect, useState } from 'react';
import { UnitsApi } from '../../api/units.api';
import { Button, Box } from '@mui/material';
import UnitForm from './UnitForm';
import UnitDetailsDialog from './UnitDetailsDialog';
import { DataGrid, getGridStringOperators } from '@mui/x-data-grid';
import type {
  GridColDef,
  GridFilterItem,
  GridFilterModel,
  GridPaginationModel,
} from '@mui/x-data-grid';
import type { MeasurementUnit } from '../../models/unit';

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

  return {
    ...model,
    items: [normalizedItem],
  };
}

export default function UnitsPage() {
  const [items, setItems] = useState<MeasurementUnit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });
  const [appliedNameFilter, setAppliedNameFilter] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<MeasurementUnit | null>(null);
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

    async function load() {
      setLoading(true);
      try {
        const res = await UnitsApi.getPaged(
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

    void load();

    return () => {
      ignore = true;
    };
  }, [appliedNameFilter, paginationModel.page, paginationModel.pageSize]);

  const reload = async () => {
    const res = await UnitsApi.getPaged(
      paginationModel.page + 1,
      paginationModel.pageSize,
      appliedNameFilter || undefined,
    );
    setItems(res.data.items);
    setTotal(res.data.total ?? 0);
  };

  const handleOpenDetails = (unit: MeasurementUnit) => {
    setSelectedUnit(unit);
    setOpenDetails(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleRowDoubleClick = (params: any) => {
    handleOpenDetails(params.row as MeasurementUnit);
  };

  const columns: GridColDef<MeasurementUnit>[] = [
    {
      field: 'name',
      headerName: 'Наименование',
      flex: 1,
      filterOperators: getGridStringOperators().filter((operator) => operator.value === 'contains'),
    },
    {
      field: 'symbol',
      headerName: 'Обозначение',
      flex: 1,
      filterable: false,
    },
    {
      field: 'isActive',
      headerName: 'Активна',
      flex: 1,
      filterable: false,
      valueFormatter: (value: boolean) => (value ? 'Да' : 'Нет'),
    },
  ];

  return (
    <Box p={2}>
      <Button variant="contained" onClick={() => setOpenForm(true)}>
        Создать
      </Button>

      <Box mt={2} sx={{ height: 500 }}>
        <DataGrid<MeasurementUnit>
          rows={items}
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
