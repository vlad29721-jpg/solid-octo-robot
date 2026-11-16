import { useHubStore } from "./store";

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { currentUserId, authToken } = useHubStore.getState();
  const headers = new Headers(init.headers);
  headers.set("x-hub-user-id", currentUserId);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (authToken) headers.set("authorization", `Bearer ${authToken}`);

  const response = await fetch(path, { ...init, headers, cache: "no-store" });
  const payload = await response.json().catch(() => null) as { error?: string; code?: string } | null;
  if (!response.ok) {
    throw new ApiError(payload?.error ?? `Ошибка запроса (${response.status})`, response.status, payload?.code);
  }
  return payload as T;
}
