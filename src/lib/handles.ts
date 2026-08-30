export const HANDLE_PATTERN = /^[a-z0-9_-]{3,32}$/

export const RESERVED_HANDLES = new Set([
  "admin",
  "api",
  "support",
  "postmaster",
  "abuse",
  "noreply",
  "root",
  "system",
  "agent"
])

export function normalizeHandle(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase().trim() : ""
}

export function isValidHandle(handle: string): boolean {
  return HANDLE_PATTERN.test(handle)
}

export function isReservedHandle(handle: string): boolean {
  return RESERVED_HANDLES.has(handle)
}
