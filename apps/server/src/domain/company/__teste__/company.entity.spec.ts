import { Company } from "../entities/company";
import { describe, expect, it } from "@jest/globals";

const validProps = {
  name: "Matriz Central",
  taxId: "12.345.678/0001-90",
};

describe("Company Entity", () => {
  describe("createHeadquarters()", () => {
    it("should create a headquarters with parentId null", () => {
      const company = Company.createHeadquarters(validProps);

      expect(company.getName).toBe("Matriz Central");
      expect(company.getTaxId).toBe("12.345.678/0001-90");
      expect(company.getParentId).toBeNull();
      expect(company.isHeadquarters).toBe(true);
      expect(company.isFranchise).toBe(false);
    });

    it("should default isActive to true", () => {
      const company = Company.createHeadquarters(validProps);
      expect(company.getIsActive).toBe(true);
    });

    it("should generate a UUID when id is not provided", () => {
      const company = Company.createHeadquarters(validProps);
      expect(company.getId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it("should use provided id when given", () => {
      const id = "123e4567-e89b-12d3-a456-426614174000";
      const company = Company.createHeadquarters({ ...validProps, id });
      expect(company.getId).toBe(id);
    });

    it("should throw on invalid name", () => {
      expect(() =>
        Company.createHeadquarters({ ...validProps, name: "X" }),
      ).toThrow("Invalid name");
    });

    it("should throw on empty tax ID", () => {
      expect(() =>
        Company.createHeadquarters({ ...validProps, taxId: "" }),
      ).toThrow("Invalid tax ID");
    });
  });

  describe("createFranchise()", () => {
    it("should create a franchise pointing to the headquarters", () => {
      const headquarters = Company.createHeadquarters(validProps);
      const franchise = Company.createFranchise(headquarters, {
        name: "Filial Sul",
        taxId: "98.765.432/0001-10",
      });

      expect(franchise.getParentId).toBe(headquarters.getId);
      expect(franchise.isFranchise).toBe(true);
      expect(franchise.isHeadquarters).toBe(false);
    });

    it("should throw when parent is itself a franchise (no sub-franchises)", () => {
      const headquarters = Company.createHeadquarters(validProps);
      const franchise = Company.createFranchise(headquarters, {
        name: "Filial Sul",
        taxId: "98.765.432/0001-10",
      });

      expect(() =>
        Company.createFranchise(franchise, {
          name: "Sub Filial",
          taxId: "11.222.333/0001-44",
        }),
      ).toThrow("Invalid parent company");
    });
  });

  describe("activate() / deactivate()", () => {
    it("should deactivate an active company", () => {
      const company = Company.createHeadquarters(validProps);
      company.deactivate();
      expect(company.getIsActive).toBe(false);
    });

    it("should activate an inactive company", () => {
      const company = Company.createHeadquarters({
        ...validProps,
        isActive: false,
      });
      company.activate();
      expect(company.getIsActive).toBe(true);
    });
  });

  describe("setName()", () => {
    it("should update name successfully", () => {
      const company = Company.createHeadquarters(validProps);
      company.setName("Nova Matriz");
      expect(company.getName).toBe("Nova Matriz");
    });

    it("should throw on invalid name", () => {
      const company = Company.createHeadquarters(validProps);
      expect(() => company.setName("X")).toThrow("Invalid name");
    });
  });
});
