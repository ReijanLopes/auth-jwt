import { describe, expect, it } from "@jest/globals";
import { UserRole } from "../../role/entities/role";
import { levelFilterAllows } from "../levelFilter";
import { AccessContext, EmployeeResource } from "../types";

function ctx(role: UserRole, level: number): AccessContext {
  return { userId: "accessor", company: { id: "hq", parentId: null }, role, level, departmentId: "d" };
}

function target(overrides: Partial<EmployeeResource> = {}): EmployeeResource {
  return {
    type: "employee",
    id: "target",
    companyId: "hq",
    departmentId: "d",
    level: 1,
    isSelf: false,
    ...overrides,
  };
}

describe("levelFilterAllows", () => {
  describe("EMPLOYEE", () => {
    it("allows read/write only when the resource is itself, regardless of level", () => {
      const employeeCtx = ctx(UserRole.EMPLOYEE, 1);
      expect(levelFilterAllows(employeeCtx, target({ isSelf: true, level: 1 }), "read")).toBe(true);
      expect(levelFilterAllows(employeeCtx, target({ isSelf: true, level: 1 }), "write")).toBe(true);
      expect(levelFilterAllows(employeeCtx, target({ isSelf: false, level: 1 }), "read")).toBe(false);
    });
  });

  describe("MASTER", () => {
    it("always allows, even for a target at a higher level", () => {
      const master = ctx(UserRole.MASTER, 5);
      expect(levelFilterAllows(master, target({ level: 99 }), "write")).toBe(true);
    });
  });

  describe("other roles (level-based)", () => {
    it("blocks read and write on a target above its level", () => {
      const manager = ctx(UserRole.MANAGER, 3);
      expect(levelFilterAllows(manager, target({ level: 4 }), "read")).toBe(false);
      expect(levelFilterAllows(manager, target({ level: 4 }), "write")).toBe(false);
    });

    it("allows only read on a target at the same level", () => {
      const manager = ctx(UserRole.MANAGER, 3);
      expect(levelFilterAllows(manager, target({ level: 3 }), "read")).toBe(true);
      expect(levelFilterAllows(manager, target({ level: 3 }), "write")).toBe(false);
    });

    it("allows read and write on a target below its level", () => {
      const manager = ctx(UserRole.MANAGER, 3);
      expect(levelFilterAllows(manager, target({ level: 2 }), "read")).toBe(true);
      expect(levelFilterAllows(manager, target({ level: 2 }), "write")).toBe(true);
    });
  });
});
