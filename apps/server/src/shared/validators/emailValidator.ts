import { z } from "zod";

export function isValidEmail(email: string): boolean {
    const emailSchema = z.string().email();
  return emailSchema.safeParse(email).success;
}