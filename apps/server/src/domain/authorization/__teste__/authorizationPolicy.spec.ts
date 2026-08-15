import { describe, expect, it } from "@jest/globals";
import { UserRole } from "../../role/entities/role";
import { canAccess } from "../authorizationPolicy";
import { AccessContext, CompanyNode, DepartmentNode, OrgTrees, Resource } from "../types";

// ── Fixtures ─────────────────────────────────────────────────────────────
// Sede (hq) com dois ramos de departamento; duas franquias (franchiseA,
// franchiseB), cada uma com sua própria árvore de departamentos.

const companies: CompanyNode[] = [
  { id: "hq", parentId: null },
  { id: "franchiseA", parentId: "hq" },
  { id: "franchiseB", parentId: "hq" },
];

const departments: DepartmentNode[] = [
  { id: "hq-root", companyId: "hq", parentId: null },
  { id: "hq-sales", companyId: "hq", parentId: "hq-root" },
  { id: "hq-sales-sub", companyId: "hq", parentId: "hq-sales" },
  { id: "hq-other", companyId: "hq", parentId: "hq-root" },
  { id: "fa-root", companyId: "franchiseA", parentId: null },
  { id: "fa-stock-dept", companyId: "franchiseA", parentId: "fa-root" },
];

const trees: OrgTrees = { companies, departments };

const RoleLevel: Record<UserRole, number> = {
  [UserRole.MASTER]: 5,
  [UserRole.ADMIN]: 4,
  [UserRole.MANAGER]: 3,
  [UserRole.SUPERVISOR]: 2,
  [UserRole.EMPLOYEE]: 1,
};

function ctx(
  role: UserRole,
  company: CompanyNode,
  departmentId: string,
  overrides: Partial<AccessContext> = {},
): AccessContext {
  return {
    userId: "accessor",
    company,
    role,
    level: RoleLevel[role],
    departmentId,
    ...overrides,
  };
}

const hq = companies[0];
const franchiseA = companies[1];

function employee(
  overrides: Partial<Extract<Resource, { type: "employee" }>> = {},
): Resource {
  return {
    type: "employee",
    id: "target-user",
    companyId: "hq",
    departmentId: "hq-sales",
    level: RoleLevel[UserRole.EMPLOYEE],
    isSelf: false,
    ...overrides,
  };
}

describe("canAccess", () => {
  // ── MASTER ─────────────────────────────────────────────────────────────
  describe("MASTER", () => {
    const master = ctx(UserRole.MASTER, hq, "hq-root");

    it("reads and writes the headquarters company", () => {
      const sede: Resource = { type: "company", id: "hq", parentId: null };
      expect(canAccess(master, sede, "read", trees)).toBe(true);
      expect(canAccess(master, sede, "write", trees)).toBe(true);
    });

    it("reads and writes a franchise company", () => {
      const franchise: Resource = { type: "company", id: "franchiseA", parentId: "hq" };
      expect(canAccess(master, franchise, "write", trees)).toBe(true);
    });

    it("reads and writes any department, including outside its own branch", () => {
      const dept: Resource = { type: "department", id: "hq-other", companyId: "hq" };
      expect(canAccess(master, dept, "write", trees)).toBe(true);
    });

    it("writes an employee at the same level (MASTER writes anyone)", () => {
      const peer = employee({ level: RoleLevel[UserRole.MASTER] });
      expect(canAccess(master, peer, "write", trees)).toBe(true);
    });

    it("reads and writes stock anywhere in scope", () => {
      const stock: Resource = { type: "stock", id: "s1", companyId: "franchiseA", departmentId: "fa-stock-dept" };
      expect(canAccess(master, stock, "write", trees)).toBe(true);
    });
  });

  // ── ADMIN ──────────────────────────────────────────────────────────────
  describe("ADMIN", () => {
    const adminAtHq = ctx(UserRole.ADMIN, hq, "hq-root");
    const adminAtFranchise = ctx(UserRole.ADMIN, franchiseA, "fa-root");

    it("cannot write the headquarters company", () => {
      const sede: Resource = { type: "company", id: "hq", parentId: null };
      expect(canAccess(adminAtHq, sede, "write", trees)).toBe(false);
    });

    it("can read the headquarters company", () => {
      const sede: Resource = { type: "company", id: "hq", parentId: null };
      expect(canAccess(adminAtHq, sede, "read", trees)).toBe(true);
    });

    it("Admin at HQ has full read/write reach into a franchise (not read-only)", () => {
      const franchiseDept: Resource = { type: "department", id: "fa-stock-dept", companyId: "franchiseA" };
      expect(canAccess(adminAtHq, franchiseDept, "write", trees)).toBe(true);
    });

    it("Admin based in a franchise cannot reach the headquarters at all", () => {
      const sede: Resource = { type: "company", id: "hq", parentId: null };
      expect(canAccess(adminAtFranchise, sede, "read", trees)).toBe(false);
    });

    it("Admin does not write a peer Admin, but reads them", () => {
      const peerAdmin = employee({ level: RoleLevel[UserRole.ADMIN] });
      expect(canAccess(adminAtHq, peerAdmin, "read", trees)).toBe(true);
      expect(canAccess(adminAtHq, peerAdmin, "write", trees)).toBe(false);
    });

    it("Admin has no access at all to a Master", () => {
      const master = employee({ level: RoleLevel[UserRole.MASTER] });
      expect(canAccess(adminAtHq, master, "read", trees)).toBe(false);
      expect(canAccess(adminAtHq, master, "write", trees)).toBe(false);
    });
  });

  // ── MANAGER ────────────────────────────────────────────────────────────
  describe("MANAGER", () => {
    const managerAtHqSales = ctx(UserRole.MANAGER, hq, "hq-sales");
    const managerAtFranchise = ctx(UserRole.MANAGER, franchiseA, "fa-root");

    it("reads but never writes its own company", () => {
      const company: Resource = { type: "company", id: "hq", parentId: null };
      expect(canAccess(managerAtHqSales, company, "read", trees)).toBe(true);
      expect(canAccess(managerAtHqSales, company, "write", trees)).toBe(false);
    });

    it("reads and writes departments within its own branch (self + descendants)", () => {
      const own: Resource = { type: "department", id: "hq-sales", companyId: "hq" };
      const descendant: Resource = { type: "department", id: "hq-sales-sub", companyId: "hq" };
      expect(canAccess(managerAtHqSales, own, "write", trees)).toBe(true);
      expect(canAccess(managerAtHqSales, descendant, "write", trees)).toBe(true);
    });

    it("cannot reach a sibling branch in the same company", () => {
      const sibling: Resource = { type: "department", id: "hq-other", companyId: "hq" };
      expect(canAccess(managerAtHqSales, sibling, "read", trees)).toBe(false);
    });

    it("HQ Manager reads a franchise's company/department/employee/stock", () => {
      const franchiseCompany: Resource = { type: "company", id: "franchiseA", parentId: "hq" };
      const franchiseDept: Resource = { type: "department", id: "fa-stock-dept", companyId: "franchiseA" };
      const franchiseEmployee = employee({
        companyId: "franchiseA",
        departmentId: "fa-stock-dept",
        level: RoleLevel[UserRole.EMPLOYEE],
      });
      const franchiseStock: Resource = {
        type: "stock",
        id: "s1",
        companyId: "franchiseA",
        departmentId: "fa-stock-dept",
      };

      expect(canAccess(managerAtHqSales, franchiseCompany, "read", trees)).toBe(true);
      expect(canAccess(managerAtHqSales, franchiseDept, "read", trees)).toBe(true);
      expect(canAccess(managerAtHqSales, franchiseEmployee, "read", trees)).toBe(true);
      expect(canAccess(managerAtHqSales, franchiseStock, "read", trees)).toBe(true);
    });

    it("HQ Manager can NEVER write into a franchise, even resources it could write at home", () => {
      const franchiseDept: Resource = { type: "department", id: "fa-stock-dept", companyId: "franchiseA" };
      const franchiseEmployee = employee({
        companyId: "franchiseA",
        departmentId: "fa-stock-dept",
        level: RoleLevel[UserRole.EMPLOYEE],
      });

      expect(canAccess(managerAtHqSales, franchiseDept, "write", trees)).toBe(false);
      expect(canAccess(managerAtHqSales, franchiseEmployee, "write", trees)).toBe(false);
    });

    it("HQ Manager still respects the level filter on franchise employees", () => {
      const franchiseAdmin = employee({
        companyId: "franchiseA",
        departmentId: "fa-stock-dept",
        level: RoleLevel[UserRole.ADMIN], // acima do nível do Manager
      });
      expect(canAccess(managerAtHqSales, franchiseAdmin, "read", trees)).toBe(false);
    });

    it("Manager based in a franchise cannot reach the headquarters nor another franchise", () => {
      const sede: Resource = { type: "company", id: "hq", parentId: null };
      const otherFranchise: Resource = { type: "company", id: "franchiseB", parentId: "hq" };
      expect(canAccess(managerAtFranchise, sede, "read", trees)).toBe(false);
      expect(canAccess(managerAtFranchise, otherFranchise, "read", trees)).toBe(false);
    });
  });

  // ── SUPERVISOR ─────────────────────────────────────────────────────────
  describe("SUPERVISOR", () => {
    const supervisorAtSales = ctx(UserRole.SUPERVISOR, hq, "hq-sales");

    it("reads its own branch but never the department above it", () => {
      const own: Resource = { type: "department", id: "hq-sales", companyId: "hq" };
      const descendant: Resource = { type: "department", id: "hq-sales-sub", companyId: "hq" };
      const above: Resource = { type: "department", id: "hq-root", companyId: "hq" };

      expect(canAccess(supervisorAtSales, own, "read", trees)).toBe(true);
      expect(canAccess(supervisorAtSales, descendant, "read", trees)).toBe(true);
      expect(canAccess(supervisorAtSales, above, "read", trees)).toBe(false);
    });

    it("never writes a department, even its own", () => {
      const own: Resource = { type: "department", id: "hq-sales", companyId: "hq" };
      expect(canAccess(supervisorAtSales, own, "write", trees)).toBe(false);
    });

    it("reads stock only in its own department, not in descendants", () => {
      const ownStock: Resource = { type: "stock", id: "s1", companyId: "hq", departmentId: "hq-sales" };
      const descendantStock: Resource = {
        type: "stock",
        id: "s2",
        companyId: "hq",
        departmentId: "hq-sales-sub",
      };
      expect(canAccess(supervisorAtSales, ownStock, "read", trees)).toBe(true);
      expect(canAccess(supervisorAtSales, descendantStock, "read", trees)).toBe(false);
    });

    it("reads and writes employees below its level within its branch", () => {
      const below = employee({ level: RoleLevel[UserRole.EMPLOYEE], departmentId: "hq-sales-sub" });
      expect(canAccess(supervisorAtSales, below, "write", trees)).toBe(true);
    });

    it("only reads (never writes) a peer at the same level", () => {
      const peer = employee({ level: RoleLevel[UserRole.SUPERVISOR] });
      expect(canAccess(supervisorAtSales, peer, "read", trees)).toBe(true);
      expect(canAccess(supervisorAtSales, peer, "write", trees)).toBe(false);
    });
  });

  // ── EMPLOYEE ───────────────────────────────────────────────────────────
  describe("EMPLOYEE", () => {
    const employeeCtx = ctx(UserRole.EMPLOYEE, hq, "hq-sales", { userId: "self" });

    it("reads only its own record", () => {
      const self = employee({ id: "self", isSelf: true, level: RoleLevel[UserRole.EMPLOYEE] });
      expect(canAccess(employeeCtx, self, "read", trees)).toBe(true);
    });

    it("never reads another Employee at the same level", () => {
      const peer = employee({ id: "peer", isSelf: false, level: RoleLevel[UserRole.EMPLOYEE] });
      expect(canAccess(employeeCtx, peer, "read", trees)).toBe(false);
    });

    it("has no access to company, department, or stock", () => {
      const company: Resource = { type: "company", id: "hq", parentId: null };
      const dept: Resource = { type: "department", id: "hq-sales", companyId: "hq" };
      const stock: Resource = { type: "stock", id: "s1", companyId: "hq", departmentId: "hq-sales" };

      expect(canAccess(employeeCtx, company, "read", trees)).toBe(false);
      expect(canAccess(employeeCtx, dept, "read", trees)).toBe(false);
      expect(canAccess(employeeCtx, stock, "read", trees)).toBe(false);
    });
  });
});
