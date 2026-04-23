import { LoginUseCase } from "../usecase/loginUseCase";
import { UserRepository } from "../../user/repositories/userRepository";
import { AuthRepository } from "../repositories/authRepository";
import { HashService } from "../services/hashService";
import { JwtService, TokenPair } from "../services/jwtService";
import { RefreshToken } from "../entities/refreshToken";
import { Role, UserRole } from "../../role/entities/role";
import { User } from "../../user/entities/user";

import { describe, expect, it, jest } from "@jest/globals";
import { beforeEach } from "@jest/globals";

// ── Mocks ────────────────────────────────────────────────────────────────────



describe("LoginUseCase", () => {
  const mockFn = <T extends (...args: any[]) => any>() =>
    jest.fn() as jest.MockedFunction<T>;

  const makeSut = () => {
    const userRepo: jest.Mocked<UserRepository> = {
      findByEmail: jest.fn(),
    } as any;

    const authRepo: jest.Mocked<AuthRepository> = {
      saveRefreshToken: jest.fn(),
    } as any;

    const hashService: jest.Mocked<HashService> = {
      hashBcrypt: mockFn<HashService["hashBcrypt"]>(),
      hashSha256: mockFn<HashService["hashSha256"]>(),
      compareBcrypt: mockFn<HashService["compareBcrypt"]>(),
    };

    const jwtService: jest.Mocked<JwtService> = {
      generateTokenPair: jest.fn(),
    } as any;

    const sut = new LoginUseCase(
      userRepo,
      authRepo,
      hashService,
      jwtService,
    );

    return {
      sut,
      userRepo,
      authRepo,
      hashService,
      jwtService,
    };
  };

  const makeUser = () => {
    const role = Role.from({ name: UserRole.EMPLOYEE, level: 1 });

    return User.create({
      name: "John Doe",
      email: "john@email.com",
      phone: "(27) 99999-9999",
      password: "hashed-password",
      taxId: "12345678909",
      role,
      isActive: true,
    });
  };

  const makeInput = () => ({
    email: "john@email.com",
    password: "Valid123",
  });

  it("should login successfully", async () => {
    const { sut, userRepo, hashService, jwtService, authRepo } = makeSut();

    const user = makeUser();

    userRepo.findByEmail.mockResolvedValue(user);
    hashService.compareBcrypt.mockResolvedValue(true);
    hashService.hashSha256.mockResolvedValue("hashed-refresh-token");

    jwtService.generateTokenPair.mockReturnValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });

    const result = await sut.execute(makeInput());

    expect(result).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });

    expect(hashService.compareBcrypt).toHaveBeenCalledWith(
      "Valid123",
      user.getPassword,
    );

    expect(authRepo.saveRefreshToken).toHaveBeenCalled();
  });

  it("should throw if user not found", async () => {
    const { sut, userRepo } = makeSut();

    userRepo.findByEmail.mockResolvedValue(null);

    await expect(sut.execute(makeInput())).rejects.toThrow(
      "Invalid credentials.",
    );
  });

  it("should throw if user is deactivated", async () => {
    const { sut, userRepo } = makeSut();

    const user = makeUser();
    user.deactivate();

    userRepo.findByEmail.mockResolvedValue(user);

    await expect(sut.execute(makeInput())).rejects.toThrow(
      "User account is deactivated.",
    );
  });

  it("should throw if password is invalid", async () => {
    const { sut, userRepo, hashService } = makeSut();

    const user = makeUser();

    userRepo.findByEmail.mockResolvedValue(user);
    hashService.compareBcrypt.mockResolvedValue(false);

    await expect(sut.execute(makeInput())).rejects.toThrow(
      "Invalid credentials.",
    );
  });
});