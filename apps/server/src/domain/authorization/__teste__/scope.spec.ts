import { describe, expect, it } from "@jest/globals";
import { UserRole } from "../../role/entities/role";
import { companyScope, departmentScope } from "../scope";
import { AccessContext, CompanyNode, DepartmentNode } from "../types";

const hq: CompanyNode = { id: "hq", parentId: null };
const franchiseA: CompanyNode = { id: "franchiseA", parentId: "hq" };
const franchiseB: CompanyNode = { id: "franchiseB", parentId: "hq" };
const companies: CompanyNode[] = [hq, franchiseA, franchiseB];

const departments: DepartmentNode[] = [
  { id: "hq-root", companyId: "hq", parentId: null },
  { id: "hq-sales", companyId: "hq", parentId: "hq-root" },
  { id: "hq-sales-sub", companyId: "hq", parentId: "hq-sales" },
  { id: "hq-other", companyId: "hq", parentId: "hq-root" },
];

function ctx(role: UserRole, company: CompanyNode, departmentId: string): AccessContext {
  return { userId: "accessor", company, role, level: 1, departmentId };
}

describe("companyScope", () => {
  it("is reachable and not cross-company for the accessor's own company", () => {
    const result = companyScope(ctx(UserRole.EMPLOYEE, franchiseA, "any"), "franchiseA", companies);
    expect(result).toEqual({ reachable: true, crossCompany: false });
  });

  it.each([UserRole.MASTER, UserRole.ADMIN, UserRole.MANAGER])(
    "lets an HQ-based %s reach its own franchise, marked cross-company",
    (role) => {
      const result = companyScope(ctx(role, hq, "hq-root"), "franchiseA", companies);
      expect(result).toEqual({ reachable: true, crossCompany: true });
    },
  );

  it.each([UserRole.SUPERVISOR, UserRole.EMPLOYEE])(
    "blocks an HQ-based %s from reaching a franchise (not org-wide)",
    (role) => {
      const result = companyScope(ctx(role, hq, "hq-root"), "franchiseA", companies);
      expect(result).toEqual({ reachable: false, crossCompany: false });
    },
  );

  it("blocks a franchise-based user from reaching the headquarters", () => {
    const result = companyScope(ctx(UserRole.ADMIN, franchiseA, "any"), "hq", companies);
    expect(result).toEqual({ reachable: false, crossCompany: false });
  });

  it("blocks a franchise-based user from reaching a sibling franchise", () => {
    const result = companyScope(ctx(UserRole.MASTER, franchiseA, "any"), "franchiseB", companies);
    expect(result).toEqual({ reachable: false, crossCompany: false });
  });

  it("blocks reaching an unknown company id", () => {
    const result = companyScope(ctx(UserRole.MASTER, hq, "hq-root"), "ghost", companies);
    expect(result).toEqual({ reachable: false, crossCompany: false });
  });
});

describe("departmentScope", () => {
  it.each([UserRole.MASTER, UserRole.ADMIN])(
    "always allows %s regardless of department",
    (role) => {
      expect(departmentScope(ctx(role, hq, "hq-sales"), "hq-other", departments, "department")).toBe(true);
    },
  );

  describe("MANAGER", () => {
    it("allows its own department and any descendant", () => {
      const manager = ctx(UserRole.MANAGER, hq, "hq-sales");
      expect(departmentScope(manager, "hq-sales", departments, "department")).toBe(true);
      expect(departmentScope(manager, "hq-sales-sub", departments, "department")).toBe(true);
    });

    it("blocks a sibling branch", () => {
      const manager = ctx(UserRole.MANAGER, hq, "hq-sales");
      expect(departmentScope(manager, "hq-other", departments, "department")).toBe(false);
    });

    it("also allows the full subtree for stock (no special-case, unlike SUPERVISOR)", () => {
      const manager = ctx(UserRole.MANAGER, hq, "hq-sales");
      expect(departmentScope(manager, "hq-sales-sub", departments, "stock")).toBe(true);
    });
  });

  describe("SUPERVISOR", () => {
    it("allows its own department and descendants for department/employee resources", () => {
      const supervisor = ctx(UserRole.SUPERVISOR, hq, "hq-sales");
      expect(departmentScope(supervisor, "hq-sales", departments, "department")).toBe(true);
      expect(departmentScope(supervisor, "hq-sales-sub", departments, "employee")).toBe(true);
      expect(departmentScope(supervisor, "hq-other", departments, "department")).toBe(false);
    });

    it("restricts stock to exactly its own department, excluding descendants", () => {
      const supervisor = ctx(UserRole.SUPERVISOR, hq, "hq-sales");
      expect(departmentScope(supervisor, "hq-sales", departments, "stock")).toBe(true);
      expect(departmentScope(supervisor, "hq-sales-sub", departments, "stock")).toBe(false);
    });
  });

  describe("EMPLOYEE", () => {
    it("only matches its exact own department, regardless of resource type", () => {
      const employeeCtx = ctx(UserRole.EMPLOYEE, hq, "hq-sales");
      expect(departmentScope(employeeCtx, "hq-sales", departments, "employee")).toBe(true);
      expect(departmentScope(employeeCtx, "hq-sales-sub", departments, "employee")).toBe(false);
    });
  });

  it("returns false for an unknown target department id (walk hits a dead end)", () => {
    const manager = ctx(UserRole.MANAGER, hq, "hq-sales");
    expect(departmentScope(manager, "ghost", departments, "department")).toBe(false);
  });

  it("does not blow up on a cyclic department tree (guards against infinite loop)", () => {
    const cyclic: DepartmentNode[] = [
      { id: "a", companyId: "hq", parentId: "b" },
      { id: "b", companyId: "hq", parentId: "a" },
    ];
    const manager = ctx(UserRole.MANAGER, hq, "root-not-in-cycle");
    expect(departmentScope(manager, "a", cyclic, "department")).toBe(false)
  });
});
