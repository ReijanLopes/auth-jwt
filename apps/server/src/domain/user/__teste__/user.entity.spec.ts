// src/domain/user/__tests__/user.entity.spec.ts

import { User } from "../entities/user";
import {
  AdminRole,
  EmployeeRole,
  ManagerRole,
  MasterRole,
  Role,
  RoleWeight,
  SupervisorRole,
  UserRole,
} from "../../role/entities/role";
import { describe, expect, it } from "@jest/globals";

const validProps = {
  name: "John Doe",
  email: "john@example.com",
  phone: "(11) 98765-4321",
  password: "senha123", // ✅ letra + número + mínimo 8 chars
  taxId: "529.982.247-25", // ✅ CPF matematicamente válido
  role: new EmployeeRole(),
};

describe("User Entity", () => {
  describe("create()", () => {
    it("should create a valid user with all props", () => {
      const user = User.create(validProps);

      expect(user.getName).toBe("John Doe");
      expect(user.getEmail).toBe("john@example.com");
      expect(user.getPhone).toBe("(11) 98765-4321");
      expect(user.getTaxId).toBe("529.982.247-25");
      expect(user.getIsActive).toBe(true);
      expect(user.getMedia).toBeNull();
    });

    it("should generate a UUID when id is not provided", () => {
      const user = User.create(validProps);
      expect(user.getId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it("should use provided id when given", () => {
      const id = "123e4567-e89b-12d3-a456-426614174000";
      const user = User.create({ ...validProps, id });
      expect(user.getId).toBe(id);
    });

    it("should default isActive to true", () => {
      const user = User.create(validProps);
      expect(user.getIsActive).toBe(true);
    });

    it("should respect isActive false when explicitly passed", () => {
      const user = User.create({ ...validProps, isActive: false });
      expect(user.getIsActive).toBe(false);
    });

    it("should default role to EMPLOYEE when not provided", () => {
      const { role, ...propsWithoutRole } = validProps;
      const user = User.create({ ...propsWithoutRole, role: undefined as any });
      expect(user.getRole).toBe(UserRole.EMPLOYEE);
    });
  });

  // ─── Validação de name ────────────────────────────────────────────────────
  describe("name validation", () => {
    it("should throw when name has less than 3 characters", () => {
      expect(() => User.create({ ...validProps, name: "Jo" })).toThrow(
        "Invalid name",
      );
    });

    it("should throw when name contains numbers", () => {
      expect(() => User.create({ ...validProps, name: "John123" })).toThrow(
        "Invalid name",
      );
    });

    it("should throw when name contains special characters", () => {
      expect(() => User.create({ ...validProps, name: "John@Doe" })).toThrow(
        "Invalid name",
      );
    });

    it("should accept names with accented characters", () => {
      const user = User.create({ ...validProps, name: "João Silva" });
      expect(user.getName).toBe("João Silva");
    });
  });

  // ─── Validação de email ───────────────────────────────────────────────────
  describe("email validation", () => {
    it("should throw on email without @", () => {
      expect(() => User.create({ ...validProps, email: "notanemail" })).toThrow(
        "Invalid email format",
      );
    });

    it("should throw on email without domain", () => {
      expect(() => User.create({ ...validProps, email: "user@" })).toThrow(
        "Invalid email format",
      );
    });

    it("should throw on email without TLD", () => {
      expect(() =>
        User.create({ ...validProps, email: "user@domain" }),
      ).toThrow("Invalid email format");
    });
  });

  // ─── Validação de phone ───────────────────────────────────────────────────
  describe("phone validation", () => {
    it("should throw when phone has letters", () => {
      expect(() =>
        User.create({ ...validProps, phone: "119abcd4321" }),
      ).toThrow("Invalid phone");
    });

    it("should throw when phone has less than 10 digits", () => {
      expect(() => User.create({ ...validProps, phone: "123456789" })).toThrow(
        "Invalid phone",
      );
    });

    it("should throw when phone has more than 11 digits", () => {
      expect(() =>
        User.create({ ...validProps, phone: "119876543210" }),
      ).toThrow("Invalid phone");
    });

    it("should accept phone with formatting characters", () => {
      const user = User.create({ ...validProps, phone: "(11) 98765-4321" });
      expect(user.getPhone).toBe("(11) 98765-4321");
    });

    it("should accept phone with only digits (11 digits)", () => {
      const user = User.create({ ...validProps, phone: "11987654321" });
      expect(user.getPhone).toBe("11987654321");
    });
  });

  // ─── Validação de password ────────────────────────────────────────────────
  // describe("password validation", () => {
  //   it("should throw when password has less than 8 characters", () => {
  //     expect(() => User.create({ ...validProps, password: "abc12" })).toThrow(
  //       "Invalid password",
  //     );
  //   });

  //   it("should throw when password has no numbers", () => {
  //     // apenas letras — não passa no regex (?=.*\d)
  //     expect(() =>
  //       User.create({ ...validProps, password: "somenteletras" }),
  //     ).toThrow("Invalid password");
  //   });

  //   it("should throw when password has no letters", () => {
  //     // apenas números — não passa no regex (?=.*[A-Za-z])
  //     expect(() =>
  //       User.create({ ...validProps, password: "12345678" }),
  //     ).toThrow("Invalid password");
  //   });

  //   it("should accept password with letters, numbers and special chars", () => {
  //     const user = User.create({ ...validProps, password: "Senha@123" });
  //     expect(user.getPassword).toBe("Senha@123");
  //   });
  // });

  // ─── Validação de taxId (CPF) ─────────────────────────────────────────────
  describe("taxId (CPF) validation", () => {
    it("should throw on CPF with all equal digits", () => {
      expect(() =>
        User.create({ ...validProps, taxId: "111.111.111-11" }),
      ).toThrow("Invalid tax ID");
    });

    it("should throw on CPF with wrong check digits", () => {
      expect(() =>
        User.create({ ...validProps, taxId: "529.982.247-00" }),
      ).toThrow("Invalid tax ID");
    });

    it("should throw on CPF with wrong length", () => {
      expect(() =>
        User.create({ ...validProps, taxId: "529.982.247" }),
      ).toThrow("Invalid tax ID");
    });

    it("should accept a valid CPF with formatting", () => {
      const user = User.create({ ...validProps, taxId: "529.982.247-25" });
      expect(user.getTaxId).toBe("529.982.247-25");
    });
  });

  // ─── Métodos de estado ────────────────────────────────────────────────────
  describe("activate() / deactivate()", () => {
    it("should deactivate an active user", () => {
      const user = User.create(validProps);
      user.deactivate();
      expect(user.getIsActive).toBe(false);
    });

    it("should activate an inactive user", () => {
      const user = User.create({ ...validProps, isActive: false });
      user.activate();
      expect(user.getIsActive).toBe(true);
    });
  });

  // ─── Setters com validação ────────────────────────────────────────────────
  describe("setName()", () => {
    it("should update name successfully", () => {
      const user = User.create(validProps);
      user.setName("Jane Doe");
      expect(user.getName).toBe("Jane Doe");
    });

    it("should throw on invalid name", () => {
      const user = User.create(validProps);
      expect(() => user.setName("X")).toThrow("Invalid name");
    });
  });

  describe("setPhone()", () => {
    it("should update phone successfully", () => {
      const user = User.create(validProps);
      user.setPhone("11912345678");
      expect(user.getPhone).toBe("11912345678");
    });

    it("should throw on invalid phone", () => {
      const user = User.create(validProps);
      expect(() => user.setPhone("123")).toThrow("Invalid phone");
    });
  });

  describe("setPassword()", () => {
    it("should update password successfully", () => {
      const user = User.create(validProps);
      user.setPassword("newPass9");
      expect(user.getPassword).toBe("newPass9");
    });

    it("should throw when new password has no number", () => {
      const user = User.create(validProps);
      expect(() => user.setPassword("somenteletras")).toThrow(
        "Invalid password",
      );
    });
  });

  describe("setRole()", () => {
    it("should update role successfully", () => {
      const user = User.create(validProps);
      user.setRole(new AdminRole());
      expect(user.getRole.getName).toBe(UserRole.ADMIN);
    });

    describe("Role subclasses", () => {
      it("EmployeeRole should have level 1", () => {
        const role = new EmployeeRole();
        expect(role.getName).toBe(UserRole.EMPLOYEE);
        expect(role.getLevel).toBe(1);
      });

      it("SupervisorRole should have level 2", () => {
        const role = new SupervisorRole();
        expect(role.getName).toBe(UserRole.SUPERVISOR);
        expect(role.getLevel).toBe(2);
      });

      it("ManagerRole should have level 3", () => {
        const role = new ManagerRole();
        expect(role.getName).toBe(UserRole.MANAGER);
        expect(role.getLevel).toBe(3);
      });

      it("AdminRole should have level 4", () => {
        const role = new AdminRole();
        expect(role.getName).toBe(UserRole.ADMIN);
        expect(role.getLevel).toBe(4);
      });

      it("MasterRole should have level 5", () => {
        const role = new MasterRole();
        expect(role.getName).toBe(UserRole.MASTER);
        expect(role.getLevel).toBe(5);
      });
    });

    // ─── Role via Role.from() ───────────────────────────────────────────────
    describe("Role.from()", () => {
      it("should create a valid role from a valid UserRole key", () => {
        const role = Role.from({
          name: UserRole.ADMIN,
          level: RoleWeight[UserRole.ADMIN],
        });
        expect(role.getName).toBe(UserRole.ADMIN);
        expect(role.getLevel).toBe(4);
      });

      it("should generate a UUID when id is not provided", () => {
        const role = Role.from({ name: UserRole.EMPLOYEE, level: 1 });
        expect(role.getId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        );
      });

      it("should throw on invalid role name", () => {
        expect(() => Role.from({ name: "INVALID_ROLE", level: 1 })).toThrow(
          "Invalid user role",
        );
      });

      it("should throw on lowercase valid role name", () => {
        // O enum é uppercase — 'admin' não é uma chave válida
        expect(() => Role.from({ name: "admin", level: 4 })).toThrow(
          "Invalid user role",
        );
      });

      it("should ignore provided level and use RoleWeight instead", () => {
        // Role.from() sempre usa RoleWeight — o level do input é ignorado
        const role = Role.from({ name: UserRole.MASTER, level: 99 });
        expect(role.getLevel).toBe(RoleWeight[UserRole.MASTER]); // 5
      });
    });

    // ─── RoleWeight ─────────────────────────────────────────────────────────
    describe("RoleWeight", () => {
      it("should have correct weights for all roles", () => {
        expect(RoleWeight[UserRole.MASTER]).toBe(5);
        expect(RoleWeight[UserRole.ADMIN]).toBe(4);
        expect(RoleWeight[UserRole.MANAGER]).toBe(3);
        expect(RoleWeight[UserRole.SUPERVISOR]).toBe(2);
        expect(RoleWeight[UserRole.EMPLOYEE]).toBe(1);
      });

      it("MASTER should outweigh all other roles", () => {
        const allWeights = Object.values(RoleWeight).filter(
          (w) => w !== RoleWeight[UserRole.MASTER],
        );
        allWeights.forEach((w) => {
          expect(RoleWeight[UserRole.MASTER]).toBeGreaterThan(w);
        });
      });

      it("weights should be unique per role", () => {
        const weights = Object.values(RoleWeight);
        const unique = new Set(weights);
        expect(unique.size).toBe(weights.length);
      });
    });

    // ─── User com diferentes roles ───────────────────────────────────────────
    describe("User with roles", () => {
      it("should create user with EmployeeRole", () => {
        const user = User.create({ ...validProps, role: new EmployeeRole() });
        expect(user.getRole.getName).toBe(UserRole.EMPLOYEE);
        expect(user.getRole.getLevel).toBe(1);
      });

      it("should create user with AdminRole", () => {
        const user = User.create({ ...validProps, role: new AdminRole() });
        expect(user.getRole.getName).toBe(UserRole.ADMIN);
        expect(user.getRole.getLevel).toBe(4);
      });

      it("should update user role via setRole()", () => {
        const user = User.create({ ...validProps, role: new EmployeeRole() });
        user.setRole(new AdminRole());
        expect(user.getRole.getName).toBe(UserRole.ADMIN);
        expect(user.getRole.getLevel).toBe(4);
      });

      it("should allow promoting user from EMPLOYEE to MASTER", () => {
        const user = User.create({ ...validProps, role: new EmployeeRole() });

        user.setRole(new SupervisorRole());
        expect(user.getRole.getLevel).toBe(2);

        user.setRole(new ManagerRole());
        expect(user.getRole.getLevel).toBe(3);

        user.setRole(new AdminRole());
        expect(user.getRole.getLevel).toBe(4);

        user.setRole(new MasterRole());
        expect(user.getRole.getLevel).toBe(5);
      });

      it("new role level should be higher than old after promotion", () => {
        const user = User.create({ ...validProps, role: new EmployeeRole() });
        const previousLevel = user.getRole.getLevel;

        user.setRole(new ManagerRole());

        expect(user.getRole.getLevel).toBeGreaterThan(previousLevel);
      });
    });
  });

  describe("setTaxId()", () => {
    it("should update taxId successfully", () => {
      const user = User.create(validProps);
      user.setTaxId("529.982.247-25");
      expect(user.getTaxId).toBe("529.982.247-25");
    });

    it("should throw on invalid CPF", () => {
      const user = User.create(validProps);
      expect(() => user.setTaxId("000.000.000-00")).toThrow("Invalid tax ID");
    });
  });
});
