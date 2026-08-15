import { UserRole } from "../role/entities/role";
import { CAPABILITY } from "./capability";
import { levelFilterAllows } from "./levelFilter";
import { companyScope, departmentScope } from "./scope";
import { AccessContext, Action, OrgTrees, Resource } from "./types";

function targetCompanyId(resource: Resource): string {
  return resource.type === "company" ? resource.id : resource.companyId;
}

function targetDepartmentId(resource: Resource): string | null {
  if (resource.type === "department") return resource.id;
  if (resource.type === "employee" || resource.type === "stock") {
    return resource.departmentId;
  }
  return null;
}

/**
 * Decisão de acesso (seção 7) — todos os testes precisam passar (AND):
 *   1. escopo de empresa
 *   2. escopo de departamento (quando o recurso tem departmentId, e só
 *      dentro da mesma empresa — departamentos não cruzam empresas)
 *   3. filtro de nível (recursos do tipo `employee`)
 *   4. capacidade da role para o recurso/ação, com duas exceções:
 *      - escrever na sede exige MASTER
 *      - Manager da sede, ao alcançar uma franquia (cross-company), só lê
 */
export function canAccess(
  ctx: AccessContext,
  resource: Resource,
  action: Action,
  trees: OrgTrees,
): boolean {
  const scope = companyScope(ctx, targetCompanyId(resource), trees.companies);
  if (!scope.reachable) return false;

  const deptId = targetDepartmentId(resource);
  if (deptId !== null && !scope.crossCompany) {
    if (!departmentScope(ctx, deptId, trees.departments, resource.type)) return false;
  }

  if (resource.type === "employee") {
    if (!levelFilterAllows(ctx, resource, action)) return false;
  }

  const capability = CAPABILITY[ctx.role][resource.type];
  if (!capability[action]) return false;

  if (
    resource.type === "company" &&
    resource.parentId === null &&
    action === "write" &&
    ctx.role !== UserRole.MASTER
  ) {
    return false;
  }

  if (scope.crossCompany && ctx.role === UserRole.MANAGER && action === "write") {
    return false;
  }

  return true;
}
