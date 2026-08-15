import { UserRole } from "../role/entities/role";
import { AccessContext, Action, EmployeeResource } from "./types";

/**
 * Filtro de nível sobre pessoas (seção 3), aplicado por cima do escopo.
 *
 * - alvo acima do meu nível → nada (nem leio)
 * - alvo no mesmo nível → só leio
 * - alvo abaixo do meu nível → leio e escrevo
 * - MASTER → escreve qualquer um
 * - EMPLOYEE é exceção: só acessa o próprio registro, mesmo alvos abaixo
 *   (não existe nível abaixo de EMPLOYEE, mas a regra vale por clareza)
 */
export function levelFilterAllows(
  ctx: AccessContext,
  resource: EmployeeResource,
  action: Action,
): boolean {
  if (ctx.role === UserRole.EMPLOYEE) {
    return resource.isSelf;
  }

  if (ctx.role === UserRole.MASTER) {
    return true;
  }

  if (resource.level > ctx.level) return false;
  if (resource.level === ctx.level) return action === "read";
  return true; // resource.level < ctx.level
}
