import { z } from "zod";

const nameSchema = z
  .string()
  .min(3)
  .regex(/^[a-zA-ZÀ-ÿ\s]+$/);

export function isValidName(name: string): boolean {
  return nameSchema.safeParse(name).success;
}