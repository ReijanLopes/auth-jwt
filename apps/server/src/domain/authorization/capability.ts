import { UserRole } from "../role/entities/role";
import { ResourceType } from "./types";

type CapabilityEntry = { read: boolean; write: boolean };

/**
 * Matriz recurso × ação por role (seção 6 do desenho de autorização).
 *
 * Isto é o "teto" de capacidade da role — ainda precisa passar pelo escopo
 * de empresa/departamento e, para `employee`, pelo filtro de nível (seção 3)
 * antes de virar uma decisão final. Para `employee`, o teto aqui reflete
 * apenas "a role pode, em tese, ler/escrever pessoas" — quem decide o alvo
 * exato é o filtro de nível.
 */
export const CAPABILITY: Record<UserRole, Record<ResourceType, CapabilityEntry>> = {
  [UserRole.MASTER]: {
    company: { read: true, write: true },
    department: { read: true, write: true },
    employee: { read: true, write: true },
    stock: { read: true, write: true },
  },
  [UserRole.ADMIN]: {
    company: { read: true, write: true },
    department: { read: true, write: true },
    employee: { read: true, write: true },
    stock: { read: true, write: true },
  },
  [UserRole.MANAGER]: {
    company: { read: true, write: false },
    department: { read: true, write: true },
    employee: { read: true, write: true },
    stock: { read: true, write: false },
  },
  [UserRole.SUPERVISOR]: {
    company: { read: true, write: false },
    department: { read: true, write: false },
    employee: { read: true, write: true },
    stock: { read: true, write: false },
  },
  [UserRole.EMPLOYEE]: {
    company: { read: false, write: false },
    department: { read: false, write: false },
    employee: { read: true, write: false },
    stock: { read: false, write: false },
  },
};
