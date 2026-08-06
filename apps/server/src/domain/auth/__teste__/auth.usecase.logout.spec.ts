import { LogoutUseCase } from "../usecase/logoutUseCase";
import { AuthRepository } from "../repositories/authRepository";
import { HashService } from "../services/hashService";

import { describe, expect, it, jest } from "@jest/globals";
import { beforeEach } from "@jest/globals";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAuthRepo = {
  revokeRefreshToken: jest.fn(),
} as unknown as jest.Mocked<AuthRepository>;

const hashSha256 = (plain: string) => `hashed:${plain}`;

const mockHashService = {
  hashSha256: jest.fn(hashSha256),
} as unknown as jest.Mocked<HashService>;

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeSut = () => new LogoutUseCase(mockAuthRepo, mockHashService);

type Cookie = { value: string } | null;

const makeCookieStore = (tokenValue?: string) => {
  const getMock = jest.fn<(name: string) => Promise<Cookie>>();

  getMock.mockResolvedValue(
    tokenValue !== undefined ? { value: tokenValue } : null,
  );

  return {
    get: getMock,
    delete: jest.fn(),
  };
};

const makeCtx = (tokenValue?: string) => ({
  request: {
    cookieStore: makeCookieStore(tokenValue),
  },
});

// ── Simula o resolver de logout (extraído para ser testável) ──────────────────

const logoutResolver = async (ctx: ReturnType<typeof makeCtx>) => {
  const refreshToken = await ctx.request.cookieStore?.get("refreshToken");
  if (!refreshToken?.value) {
    throw new Error("Invalid or missing refresh token.");
  }

  const usecase = new LogoutUseCase(mockAuthRepo, mockHashService);
  await usecase.execute(refreshToken?.value);

  ctx.request.cookieStore?.delete("refreshToken");
  return true;
};

// ── Tests: LogoutUseCase ──────────────────────────────────────────────────────

describe("LogoutUseCase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHashService.hashSha256.mockImplementation(hashSha256);
  });

  it("should hash the token and call revokeRefreshToken with the hash", async () => {
    mockAuthRepo.revokeRefreshToken.mockResolvedValue(undefined);

    const sut = makeSut();
    await sut.execute("valid_refresh_token");

    expect(mockHashService.hashSha256).toHaveBeenCalledWith("valid_refresh_token");
    expect(mockAuthRepo.revokeRefreshToken).toHaveBeenCalledWith(
      "hashed:valid_refresh_token",
    );
    expect(mockAuthRepo.revokeRefreshToken).toHaveBeenCalledTimes(1);
  });

  it("should resolve without returning a value", async () => {
    mockAuthRepo.revokeRefreshToken.mockResolvedValue(undefined);

    const sut = makeSut();
    const result = await sut.execute("valid_refresh_token");

    expect(result).toBeUndefined();
  });

  it("should propagate errors thrown by revokeRefreshToken", async () => {
    mockAuthRepo.revokeRefreshToken.mockRejectedValue(new Error("DB error"));

    const sut = makeSut();
    await expect(sut.execute("any_token")).rejects.toThrow("DB error");
  });
});

// ── Tests: logout resolver ────────────────────────────────────────────────────

describe("logout resolver", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHashService.hashSha256.mockImplementation(hashSha256);
  });

  describe("when refresh token cookie is present", () => {
    it("should return true on successful logout", async () => {
      mockAuthRepo.revokeRefreshToken.mockResolvedValue(undefined);
      const ctx = makeCtx("valid_refresh_token");

      const result = await logoutResolver(ctx);

      expect(result).toBe(true);
    });

    it("should revoke the hashed token from the cookie", async () => {
      mockAuthRepo.revokeRefreshToken.mockResolvedValue(undefined);
      const ctx = makeCtx("valid_refresh_token");

      await logoutResolver(ctx);

      expect(mockAuthRepo.revokeRefreshToken).toHaveBeenCalledWith(
        "hashed:valid_refresh_token",
      );
    });

    it("should delete the refreshToken cookie after revoking", async () => {
      mockAuthRepo.revokeRefreshToken.mockResolvedValue(undefined);
      const ctx = makeCtx("valid_refresh_token");

      await logoutResolver(ctx);

      expect(ctx.request.cookieStore.delete).toHaveBeenCalledWith("refreshToken");
    });

    it("should hash and revoke even if a different token value is used", async () => {
      mockAuthRepo.revokeRefreshToken.mockResolvedValue(undefined);
      const ctx = makeCtx("another_token_abc");

      await logoutResolver(ctx);

      expect(mockAuthRepo.revokeRefreshToken).toHaveBeenCalledWith(
        "hashed:another_token_abc",
      );
      expect(ctx.request.cookieStore.delete).toHaveBeenCalledWith("refreshToken");
    });
  });

  describe("when refresh token cookie is absent or invalid", () => {
    it("should throw when cookieStore returns null", async () => {
      const ctx = makeCtx(undefined);

      await expect(logoutResolver(ctx)).rejects.toThrow(
        "Invalid or missing refresh token.",
      );
    });

    it("should throw when cookie value is an empty string", async () => {
      const ctx = makeCtx("");

      await expect(logoutResolver(ctx)).rejects.toThrow(
        "Invalid or missing refresh token.",
      );
    });

    it("should not call revokeRefreshToken when token is missing", async () => {
      const ctx = makeCtx(undefined);

      await expect(logoutResolver(ctx)).rejects.toThrow();

      expect(mockAuthRepo.revokeRefreshToken).not.toHaveBeenCalled();
    });

    it("should not delete the cookie when token is missing", async () => {
      const ctx = makeCtx(undefined);

      await expect(logoutResolver(ctx)).rejects.toThrow();

      expect(ctx.request.cookieStore.delete).not.toHaveBeenCalled();
    });
  });

  describe("when revokeRefreshToken fails", () => {
    it("should propagate the repository error", async () => {
      mockAuthRepo.revokeRefreshToken.mockRejectedValue(new Error("DB unavailable"));
      const ctx = makeCtx("valid_refresh_token");

      await expect(logoutResolver(ctx)).rejects.toThrow("DB unavailable");
    });

    it("should not delete the cookie if revocation throws", async () => {
      mockAuthRepo.revokeRefreshToken.mockRejectedValue(new Error("DB unavailable"));
      const ctx = makeCtx("valid_refresh_token");

      await expect(logoutResolver(ctx)).rejects.toThrow();

      expect(ctx.request.cookieStore.delete).not.toHaveBeenCalled();
    });
  });
});
