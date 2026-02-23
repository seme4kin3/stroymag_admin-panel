import type { AttributeDataType } from './attribute';

export interface ProductAttributeValueDto {
  attributeDefinitionId: string;
  attributeName: string;
  attributeKey: string;
  dataType: AttributeDataType; // 0|1|2|3
  stringValue: string | null;
  numericValue: number | null; // decimal
  boolValue: boolean | null;
}

export interface ProductAdminListItemDto {
  id: string;
  sku: string;
  article: string;
  name: string;
  description: string;

  brandId: string;
  brandName: string;

  categoryId: string;
  categoryName: string;
  categorySlug: string | null;

  unitId: string;
  unitName: string;
  unitSymbol: string;

  price: number;
  recommendedRetailPrice: number | null;
  hasStock: boolean;

  attributes: ProductAttributeValueDto[];
  advantages: string[];
  complectation: string[];
  images: ProductAdminImageDto[];
}

export interface ProductAdminPagedResponse {
  items: ProductAdminListItemDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProductAdminUpsertCommand {
  sku: string;
  name: string;
  brandId: string;
  categoryId: string;
  unitId: string;
  price: number;

  description: string | null;
  article: string;
  recommendedRetailPrice: number | null;
  hasStock: boolean;

  attributeValues: Record<string, string>;

  advantages: string[];
  complectation: string[];

  // images: ProductAdminImageDto[];
}

export interface ProductAdminImageDto {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}
