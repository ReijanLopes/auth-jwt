import { z } from "zod";

const passwordSchema = z
  .string()
  .regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*]{8,}$/);

export function isValidPassword(password: string): boolean {
  return passwordSchema.safeParse(password).success;
}