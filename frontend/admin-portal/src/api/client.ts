/** Shared transport: bearer tokens are never logged or added to URLs. */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}
export async function getAuthorized<T>(
  path: string,
  token: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    headers: { Authorization: `Bearer ${token}` },
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new ApiError(
      response.status,
      response.status === 403
        ? "This account does not have Voxel Fashion admin access."
        : response.status === 401
          ? "Your session has expired. Please sign in again."
          : "The admin service is unavailable. Please try again.",
    );
  return response.json() as Promise<T>;
}
