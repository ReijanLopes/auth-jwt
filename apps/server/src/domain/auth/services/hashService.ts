import bcrypt from "bcrypt";
import { createHash } from "crypto";

export interface HashService {
  hashBcrypt(plain: string): Promise<string>;
  hashSha256(plain: string): string;
  compareBcrypt(plain: string, hashed: string): Promise<boolean>;
}

export class BcryptHashService implements HashService {
  private readonly SALT_ROUNDS = 12;

  async hashBcrypt(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.SALT_ROUNDS);
  }

  hashSha256(plain: string): string {
    return createHash("sha256").update(plain).digest("hex");
  }

  async compareBcrypt(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}