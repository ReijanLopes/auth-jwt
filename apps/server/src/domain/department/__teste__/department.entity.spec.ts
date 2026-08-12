import { Department } from "../entities/department";
import { describe, expect, it } from "@jest/globals";

const companyId = "company-1";

const validProps = {
  name: "Recursos Humanos",
  companyId,
};

describe("Department Entity", () => {
  describe("createRoot()", () => {
    it("should create a root department with parentId null", () => {
      const department = Department.createRoot(validProps);

      expect(department.getName).toBe("Recursos Humanos");
      expect(department.getCompanyId).toBe(companyId);
      expect(department.getParentId).toBeNull();
      expect(department.isRoot).toBe(true);
    });

    it("should default isActive to true", () => {
      const department = Department.createRoot(validProps);
      expect(department.getIsActive).toBe(true);
    });

    it("should generate a UUID when id is not provided", () => {
      const department = Department.createRoot(validProps);
      expect(department.getId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it("should throw on invalid name", () => {
      expect(() =>
        Department.createRoot({ ...validProps, name: "X" }),
      ).toThrow("Invalid name");
    });

    it("should throw on empty company ID", () => {
      expect(() =>
        Department.createRoot({ ...validProps, companyId: "" }),
      ).toThrow("Invalid company ID");
    });
  });

  describe("createChild()", () => {
    it("should inherit the companyId from the parent department", () => {
      const parent = Department.createRoot(validProps);
      const child = Department.createChild(parent, { name: "Recrutamento" });

      expect(child.getCompanyId).toBe(parent.getCompanyId);
      expect(child.getParentId).toBe(parent.getId);
      expect(child.isRoot).toBe(false);
    });

    it("should support arbitrary depth trees", () => {
      const root = Department.createRoot(validProps);
      const child = Department.createChild(root, { name: "Recrutamento" });
      const grandchild = Department.createChild(child, {
        name: "Recrutamento Tech",
      });

      expect(grandchild.getParentId).toBe(child.getId);
      expect(grandchild.getCompanyId).toBe(root.getCompanyId);
    });
  });

  describe("activate() / deactivate()", () => {
    it("should deactivate an active department", () => {
      const department = Department.createRoot(validProps);
      department.deactivate();
      expect(department.getIsActive).toBe(false);
    });

    it("should activate an inactive department", () => {
      const department = Department.createRoot({
        ...validProps,
        isActive: false,
      });
      department.activate();
      expect(department.getIsActive).toBe(true);
    });
  });

  describe("setName()", () => {
    it("should update name successfully", () => {
      const department = Department.createRoot(validProps);
      department.setName("Financeiro");
      expect(department.getName).toBe("Financeiro");
    });

    it("should throw on invalid name", () => {
      const department = Department.createRoot(validProps);
      expect(() => department.setName("X")).toThrow("Invalid name");
    });
  });
});
