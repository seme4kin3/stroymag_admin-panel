import { http } from './http';
import type { Brand, CreateBrand } from '../models/brand';

export const BrandsApi = {
  getPaged: (page = 1, pageSize = 50, name?: string) =>
    http.get<{ items: Brand[]; total: number }>('brands', {
      params: { page, pageSize, name },
    }),

  create: (data: CreateBrand) => http.post('brands', data),

  update: (id: string, data: CreateBrand) => http.put(`brands/${id}`, data),

  delete: (id: string) => http.delete(`brands/${id}`),
};
