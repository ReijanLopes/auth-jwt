import { z } from "zod";

const taxIdSchema = z.string().refine((taxId) => {
  const clean = taxId.replace(/\D/g, '');

  if (clean.length !== 11 || /^(\d)\1+$/.test(clean)) {
    return false;
  }

  const digits = clean.split('').map(Number);

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i);
  }

  let first = (sum * 10) % 11;
  if (first >= 10) first = 0;

  if (first !== digits[9]) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * (11 - i);
  }

  let second = (sum * 10) % 11;
  if (second >= 10) second = 0;

  return second === digits[10];
});

export function isValidTaxId(taxId: string): boolean {
  return taxIdSchema.safeParse(taxId).success;
}