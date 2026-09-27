/** Domain error carrying an HTTP status and a stable, translatable code (`errors.<code>`). */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public details?: unknown
  ) {
    super(code);
    this.name = "ApiError";
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;
