export function isValidKey<T extends object>(
  obj: T,
  value: any
): value is keyof T {
  return Object.keys(obj).includes(value);
}