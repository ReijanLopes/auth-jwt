import { z } from "zod";

const lengthSchema = z.string().min(3);

export function isValidLength(text: string): boolean {
  return !lengthSchema.safeParse(text?.trim() ?? "").success;
}