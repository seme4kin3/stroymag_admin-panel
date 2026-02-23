import { useEffect, useState } from 'react';
import { UnitsApi } from '../../api/units.api';
import { Button, Box } from '@mui/material';
import UnitForm from './UnitForm';
import UnitDetailsDialog from './UnitDetailsDialog';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import type { MeasurementUnit } from '../../models/unit';

export default function UnitsPage() {
  const [items, setItems] = useState<MeasurementUnit[]>([]);
  const [openForm, setOpenForm] = useState(false);

  const [selectedUnit, setSelectedUnit] = useState<MeasurementUnit | null>(null);
  const [openDetails, setOpenDetails] = useState(false);

  useEffect(() => {
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
  }, []);

  const reload = async () => {
    const res = await UnitsApi.getPaged();
    setItems(res.data.items);
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
    { field: 'name', headerName: 'Название', flex: 1 },
    { field: 'symbol', headerName: 'Обозначение', flex: 1 },
    { field: 'isActive', headerName: 'Активна', flex: 1 },
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
          onRowDoubleClick={handleRowDoubleClick}
        />
      </Box>

      {/* Создание новой единицы */}
      <UnitForm open={openForm} onClose={() => setOpenForm(false)} onSaved={reload} />

      {/* Просмотр / редактирование / удаление существующей */}
      <UnitDetailsDialog
        open={openDetails}
        unit={selectedUnit}
        onClose={() => setOpenDetails(false)}
        onChanged={reload}
      />
    </Box>
  );
}
