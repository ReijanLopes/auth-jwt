import { LoginUseCase } from "../usecase/loginUseCase";
import { UserRepository } from "../../user/repositories/userRepository";
import { AuthRepository } from "../repositories/authRepository";
import { HashService } from "../services/hashService";
import { JwtService, TokenPair } from "../services/jwtService";
import { RefreshToken } from "../entities/refreshToken";

import { describe, expect, it, jest } from "@jest/globals";
import { beforeEach } from "node:test";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUserRepo = {
  findByEmail: jest.fn(),
} as unknown as jest.Mocked<UserRepository>;

const mockAuthRepo = {
  saveRefreshToken: jest.fn(),
} as unknown as jest.Mocked<AuthRepository>;

const mockHashService = {
  compare: jest.fn(),
} as unknown as jest.Mocked<HashService>;

const mockJwtService = {
  generateTokenPair: jest.fn(),
} as unknown as jest.Mocked<JwtService>;

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeUser = (overrides?: Partial<{
  isActive: boolean;
  password: string;
  id: string;
  roleName: string;
}>) => {
  const {
    isActive = true,
    password = "hashed_password",
    id = "user-123",
    roleName = "admin",
  } = overrides ?? {};

  return {
    getId: id,
    getIsActive: isActive,
    getPassword: password,
    getRole: { getName: roleName },
  };
};

const makeTokenPair = (): TokenPair => ({
  accessToken: "access_token_mock",
  refreshToken: "refresh_token_mock",
});

// ── Setup ─────────────────────────────────────────────────────────────────────

jest.spyOn(RefreshToken, "create").mockReturnValue({} as RefreshToken);

const makeSut = () =>
  new LoginUseCase(mockUserRepo, mockAuthRepo, mockHashService, mockJwtService);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("LoginUseCase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("when credentials are valid", () => {
    it("should return a token pair on successful login", async () => {
      const user = makeUser();
      const tokens = makeTokenPair();

      mockUserRepo.findByEmail.mockResolvedValue(user as any);
      mockHashService.compare.mockResolvedValue(true);
      mockJwtService.generateTokenPair.mockReturnValue(tokens);
      mockAuthRepo.saveRefreshToken.mockResolvedValue(undefined);

      const sut = makeSut();
      const result = await sut.execute({ email: "user@test.com", password: "plain_password" });

      expect(result).toEqual(tokens);
    });

    it("should call findByEmail with the provided email", async () => {
      const user = makeUser();
      mockUserRepo.findByEmail.mockResolvedValue(user as any);
      mockHashService.compare.mockResolvedValue(true);
      mockJwtService.generateTokenPair.mockReturnValue(makeTokenPair());
      mockAuthRepo.saveRefreshToken.mockResolvedValue(undefined);

      const sut = makeSut();
      await sut.execute({ email: "user@test.com", password: "plain_password" });

      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith("user@test.com");
      expect(mockUserRepo.findByEmail).toHaveBeenCalledTimes(1);
    });

    it("should compare the plain password against the stored hash", async () => {
      const user = makeUser({ password: "stored_hash" });
      mockUserRepo.findByEmail.mockResolvedValue(user as any);
      mockHashService.compare.mockResolvedValue(true);
      mockJwtService.generateTokenPair.mockReturnValue(makeTokenPair());
      mockAuthRepo.saveRefreshToken.mockResolvedValue(undefined);

      const sut = makeSut();
      await sut.execute({ email: "user@test.com", password: "plain_password" });

      expect(mockHashService.compare).toHaveBeenCalledWith("plain_password", "stored_hash");
    });

    it("should generate a token pair with the correct payload", async () => {
      const user = makeUser({ id: "user-456", roleName: "editor" });
      mockUserRepo.findByEmail.mockResolvedValue(user as any);
      mockHashService.compare.mockResolvedValue(true);
      mockJwtService.generateTokenPair.mockReturnValue(makeTokenPair());
      mockAuthRepo.saveRefreshToken.mockResolvedValue(undefined);

      const sut = makeSut();
      await sut.execute({ email: "user@test.com", password: "plain_password" });

      expect(mockJwtService.generateTokenPair).toHaveBeenCalledWith({
        sub: "user-456",
        role: "editor",
      });
    });

    it("should persist the refresh token", async () => {
      const user = makeUser();
      mockUserRepo.findByEmail.mockResolvedValue(user as any);
      mockHashService.compare.mockResolvedValue(true);
      mockJwtService.generateTokenPair.mockReturnValue(makeTokenPair());
      mockAuthRepo.saveRefreshToken.mockResolvedValue(undefined);

      const sut = makeSut();
      await sut.execute({ email: "user@test.com", password: "plain_password" });

      expect(mockAuthRepo.saveRefreshToken).toHaveBeenCalledTimes(1);
    });

    it("should create a RefreshToken that expires in ~7 days", async () => {
      const user = makeUser({ id: "user-123" });
      const tokens = makeTokenPair();
      mockUserRepo.findByEmail.mockResolvedValue(user as any);
      mockHashService.compare.mockResolvedValue(true);
      mockJwtService.generateTokenPair.mockReturnValue(tokens);
      mockAuthRepo.saveRefreshToken.mockResolvedValue(undefined);

      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      const createSpy = jest.spyOn(RefreshToken, "create");

      const sut = makeSut();
      await sut.execute({ email: "user@test.com", password: "plain_password" });

      expect(createSpy).toHaveBeenCalledWith({
        userId: "user-123",
        token: tokens.refreshToken,
        expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
      });
    });
  });

  describe("when user is not found", () => {
    it("should throw 'Invalid credentials.' when email does not exist", async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      const sut = makeSut();
      await expect(
        sut.execute({ email: "unknown@test.com", password: "any" }),
      ).rejects.toThrow("Invalid credentials.");
    });

    it("should not attempt password comparison when user is not found", async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      const sut = makeSut();
      await expect(
        sut.execute({ email: "unknown@test.com", password: "any" }),
      ).rejects.toThrow();

      expect(mockHashService.compare).not.toHaveBeenCalled();
    });
  });

  describe("when user account is deactivated", () => {
    it("should throw 'User account is deactivated.'", async () => {
      const user = makeUser({ isActive: false });
      mockUserRepo.findByEmail.mockResolvedValue(user as any);

      const sut = makeSut();
      await expect(
        sut.execute({ email: "inactive@test.com", password: "any" }),
      ).rejects.toThrow("User account is deactivated.");
    });

    it("should not compare password for deactivated accounts", async () => {
      const user = makeUser({ isActive: false });
      mockUserRepo.findByEmail.mockResolvedValue(user as any);

      const sut = makeSut();
      await expect(
        sut.execute({ email: "inactive@test.com", password: "any" }),
      ).rejects.toThrow();

      expect(mockHashService.compare).not.toHaveBeenCalled();
    });
  });

  describe("when password is wrong", () => {
    it("should throw 'Invalid credentials.' on password mismatch", async () => {
      const user = makeUser();
      mockUserRepo.findByEmail.mockResolvedValue(user as any);
      mockHashService.compare.mockResolvedValue(false);

      const sut = makeSut();
      await expect(
        sut.execute({ email: "user@test.com", password: "wrong_password" }),
      ).rejects.toThrow("Invalid credentials.");
    });

    it("should not generate tokens when password is wrong", async () => {
      const user = makeUser();
      mockUserRepo.findByEmail.mockResolvedValue(user as any);
      mockHashService.compare.mockResolvedValue(false);

      const sut = makeSut();
      await expect(
        sut.execute({ email: "user@test.com", password: "wrong_password" }),
      ).rejects.toThrow();

      expect(mockJwtService.generateTokenPair).not.toHaveBeenCalled();
      expect(mockAuthRepo.saveRefreshToken).not.toHaveBeenCalled();
    });
  });
});