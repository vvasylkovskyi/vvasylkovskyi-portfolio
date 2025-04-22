export type GenericResponse<T> = {
  data: T | null;
  isLoading: boolean;
  detail?: string | null;
  errorDetail?: string | null;
};
