import { http } from './http';
import type { MeasurementUnit, CreateMeasurementUnit } from '../models/unit';

export const UnitsApi = {
  getPaged: (page = 1, pageSize = 50) =>
    http.get<{ items: MeasurementUnit[]; total: number }>('units', {
      params: { page, pageSize },
    }),

  create: (data: CreateMeasurementUnit) => http.post('units', data),

  update: (id: string, data: CreateMeasurementUnit) => http.put(`units/${id}`, data),

  delete: (id: string) => http.delete(`units/${id}`),
};
