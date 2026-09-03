import { buildAccessContext, buildOrgTrees } from "../../domain/authorization/accessContextBuilder";
import { canAccess } from "../../domain/authorization/authorizationPolicy";
import { AccessContext, Action, OrgTrees, Resource } from "../../domain/authorization/types";
import { PrismaCompanyRepository } from "../../infrastructure/database/prisma/repositories/prismaCompanyRepository";
import { PrismaDepartmentRepository } from "../../infrastructure/database/prisma/repositories/prismaDepartmentRepository";
import { PrismaUserRepository } from "../../infrastructure/database/prisma/repositories/prismaUserRepository";
import { GraphQLContext, requireAuth } from "./context";

const userRepo = new PrismaUserRepository();
const companyRepo = new PrismaCompanyRepository();
const departmentRepo = new PrismaDepartmentRepository();

export async function loadAccessContext(ctx: GraphQLContext): Promise<AccessContext> {
  const jwt = requireAuth(ctx);
  return buildAccessContext(jwt.sub, { userRepo, companyRepo });
}

export async function loadOrgTrees(access: AccessContext): Promise<OrgTrees> {
  return buildOrgTrees(access, { companyRepo, departmentRepo });
}

/** Checa um único recurso; lança `Forbidden.` quando o acesso é negado. */
export async function authorize(
  ctx: GraphQLContext,
  resource: Resource,
  action: Action,
): Promise<AccessContext> {
  const access = await loadAccessContext(ctx);
  const trees = await loadOrgTrees(access);

  if (!canAccess(access, resource, action, trees)) {
    throw new Error("Forbidden.");
  }

  return access;
}
