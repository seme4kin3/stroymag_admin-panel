import { useEffect, useState } from 'react';
import { Box, Button } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';

import { AttributesApi } from '../../api/attributes.api';
import type { AttributeDto } from '../../models/attribute';
import AttributeForm from './AttributeForm';
import AttributeDetailsDialog from './AttributeDetailsDialog';

export default function AttributesPage() {
  const [items, setItems] = useState<AttributeDto[]>([]);
  const [openForm, setOpenForm] = useState(false);

  const [selectedAttribute, setSelectedAttribute] = useState<AttributeDto | null>(null);
  const [openDetails, setOpenDetails] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const res = await AttributesApi.getPaged();
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
    const res = await AttributesApi.getPaged();
    setItems(res.data.items);
  };

  const handleOpenDetails = (attr: AttributeDto) => {
    setSelectedAttribute(attr);
    setOpenDetails(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleRowDoubleClick = (params: any) => {
    handleOpenDetails(params.row as AttributeDto);
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Название', flex: 1 },
    { field: 'key', headerName: 'Ключ', flex: 1 },
    {
      field: 'dataType',
      headerName: 'Тип данных',
      flex: 1,
      // пока показываем сырой enum (0..3), чтобы не ломать то, что уже работает
    },
    {
      field: 'isActive',
      headerName: 'Активен',
      flex: 1,
    },
  ];

  return (
    <Box p={2}>
      <Button variant="contained" onClick={() => setOpenForm(true)}>
        Создать
      </Button>

      <Box mt={2} sx={{ height: 500 }}>
        <DataGrid<AttributeDto>
          rows={items}
          columns={columns}
          getRowId={(r) => r.id}
          onRowDoubleClick={handleRowDoubleClick}
        />
      </Box>

      {/* Создание нового атрибута */}
      <AttributeForm open={openForm} onClose={() => setOpenForm(false)} onSaved={reload} />

      {/* Просмотр / редактирование / удаление атрибута */}
      <AttributeDetailsDialog
        open={openDetails}
        attribute={selectedAttribute}
        onClose={() => setOpenDetails(false)}
        onChanged={reload}
      />
    </Box>
  );
}
