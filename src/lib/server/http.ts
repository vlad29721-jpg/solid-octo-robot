import { randomUUID } from "node:crypto";
import { ZodError, type ZodType } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = "HttpError";
  }
}

export function newId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new HttpError(400, "Некорректный JSON-запрос.");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path.join(".");
    throw new HttpError(400, `${path ? `${path}: ` : ""}${first?.message ?? "Ошибка валидации."}`, "VALIDATION");
  }
  return result.data;
}

export function apiError(error: unknown): Response {
  if (error instanceof HttpError) {
    return Response.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return Response.json({ error: error.issues[0]?.message ?? "Ошибка валидации.", code: "VALIDATION" }, { status: 400 });
  }
  console.error("[D&D Master Hub API]", error);
  const message = error instanceof Error ? error.message : "Неизвестная ошибка сервера.";
  return Response.json({ error: message, code: "INTERNAL" }, { status: 500 });
}
