export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function notFoundError(
  message = "We couldn't find that poll. The link may be wrong, or the poll may have been removed.",
) {
  return new ApiError(404, "not_found", message);
}

export function unauthorizedError(
  message = "You don't have access to do that. Try opening the link you were given again.",
) {
  return new ApiError(401, "unauthorized", message);
}

export function forbiddenError(
  message = "You don't have permission to do that.",
) {
  return new ApiError(403, "forbidden", message);
}

export function badRequestError(message: string) {
  return new ApiError(400, "bad_request", message);
}

export function conflictError(message: string) {
  return new ApiError(409, "conflict", message);
}

export function tooManyRequestsError(
  message = "Too many attempts. Please wait a few minutes and try again.",
) {
  return new ApiError(429, "rate_limited", message);
}
