import type { AttributeDataType } from './attribute';

export interface CategoryAttributeViewDto {
  attributeDefinitionId: string;
  attributeName: string;
  attributeKey: string;
  dataType: AttributeDataType;
  unitId: string | null;
  unitName: string | null;
  unitSymbol: string | null;
  isRequired: boolean;
  sortOrder: number;
}

export interface CategoryDto {
  id: string;
  name: string;
  slug?: string | null;
  parentId?: string | null;
  imageUrl?: string | null;
  attributes: CategoryAttributeViewDto[];
}

// то, что мы отправляем на бэкенд при создании/обновлении
export interface CategoryAttributeRequest {
  attributeDefinitionId: string;
  unitId: string | null;
  isRequired: boolean;
  sortOrder: number;
}

export interface CreateCategory {
  name: string;
  slug?: string | null;
  parentId?: string | null;
  attributes: CategoryAttributeRequest[];
}

export interface UploadInstructionDto {
  bucket: string;
  objectKey: string;
  uploadUrl: string;
  expiresAt: string;
}

export interface CreateCategoryResponse {
  id: string;
}
