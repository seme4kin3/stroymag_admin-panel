export interface CategoryParentDto {
  id: string;
  name: string;
}

export interface CategoryAttributeDto {
  attributeDefinitionId: string;
  attributeName: string;
  attributeKey: string;
  dataType: number;
  unitId: string | null;
  unitName: string | null;
  unitSymbol: string | null;
  isRequired: boolean;
  sortOrder: number;
}

export interface CategoryDetailsDto {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl: string | null;

  parent: CategoryParentDto | null;

  ownAttributes: CategoryAttributeDto[];
  inheritedAttributes: CategoryAttributeDto[];
}
