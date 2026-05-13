export function asNumber(value: FormDataEntryValue | null): number {
  return Number(String(value ?? '0').replace(/[,\s]/g, '')) || 0
}

export function asString(value: FormDataEntryValue | null): string {
  return String(value ?? '').trim()
}

export function asOptionalString(value: FormDataEntryValue | null): string | null {
  const result = asString(value)
  return result.length > 0 ? result : null
}
