import { Stock } from "../entities/stock";
import { describe, expect, it } from "@jest/globals";

const departmentId = "department-1";

const validProps = {
  name: "Estoque Central",
  departmentId,
};

describe("Stock Entity", () => {
  describe("create()", () => {
    it("should create a stock scoped to a department", () => {
      const stock = Stock.create(validProps);

      expect(stock.getName).toBe("Estoque Central");
      expect(stock.getDepartmentId).toBe(departmentId);
      expect(stock.getQuantity).toBe(0);
      expect(stock.getIsActive).toBe(true);
    });

    it("should accept an initial quantity", () => {
      const stock = Stock.create({ ...validProps, quantity: 50 });
      expect(stock.getQuantity).toBe(50);
    });

    it("should generate a UUID when id is not provided", () => {
      const stock = Stock.create(validProps);
      expect(stock.getId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it("should throw on invalid name", () => {
      expect(() => Stock.create({ ...validProps, name: "X" })).toThrow(
        "Invalid name",
      );
    });

    it("should throw on empty department ID", () => {
      expect(() =>
        Stock.create({ ...validProps, departmentId: "" }),
      ).toThrow("Invalid department ID");
    });

    it("should throw on negative initial quantity", () => {
      expect(() => Stock.create({ ...validProps, quantity: -1 })).toThrow(
        "Invalid quantity",
      );
    });
  });

  describe("increase()", () => {
    it("should increase the quantity", () => {
      const stock = Stock.create(validProps);
      stock.increase(10);
      expect(stock.getQuantity).toBe(10);
    });

    it("should throw when amount is not positive", () => {
      const stock = Stock.create(validProps);
      expect(() => stock.increase(0)).toThrow("Invalid amount");
      expect(() => stock.increase(-5)).toThrow("Invalid amount");
    });
  });

  describe("decrease()", () => {
    it("should decrease the quantity", () => {
      const stock = Stock.create({ ...validProps, quantity: 10 });
      stock.decrease(4);
      expect(stock.getQuantity).toBe(6);
    });

    it("should throw when amount is not positive", () => {
      const stock = Stock.create({ ...validProps, quantity: 10 });
      expect(() => stock.decrease(0)).toThrow("Invalid amount");
    });

    it("should throw when decreasing more than available", () => {
      const stock = Stock.create({ ...validProps, quantity: 5 });
      expect(() => stock.decrease(6)).toThrow("Insufficient stock quantity");
    });
  });

  describe("activate() / deactivate()", () => {
    it("should deactivate an active stock", () => {
      const stock = Stock.create(validProps);
      stock.deactivate();
      expect(stock.getIsActive).toBe(false);
    });

    it("should activate an inactive stock", () => {
      const stock = Stock.create({ ...validProps, isActive: false });
      stock.activate();
      expect(stock.getIsActive).toBe(true);
    });
  });
});
