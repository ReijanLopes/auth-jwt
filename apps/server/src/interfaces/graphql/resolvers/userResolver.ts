import { canAccess } from "../../../domain/authorization/authorizationPolicy";
import { EmployeeResource } from "../../../domain/authorization/types";
import { User } from "../../../domain/user/entities/user";
import { PrismaUserRepository } from "../../../infrastructure/database/prisma/repositories/prismaUserRepository";
import { loadAccessContext, loadOrgTrees } from "../authorization";
import { GraphQLContext } from "../context";

const userRepo = new PrismaUserRepository();

function toEmployeeResource(user: User, accessUserId: string): EmployeeResource {
  return {
    type: "employee",
    id: user.getId,
    companyId: user.getCompanyId,
    departmentId: user.getDepartmentId,
    level: user.getRole.getLevel,
    isSelf: user.getId === accessUserId,
  };
}

function toGraphQL(user: User) {
  return {
    id: user.getId,
    name: user.getName,
    email: user.getEmail,
    phone: user.getPhone,
    taxId: user.getTaxId,
    role: {
      id: user.getRole.getId,
      name: user.getRole.getName,
      level: user.getRole.getLevel,
    },
    media: user.getMedia
      ? { id: user.getMedia.getId, url: user.getMedia.getUrl, type: user.getMedia.getType }
      : null,
    isActive: user.getIsActive,
    createdAt: user.getCreatedAt.toISOString(),
    updatedAt: user.getUpdatedAt.toISOString(),
  };
}

export const userResolvers = {
  Query: {
    users: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const access = await loadAccessContext(ctx);
      const trees = await loadOrgTrees(access);

      const users = await userRepo.findAll();
      return users
        .filter((user) => canAccess(access, toEmployeeResource(user, access.userId), "read", trees))
        .map(toGraphQL);
    },
    user: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const user = await userRepo.findById(id);
      if (!user) return null;

      const access = await loadAccessContext(ctx);
      const trees = await loadOrgTrees(access);
      if (!canAccess(access, toEmployeeResource(user, access.userId), "read", trees)) {
        throw new Error("Forbidden.");
      }

      return toGraphQL(user);
    },
  },
};
