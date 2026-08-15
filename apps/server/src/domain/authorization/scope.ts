import { UserRole } from "../role/entities/role";
import { AccessContext, CompanyNode, DepartmentNode, ResourceType } from "./types";

/** Roles cujo escopo de empresa pode ir além da própria empresa. */
const ORG_WIDE_ROLES: ReadonlySet<UserRole> = new Set([
  UserRole.MASTER,
  UserRole.ADMIN,
  UserRole.MANAGER,
]);

export type CompanyScopeResult = {
  reachable: boolean;
  /** true quando o alvo é uma franquia da sede do próprio usuário. */
  crossCompany: boolean;
};

/**
 * Escopo de empresa (seção 4). Sede + role org-wide (MASTER, ADMIN, e — por
 * decisão do usuário — MANAGER em modo leitura) alcança as próprias
 * franquias; qualquer outro caso fica preso à própria empresa. Uma franquia
 * nunca alcança a sede nem outra franquia.
 */
export function companyScope(
  ctx: AccessContext,
  targetCompanyId: string,
  companies: CompanyNode[],
): CompanyScopeResult {
  if (targetCompanyId === ctx.company.id) {
    return { reachable: true, crossCompany: false };
  }

  const iAmHeadquarters = ctx.company.parentId === null;
  if (!iAmHeadquarters || !ORG_WIDE_ROLES.has(ctx.role)) {
    return { reachable: false, crossCompany: false };
  }

  const target = companies.find((c) => c.id === targetCompanyId);
  if (target && target.parentId === ctx.company.id) {
    return { reachable: true, crossCompany: true };
  }

  return { reachable: false, crossCompany: false };
}

/** true quando `targetId` é o próprio `rootId` ou um descendente dele na árvore. */
function isSelfOrDescendant(
  rootId: string,
  targetId: string,
  departments: DepartmentNode[],
): boolean {
  if (targetId === rootId) return true;

  const byId = new Map(departments.map((d) => [d.id, d]));
  const visited = new Set<string>();
  let current = byId.get(targetId);

  while (current && current.parentId !== null) {
    if (visited.has(current.id)) return false; // guarda contra ciclos
    visited.add(current.id);
    if (current.parentId === rootId) return true;
    current = byId.get(current.parentId);
  }

  return false;
}

/**
 * Escopo de departamento (seção 4). Só faz sentido dentro da mesma empresa —
 * departamentos de franquia nunca são descendentes do departamento de um
 * usuário da sede, então esta função não deve ser chamada no caso
 * `crossCompany`.
 *
 * Caso especial (seção 6): o alcance de `stock` do SUPERVISOR é só o
 * próprio departamento — diferente de `department`/`employee`, onde ele
 * (como o MANAGER) alcança a subárvore inteira.
 */
export function departmentScope(
  ctx: AccessContext,
  targetDepartmentId: string,
  departments: DepartmentNode[],
  resourceType: ResourceType,
): boolean {
  switch (ctx.role) {
    case UserRole.MASTER:
    case UserRole.ADMIN:
      return true;
    case UserRole.MANAGER:
      return isSelfOrDescendant(ctx.departmentId, targetDepartmentId, departments);
    case UserRole.SUPERVISOR:
      if (resourceType === "stock") {
        return targetDepartmentId === ctx.departmentId;
      }
      return isSelfOrDescendant(ctx.departmentId, targetDepartmentId, departments);
    case UserRole.EMPLOYEE:
      return targetDepartmentId === ctx.departmentId;
  }
}
