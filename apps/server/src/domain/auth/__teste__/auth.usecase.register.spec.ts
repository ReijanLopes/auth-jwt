import { RegisterUseCase, RegisterInput } from "../usecase/registerUseCase";
import { UserRepository } from "../../user/repositories/userRepository";
import { AuthRepository } from "../repositories/authRepository";
import { RoleRepository } from "../../role/repositories/roleRepository";
import { HashService } from "../services/hashService";
import { JwtService, TokenPair } from "../services/jwtService";
import { Role, UserRole } from "../../role/entities/role";

import { describe, expect, it, jest } from "@jest/globals";


// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRole(name: UserRole = UserRole.EMPLOYEE): Role {
  return {
    getName: name,
  } as unknown as Role;
}

function makeTokenPair(): TokenPair {
  return {
    accessToken: "access-token-mock",
    refreshToken: "refresh-token-mock",
  };
}

function makeValidInput(overrides: Partial<RegisterInput> = {}): RegisterInput {
  return {
    name: "João Silva",
    email: "joao@example.com",
    phone: "11987654321",
    password: "Senha123",
    taxId: "529.982.247-25", // CPF válido
    ...overrides,
  };
}

// ─── Mocks ───────────────────────────────────────────────────────────────────

function makeMocks() {
  const userRepo: jest.Mocked<UserRepository> = {
    findByEmail: jest.fn().mockResolvedValue(null),
    findByTaxId: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<UserRepository>;

  const authRepo: jest.Mocked<AuthRepository> = {
    saveRefreshToken: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AuthRepository>;

  const roleRepo: jest.Mocked<RoleRepository> = {
    findByName: jest.fn().mockResolvedValue(makeRole()),
  } as unknown as jest.Mocked<RoleRepository>;

  const hashService: jest.Mocked<HashService> = {
    hash: jest.fn().mockResolvedValue("hashed-value"),
    compare: jest.fn().mockResolvedValue(true),
  } as unknown as jest.Mocked<HashService>;

  const jwtService: jest.Mocked<JwtService> = {
    generateTokenPair: jest.fn().mockReturnValue(makeTokenPair()),
    verifyAccessToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
  } as unknown as jest.Mocked<JwtService>;

  return { userRepo, authRepo, roleRepo, hashService, jwtService };
}

function makeUseCase(mocks: ReturnType<typeof makeMocks>) {
  return new RegisterUseCase(
    mocks.userRepo,
    mocks.authRepo,
    mocks.roleRepo,
    mocks.hashService,
    mocks.jwtService,
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("RegisterUseCase", () => {
  // ── Happy path ──────────────────────────────────────────────────────────

  describe("execute — sucesso", () => {
    it("deve retornar um par de tokens quando os dados são válidos", async () => {
      const mocks = makeMocks();
      const useCase = makeUseCase(mocks);

      const result = await useCase.execute(makeValidInput());

      expect(result).toEqual(makeTokenPair());
    });

    it("deve salvar o usuário no repositório", async () => {
      const mocks = makeMocks();
      const useCase = makeUseCase(mocks);

      await useCase.execute(makeValidInput());

      expect(mocks.userRepo.save).toHaveBeenCalledTimes(1);
    });

    it("deve salvar o refreshToken no repositório de auth", async () => {
      const mocks = makeMocks();
      const useCase = makeUseCase(mocks);

      await useCase.execute(makeValidInput());

      expect(mocks.authRepo.saveRefreshToken).toHaveBeenCalledTimes(1);
    });

    it("deve usar o hash da senha antes de criar o usuário", async () => {
      const mocks = makeMocks();
      const useCase = makeUseCase(mocks);

      await useCase.execute(makeValidInput({ password: "Senha123" }));

      expect(mocks.hashService.hash).toHaveBeenCalledWith("Senha123");
    });

    it("deve usar o hash do refreshToken antes de salvá-lo", async () => {
      const mocks = makeMocks();
      const useCase = makeUseCase(mocks);

      await useCase.execute(makeValidInput());

      // O hash é chamado duas vezes: uma para a senha e outra para o refresh token
      expect(mocks.hashService.hash).toHaveBeenCalledTimes(2);
      expect(mocks.hashService.hash).toHaveBeenCalledWith(
        makeTokenPair().refreshToken,
      );
    });

    it("deve usar o role EMPLOYEE por padrão quando nenhum role é informado", async () => {
      const mocks = makeMocks();
      const useCase = makeUseCase(mocks);

      await useCase.execute(makeValidInput());

      expect(mocks.roleRepo.findByName).toHaveBeenCalledWith(UserRole.EMPLOYEE);
    });

    it("deve usar o role informado quando ele é passado no input", async () => {
      const mocks = makeMocks();
      mocks.roleRepo.findByName.mockResolvedValue(makeRole(UserRole.ADMIN));
      const useCase = makeUseCase(mocks);

      await useCase.execute(makeValidInput({ role: UserRole.ADMIN }));

      expect(mocks.roleRepo.findByName).toHaveBeenCalledWith(UserRole.ADMIN);
    });

    it("deve gerar o par de tokens com o id e role do usuário criado", async () => {
      const mocks = makeMocks();
      const useCase = makeUseCase(mocks);

      await useCase.execute(makeValidInput());

      expect(mocks.jwtService.generateTokenPair).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: expect.any(String),
          role: UserRole.EMPLOYEE,
        }),
      );
    });

    it("deve realizar as chamadas assíncronas em paralelo (Promise.all)", async () => {
      const callOrder: string[] = [];
      const mocks = makeMocks();

      mocks.userRepo.findByEmail.mockImplementation(async () => {
        callOrder.push("findByEmail");
        return null;
      });
      mocks.userRepo.findByTaxId.mockImplementation(async () => {
        callOrder.push("findByTaxId");
        return null;
      });
      mocks.roleRepo.findByName.mockImplementation(async () => {
        callOrder.push("findByName");
        return makeRole();
      });
      mocks.hashService.hash.mockImplementation(async () => {
        callOrder.push("hash");
        return "hashed";
      });

      const useCase = makeUseCase(mocks);
      await useCase.execute(makeValidInput());

      // Todas as quatro chamadas devem ter ocorrido
      expect(callOrder).toEqual(
        expect.arrayContaining(["findByEmail", "findByTaxId", "findByName", "hash"]),
      );
    });
  });

  // ── Validação de senha ───────────────────────────────────────────────────

  describe("execute — validação de senha", () => {
    const invalidPasswords = [
      { label: "muito curta", value: "Ab1" },
      { label: "sem número", value: "SenhaLonga" },
      { label: "sem letra", value: "12345678" },
      { label: "string vazia", value: "" },
    ];

    it.each(invalidPasswords)(
      "deve lançar erro para senha $label: '$value'",
      async ({ value }) => {
        const mocks = makeMocks();
        const useCase = makeUseCase(mocks);

        await expect(
          useCase.execute(makeValidInput({ password: value })),
        ).rejects.toThrow(
          "Invalid password. Password must be at least 8 characters long and include at least one letter and one number.",
        );
      },
    );

    it("não deve acessar nenhum repositório quando a senha é inválida", async () => {
      const mocks = makeMocks();
      const useCase = makeUseCase(mocks);

      await expect(
        useCase.execute(makeValidInput({ password: "fraca" })),
      ).rejects.toThrow();

      expect(mocks.userRepo.findByEmail).not.toHaveBeenCalled();
      expect(mocks.userRepo.findByTaxId).not.toHaveBeenCalled();
      expect(mocks.roleRepo.findByName).not.toHaveBeenCalled();
      expect(mocks.hashService.hash).not.toHaveBeenCalled();
    });
  });

  // ── Conflitos de unicidade ───────────────────────────────────────────────

  describe("execute — conflito de email", () => {
    it("deve lançar erro quando o email já está em uso", async () => {
      const mocks = makeMocks();
      mocks.userRepo.findByEmail.mockResolvedValue({} as any);
      const useCase = makeUseCase(mocks);

      await expect(useCase.execute(makeValidInput())).rejects.toThrow(
        "Email already in use.",
      );
    });

    it("não deve salvar o usuário quando o email já está em uso", async () => {
      const mocks = makeMocks();
      mocks.userRepo.findByEmail.mockResolvedValue({} as any);
      const useCase = makeUseCase(mocks);

      await expect(useCase.execute(makeValidInput())).rejects.toThrow();

      expect(mocks.userRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("execute — conflito de taxId", () => {
    it("deve lançar erro quando o CPF já está em uso", async () => {
      const mocks = makeMocks();
      mocks.userRepo.findByTaxId.mockResolvedValue({} as any);
      const useCase = makeUseCase(mocks);

      await expect(useCase.execute(makeValidInput())).rejects.toThrow(
        "Tax ID already in use.",
      );
    });

    it("não deve salvar o usuário quando o CPF já está em uso", async () => {
      const mocks = makeMocks();
      mocks.userRepo.findByTaxId.mockResolvedValue({} as any);
      const useCase = makeUseCase(mocks);

      await expect(useCase.execute(makeValidInput())).rejects.toThrow();

      expect(mocks.userRepo.save).not.toHaveBeenCalled();
    });
  });

  // ── Role não encontrado ──────────────────────────────────────────────────

  describe("execute — role não encontrado", () => {
    it("deve lançar erro quando o role não existe no banco", async () => {
      const mocks = makeMocks();
      mocks.roleRepo.findByName.mockResolvedValue(null);
      const useCase = makeUseCase(mocks);

      await expect(useCase.execute(makeValidInput())).rejects.toThrow(
        `Role "${UserRole.EMPLOYEE}" not found. Run the seed first.`,
      );
    });

    it("não deve salvar o usuário quando o role não existe", async () => {
      const mocks = makeMocks();
      mocks.roleRepo.findByName.mockResolvedValue(null);
      const useCase = makeUseCase(mocks);

      await expect(useCase.execute(makeValidInput())).rejects.toThrow();

      expect(mocks.userRepo.save).not.toHaveBeenCalled();
      expect(mocks.authRepo.saveRefreshToken).not.toHaveBeenCalled();
    });
  });

  // ── Validação de entidade User ───────────────────────────────────────────

  describe("execute — validação de dados do usuário (User.create)", () => {
    it("deve lançar erro para nome inválido (menos de 3 caracteres)", async () => {
      const mocks = makeMocks();
      const useCase = makeUseCase(mocks);

      await expect(
        useCase.execute(makeValidInput({ name: "Jo" })),
      ).rejects.toThrow("Invalid name.");
    });

    it("deve lançar erro para email com formato inválido", async () => {
      const mocks = makeMocks();
      const useCase = makeUseCase(mocks);

      await expect(
        useCase.execute(makeValidInput({ email: "email-invalido" })),
      ).rejects.toThrow("Invalid email format.");
    });

    it("deve lançar erro para telefone com formato inválido", async () => {
      const mocks = makeMocks();
      const useCase = makeUseCase(mocks);

      await expect(
        useCase.execute(makeValidInput({ phone: "123" })),
      ).rejects.toThrow("Invalid phone number format.");
    });

    it("deve lançar erro para CPF inválido", async () => {
      const mocks = makeMocks();
      const useCase = makeUseCase(mocks);

      await expect(
        useCase.execute(makeValidInput({ taxId: "000.000.000-00" })),
      ).rejects.toThrow("Invalid tax ID format.");
    });
  });

  // ── Falhas de infraestrutura ─────────────────────────────────────────────

  describe("execute — falhas de infraestrutura", () => {
    it("deve propagar erro quando userRepo.save falha", async () => {
      const mocks = makeMocks();
      mocks.userRepo.save.mockRejectedValue(new Error("DB connection error"));
      const useCase = makeUseCase(mocks);

      await expect(useCase.execute(makeValidInput())).rejects.toThrow(
        "DB connection error",
      );
    });

    it("deve propagar erro quando authRepo.saveRefreshToken falha", async () => {
      const mocks = makeMocks();
      mocks.authRepo.saveRefreshToken.mockRejectedValue(
        new Error("Token save failed"),
      );
      const useCase = makeUseCase(mocks);

      await expect(useCase.execute(makeValidInput())).rejects.toThrow(
        "Token save failed",
      );
    });

    it("deve propagar erro quando hashService.hash falha", async () => {
      const mocks = makeMocks();
      mocks.hashService.hash.mockRejectedValue(new Error("Hash error"));
      const useCase = makeUseCase(mocks);

      await expect(useCase.execute(makeValidInput())).rejects.toThrow(
        "Hash error",
      );
    });
  });
});