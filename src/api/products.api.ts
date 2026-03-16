// api/products.api.ts
import { http } from './http';
import type {
  ProductAdminPagedResponse,
  ProductAdminListItemDto,
  ProductAdminUpsertCommand,
} from '../models/product';

export const ProductsApi = {
  getPaged: (page = 1, pageSize = 50, name?: string, article?: string, barcode?: string) =>
    http.get<ProductAdminPagedResponse>('products', { params: { page, pageSize, name, article, barcode } }),

  getById: (id: string) => http.get<ProductAdminListItemDto>(`products/${id}`),

  create: (data: ProductAdminUpsertCommand) => http.post<{ id: string }>('products', data),

  update: (id: string, data: ProductAdminUpsertCommand) => http.put(`products/${id}`, data),

  delete: (id: string) => http.delete(`products/${id}`),

  uploadImages: (productId: string, files: File[], mainFlags: boolean[]) => {
    const fd = new FormData();
    for (let i = 0; i < files.length; i++) {
      fd.append('files', files[i]);
      fd.append('main', mainFlags[i] ? 'true' : 'false'); // важно: имя поля "main"
    }
    return http.post<void>(`products/${productId}/images`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  replaceImages: (productId: string, files: File[], mainFlags: boolean[]) => {
    const fd = new FormData();
    for (let i = 0; i < files.length; i++) {
      fd.append('files', files[i]);
      fd.append('main', mainFlags[i] ? 'true' : 'false');
    }
    return http.put<void>(`products/${productId}/images`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
