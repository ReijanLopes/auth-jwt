import { Role } from "../entities/role";

export interface RoleRepository {
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  roles(): Promise<Role[]>;
  // delete(id: string): Promise<void>;
  // update(name: string, level: number): Promise<Role>;
  // save(role: Role): Promise<Role>;
}