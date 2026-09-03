import { Role, UserRole } from "../../../domain/role/entities/role";
import { PrismaRoleRepository } from "../../../infrastructure/database/prisma/repositories/prismaRoleRepository";
import { GraphQLContext, requireAuth } from "../context";

type RoleInput = { id: string; name?: string; level?: number };

const roleRepo = new PrismaRoleRepository();

const ROLE_MANAGERS: ReadonlySet<UserRole> = new Set([UserRole.MASTER, UserRole.ADMIN]);

function requireRoleManager(ctx: GraphQLContext) {
  const jwt = requireAuth(ctx);
  if (!ROLE_MANAGERS.has(jwt.role as UserRole)) {
    throw new Error("Forbidden.");
  }
}

function toGraphQL(role: Role) {
  return { id: role.getId, name: role.getName, level: role.getLevel };
}

export const roleResolvers = {
  Query: {
    roles: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const roles = await roleRepo.roles();
      return roles.map(toGraphQL);
    },
    role: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      const role = await roleRepo.findById(id);
      return role ? toGraphQL(role) : null;
    },
  },
  Mutation: {
    updateRole: async (_: unknown, { id, name, level }: RoleInput, ctx: GraphQLContext) => {
      requireRoleManager(ctx);

      const existing = await roleRepo.findById(id);
      if (!existing) {
        throw new Error("Role not found.");
      }

      const updated = Role.from({
        id: existing.getId,
        name: name ?? existing.getName,
        level: level ?? existing.getLevel,
      });

      const saved = await roleRepo.save(updated);
      return toGraphQL(saved);
    },
    deleteRole: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      requireRoleManager(ctx);

      const existing = await roleRepo.findById(id);
      if (!existing) return false;

      await roleRepo.deleteById(id);
      return true;
    },
  },
};
