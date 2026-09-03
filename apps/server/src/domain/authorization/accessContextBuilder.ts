import { CompanyRepository } from "../company/repositories/companyRepository";
import { DepartmentRepository } from "../department/repositories/departmentRepository";
import { UserRole } from "../role/entities/role";
import { UserRepository } from "../user/repositories/userRepository";
import { AccessContext, OrgTrees } from "./types";

/**
 * Monta o AccessContext a partir do banco (não do JWT, que só carrega
 * `sub`+`role`) para sempre refletir o estado atual do usuário — empresa,
 * departamento e nível podem mudar depois do token ser emitido.
 */
export async function buildAccessContext(
  userId: string,
  deps: { userRepo: UserRepository; companyRepo: CompanyRepository },
): Promise<AccessContext> {
  const user = await deps.userRepo.findById(userId);
  if (!user) {
    throw new Error("User not found.");
  }

  const company = await deps.companyRepo.findById(user.getCompanyId);
  if (!company) {
    throw new Error("Company not found.");
  }

  return {
    userId: user.getId,
    company: { id: company.getId, parentId: company.getParentId },
    role: user.getRole.getName as UserRole,
    level: user.getRole.getLevel,
    departmentId: user.getDepartmentId,
  };
}

/**
 * Monta as árvores necessárias para `canAccess`. A árvore de empresas só
 * importa quando o usuário é da sede (único caso em que `companyScope`
 * alcança fora da própria empresa); a árvore de departamentos é sempre a da
 * própria empresa, o suficiente porque `departmentScope` nunca é chamado
 * fora dela.
 */
export async function buildOrgTrees(
  access: AccessContext,
  deps: { companyRepo: CompanyRepository; departmentRepo: DepartmentRepository },
): Promise<OrgTrees> {
  const isHeadquarters = access.company.parentId === null;

  const companies = isHeadquarters
    ? (await deps.companyRepo.findByHeadquartersId(access.company.id)).map((c) => ({
        id: c.getId,
        parentId: c.getParentId,
      }))
    : [access.company];

  const departments = await deps.departmentRepo.findByCompanyId(access.company.id);

  return {
    companies,
    departments: departments.map((d) => ({
      id: d.getId,
      companyId: d.getCompanyId,
      parentId: d.getParentId,
    })),
  };
}
