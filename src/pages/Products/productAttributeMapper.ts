import type { ProductAttributeValueDto } from '../../models/product';

export function attrValueToString(a: ProductAttributeValueDto): string | null {
  // String
  if (a.dataType === 0) {
    const v = (a.stringValue ?? '').trim();
    return v.length ? v : null;
  }

  // Integer / Decimal
  if (a.dataType === 1 || a.dataType === 2) {
    if (a.numericValue === null || Number.isNaN(a.numericValue)) return null;
    return String(a.numericValue); // строго с точкой
  }

  // Boolean
  if (a.dataType === 3) {
    if (a.boolValue === null) return null;
    return a.boolValue ? 'true' : 'false';
  }

  return null;
}

/**
 * ✅ КЛЮЧ = attributeDefinitionId (GUID)
 */
export function buildAttributeValuesMap(attrs: ProductAttributeValueDto[]): Record<string, string> {
  const result: Record<string, string> = {};

  for (const a of attrs) {
    const key = (a.attributeDefinitionId ?? '').trim();
    if (!key) continue;

    const value = attrValueToString(a);
    if (value === null) continue;

    result[key] = value;
  }

  return result;
}
