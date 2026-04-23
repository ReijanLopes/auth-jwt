import { RegisterUseCase, RegisterInput } from "../usecase/registerUseCase";
import { UserRepository } from "../../user/repositories/userRepository";
import { AuthRepository } from "../repositories/authRepository";
import { RoleRepository } from "../../role/repositories/roleRepository";
import { HashService } from "../services/hashService";
import { JwtService, TokenPair } from "../services/jwtService";
import { Role, UserRole } from "../../role/entities/role";

import { describe, expect, it, jest } from "@jest/globals";

describe("RegisterUseCase", () => {
  const makeSut = () => {
    const userRepo: jest.Mocked<UserRepository> = {
      findByEmail: jest.fn(),
      findByTaxId: jest.fn(),
      save: jest.fn(),
    } as any;

    const authRepo: jest.Mocked<AuthRepository> = {
      saveRefreshToken: jest.fn(),
    } as any;

    const roleRepo: jest.Mocked<RoleRepository> = {
      findByName: jest.fn(),
    } as any;

const hashService: jest.Mocked<HashService> = {
  hashBcrypt: jest.fn(),
  hashSha256: jest.fn(),
  compareBcrypt: jest.fn(),
};
    const jwtService: jest.Mocked<JwtService> = {
      generateTokenPair: jest.fn(),
    } as any;

    const sut = new RegisterUseCase(
      userRepo,
      authRepo,
      roleRepo,
      hashService,
      jwtService,
    );

    return {
      sut,
      userRepo,
      authRepo,
      roleRepo,
      hashService,
      jwtService,
    };
  };

  const makeValidInput = () => ({
    name: "John Doe",
    email: "john@email.com",
    phone: "(27) 99999-9999",
    password: "Valid123",
    taxId: "12345678909", // CPF válido fake
    role: UserRole.EMPLOYEE,
  });

  it("should register a user successfully", async () => {
    const { sut, userRepo, roleRepo, hashService, jwtService, authRepo } =
      makeSut();

    const role = Role.from({ name: UserRole.EMPLOYEE, level: 1 });

    userRepo.findByEmail.mockResolvedValue(null);
    userRepo.findByTaxId.mockResolvedValue(null);
    roleRepo.findByName.mockResolvedValue(role);

    hashService.hashBcrypt.mockResolvedValue("hashed-password");
    hashService.hashSha256.mockResolvedValue("hashed-refresh-token");

    jwtService.generateTokenPair.mockReturnValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });

    const result = await sut.execute(makeValidInput());

    expect(result).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });

    expect(userRepo.save).toHaveBeenCalled();
    expect(authRepo.saveRefreshToken).toHaveBeenCalled();
    expect(hashService.hashBcrypt).toHaveBeenCalled();
    expect(hashService.hashSha256).toHaveBeenCalledWith("refresh-token");
  });

  it("should throw if email already exists", async () => {
    const { sut, userRepo } = makeSut();

    userRepo.findByEmail.mockResolvedValue({} as any);

    await expect(sut.execute(makeValidInput())).rejects.toThrow(
      "Email already in use.",
    );
  });

  it("should throw if taxId already exists", async () => {
    const { sut, userRepo } = makeSut();

    userRepo.findByEmail.mockResolvedValue(null);
    userRepo.findByTaxId.mockResolvedValue({} as any);

    await expect(sut.execute(makeValidInput())).rejects.toThrow(
      "Tax ID already in use.",
    );
  });

  it("should throw if role does not exist", async () => {
    const { sut, userRepo, roleRepo } = makeSut();

    userRepo.findByEmail.mockResolvedValue(null);
    userRepo.findByTaxId.mockResolvedValue(null);
    roleRepo.findByName.mockResolvedValue(null);

    await expect(sut.execute(makeValidInput())).rejects.toThrow(
      'Role "EMPLOYEE" not found. Run the seed first.',
    );
  });

  it("should throw if password is invalid", async () => {
    const { sut } = makeSut();

    await expect(
      sut.execute({
        ...makeValidInput(),
        password: "123",
      }),
    ).rejects.toThrow("Invalid password.");
  });
});
