export type Account = { id: string; name: string; phone: string; plan: string };
export type Challenge = {
  challengeId: string;
  expiresIn: number;
  resendAfter: number;
  development: boolean;
};
export type Login = { token: string; expiresIn: number; account: Account };
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export async function api<T>(
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const response = await fetch("/api/business" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(
      response.status,
      data.message || "Unable to complete the request. Please try again.",
    );
  return data as T;
}
