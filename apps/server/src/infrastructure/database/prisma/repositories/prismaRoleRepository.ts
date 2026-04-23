import { prisma } from "../client";
import { RoleRepository } from "../../../../domain/role/repositories/roleRepository";
import { Role, UserRole } from "../../../../domain/role/entities/role";

export class PrismaRoleRepository implements RoleRepository {
  async roles(): Promise<Role[]> {
    const records = await prisma.role.findMany();
    return records.map((record) => Role.from({
      id:        record.id,
      name:      record.name,
      level:     record.level,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));
  }

  async findByName(name: UserRole): Promise<Role | null> {
    const record = await prisma.role.findUnique({
      where: { name },
    });

    if (!record) return null;

    return Role.from({
      id:        record.id,
      name:      record.name,
      level:     record.level,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  async findById(id: string): Promise<Role | null> {
    const record = await prisma.role.findUnique({
      where: { id },
    });

    if (!record) return null;

    return Role.from({
      id:        record.id,
      name:      record.name,
      level:     record.level,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}