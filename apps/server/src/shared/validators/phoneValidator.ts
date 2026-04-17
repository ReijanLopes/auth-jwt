import { z } from "zod";

const phoneSchema = z.string().refine((phone) => {
  if (/[a-zA-Z]/.test(phone)) return false;

  const numbersOnly = phone.replace(/\D/g, "");

  if (numbersOnly.length < 10 || numbersOnly.length > 11) {
    return false;
  }

  return /^[0-9()\-\s]+$/.test(phone);
});

export function isValidPhone(phone: string): boolean {
  return phoneSchema.safeParse(phone).success;
}