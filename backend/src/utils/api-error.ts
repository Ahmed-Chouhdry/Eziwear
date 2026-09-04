export class ApiError extends Error {
  readonly statusCode: number;
  readonly errors?: Record<string, string[]>;
  readonly expose: boolean;

  constructor(
    statusCode: number,
    message: string,
    options?: { errors?: Record<string, string[]>; expose?: boolean },
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = options?.errors;
    this.expose = options?.expose ?? statusCode < 500;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = 'Bad request', errors?: Record<string, string[]>) {
    return new ApiError(400, message, { errors });
  }
  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'You do not have permission to do that') {
    return new ApiError(403, message);
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }
  static conflict(message = 'Resource already exists') {
    return new ApiError(409, message);
  }
  static tooMany(message = 'Too many requests') {
    return new ApiError(429, message);
  }
  static internal(message = 'Something went wrong') {
    return new ApiError(500, message, { expose: false });
  }
}
