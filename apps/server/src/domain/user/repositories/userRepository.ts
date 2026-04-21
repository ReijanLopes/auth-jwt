import { User } from "../entities/user";

export interface UserRepository {
  save(user: User): Promise<User>;
  findAll(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByTaxId(taxId: string): Promise<User | null>;
}
