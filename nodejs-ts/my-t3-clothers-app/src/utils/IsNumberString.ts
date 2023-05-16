export function isConvertibleToNumber(str: string): boolean {
  return !isNaN(Number(str));
}
