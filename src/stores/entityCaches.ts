import { createEntityCache } from '../shared/cache/entityCache';

import { CategoriesApi } from '../api/categories.api';
import { BrandsApi } from '../api/brands.api';
import { UnitsApi } from '../api/units.api';
import { AttributesApi } from '../api/attributes.api';

import type { CategoryDto } from '../models/category';
import type { Brand } from '../models/brand';
import type { MeasurementUnit } from '../models/unit';
import type { AttributeDto } from '../models/attribute';

export const categoriesCache = createEntityCache<CategoryDto>({
  key: 'categories',
  getId: (x) => x.id,
  fetchList: async () => (await CategoriesApi.getPaged(1, 1000)).data.items,
  ttlMs: 5 * 60 * 1000,
});

export const brandsCache = createEntityCache<Brand>({
  key: 'brands',
  getId: (x) => x.id,
  fetchList: async () => (await BrandsApi.getPaged(1, 1000)).data.items,
});

export const unitsCache = createEntityCache<MeasurementUnit>({
  key: 'units',
  getId: (x) => x.id,
  fetchList: async () => (await UnitsApi.getPaged(1, 1000)).data.items,
});

export const attributesCache = createEntityCache<AttributeDto>({
  key: 'attributes',
  getId: (x) => x.id,
  fetchList: async () => (await AttributesApi.getPaged(1, 1000)).data.items,
});
