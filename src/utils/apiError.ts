import axios from 'axios';

interface ValidationDetail {
  // бекенд отдаёт PascalCase
  PropertyName?: string;
  ErrorMessage?: string;
  // camelCase на всякий случай
  propertyName?: string;
  errorMessage?: string;
}

interface ApiErrorBody {
  error?: string;
  message?: string;
  details?: ValidationDetail[];
}

export function parseApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorBody | undefined;
    if (data) {
      if (data.error === 'ValidationFailed' && Array.isArray(data.details)) {
        return data.details
          .map((d) => d.ErrorMessage ?? d.errorMessage)
          .filter(Boolean)
          .join('; ');
      }
      if (data.message) {
        return data.message;
      }
    }
  }
  return 'Произошла ошибка. Попробуйте ещё раз.';
}
