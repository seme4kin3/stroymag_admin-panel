// src/models/attribute.ts

// String = 0, Integer = 1, Decimal = 2, Boolean = 3
export type AttributeDataType = 0 | 1 | 2 | 3;

export interface AttributeDto {
  id: string;
  name: string;
  key: string;
  dataType: AttributeDataType;
  isActive: boolean;
}

export interface CreateAttribute {
  name: string;
  key?: string | null;
  dataType: AttributeDataType;
}
