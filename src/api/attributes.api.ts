import { http } from './http';
import type { AttributeDto, CreateAttribute } from '../models/attribute';

export const AttributesApi = {
  getPaged: (page = 1, pageSize = 50, name?: string) =>
    http.get<{ items: AttributeDto[]; total: number }>('attributes', {
      params: { page, pageSize, name },
    }),

  create: (data: CreateAttribute) => http.post('attributes', data),

  update: (id: string, data: CreateAttribute) => http.put(`attributes/${id}`, data),

  delete: (id: string) => http.delete(`attributes/${id}`),
};
