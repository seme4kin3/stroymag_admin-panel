import { http } from './http';
import type { CategoryDto, CreateCategory, CreateCategoryResponse } from '../models/category';
import type { CategoryDetailsDto } from '../models/categoryDetails';

function buildCreateCategoryFormData(data: CreateCategory, image?: File | null) {
  const form = new FormData();

  form.append('name', data.name);
  if (data.parentId) form.append('parentId', data.parentId);
  if (data.slug) form.append('slug', data.slug);

  form.append('attributesJson', JSON.stringify(data.attributes ?? []));

  if (image) form.append('image', image, image.name);

  return form;
}

export const CategoriesApi = {
  getPaged: (page = 1, pageSize = 50) =>
    http.get<{ items: CategoryDto[]; total: number }>('categories', {
      params: { page, pageSize },
    }),

  getDetails: (id: string) => http.get<CategoryDetailsDto>(`categories/${id}`),

  createMultipart: (data: CreateCategory, image?: File | null) => {
    const form = buildCreateCategoryFormData(data, image);
    return http.post<CreateCategoryResponse>('categories', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  update: (id: string, data: CreateCategory) => http.put<void>(`categories/${id}`, data),

  delete: (id: string) => http.delete<void>(`categories/${id}`),

  uploadImage: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file, file.name);

    return http.post<void>(`categories/${id}/image`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteImage: (id: string) => http.delete<void>(`categories/${id}/image`),
};
