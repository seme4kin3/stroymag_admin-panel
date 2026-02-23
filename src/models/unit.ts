export interface MeasurementUnit {
  id: string;
  name: string;
  symbol: string;
  isActive: boolean;
}

export interface CreateMeasurementUnit {
  name: string;
  symbol: string;
}
