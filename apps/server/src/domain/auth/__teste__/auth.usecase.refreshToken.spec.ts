import { RefreshTokenUseCase } from "../usecase/refreshTokenUseCase";
import { AuthRepository } from "../repositories/authRepository";
import { JwtService, TokenPair } from "../services/jwtService";
import { RefreshToken } from "../entities/refreshToken";

import { describe, expect, it, jest } from "@jest/globals";
import { beforeEach } from "@jest/globals";
import { HashService } from "../services/hashService";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockAuthRepo = {
  findRefreshToken: jest.fn(),
  revokeRefreshToken: jest.fn(),
  saveRefreshToken: jest.fn(),
  revokeAllUserTokens: jest.fn(),
} as unknown as jest.Mocked<AuthRepository>;

const mockJwtService = {
  verifyRefreshToken: jest.fn(),
  verifyAccessToken: jest.fn(),
  generateTokenPair: jest.fn(),
} as unknown as jest.Mocked<JwtService>;

const mockHashService = {
  hashSha256: jest.fn().mockReturnValue('hashed-refresh-token'),
  hashBcrypt: jest.fn(),
  compareBcrypt: jest.fn(),
} as unknown as jest.Mocked<HashService>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TOKEN = "valid-refresh-token";
const TOKEN_HASH = "hashed-token-abc123";

const PAYLOAD = { sub: "user-42", role: "user" };

const TOKEN_PAIR: TokenPair = {
  accessToken: "new-access-token",
  refreshToken: "new-refresh-token",
};

function makeStoredToken(overrides?: Partial<{ isExpired: () => boolean }>) {
  return {
    isExpired: jest.fn().mockReturnValue(false),
    ...overrides,
  } as unknown as RefreshToken;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("RefreshTokenUseCase", () => {
  let useCase: RefreshTokenUseCase;

  beforeEach(() => {
    jest.clearAllMocks();

    useCase = new RefreshTokenUseCase(
      mockAuthRepo,
      mockJwtService,
      mockHashService,
    );

    // Default happy-path stubs
    mockHashService.hashSha256.mockReturnValue(TOKEN_HASH);
    mockAuthRepo.findRefreshToken.mockResolvedValue(makeStoredToken());
    mockJwtService.verifyRefreshToken.mockReturnValue(PAYLOAD);
    mockJwtService.generateTokenPair.mockReturnValue(TOKEN_PAIR);
    mockAuthRepo.revokeRefreshToken.mockResolvedValue(undefined);
    mockAuthRepo.saveRefreshToken.mockResolvedValue(undefined);
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  describe("when token is valid", () => {
    it("returns a new token pair", async () => {
      const result = await useCase.execute(TOKEN);

      expect(result).toEqual(TOKEN_PAIR);
    });

    it("hashes the incoming token before querying the repository", async () => {
      await useCase.execute(TOKEN);

      expect(mockHashService.hashSha256).toHaveBeenCalledWith(TOKEN);
      expect(mockAuthRepo.findRefreshToken).toHaveBeenCalledWith(TOKEN_HASH);
    });

    it("verifies the JWT signature", async () => {
      await useCase.execute(TOKEN);

      expect(mockJwtService.verifyRefreshToken).toHaveBeenCalledWith(TOKEN);
    });

    it("revokes the old token before issuing a new one", async () => {
      await useCase.execute(TOKEN);

      expect(mockAuthRepo.revokeRefreshToken).toHaveBeenCalledWith(TOKEN_HASH);
    });

    it("generates the new token pair with the correct payload", async () => {
      await useCase.execute(TOKEN);

      expect(mockJwtService.generateTokenPair).toHaveBeenCalledWith({
        sub: PAYLOAD.sub,
        role: PAYLOAD.role,
      });
    });

    it("persists the new refresh token to the repository", async () => {
      await useCase.execute(TOKEN);

      expect(mockAuthRepo.saveRefreshToken).toHaveBeenCalledTimes(1);

      const savedToken: RefreshToken =
        mockAuthRepo.saveRefreshToken.mock.calls[0][0];

      expect(savedToken).toBeDefined();
    });

    it("saves a refresh token linked to the correct userId", async () => {
      await useCase.execute(TOKEN);

      const savedToken: RefreshToken =
        mockAuthRepo.saveRefreshToken.mock.calls[0][0];

      // RefreshToken.create sets userId from payload.sub
      expect((savedToken as any).userId ?? (savedToken as any).props?.userId).toBe(
        PAYLOAD.sub,
      );
    });

    it("sets the new refresh token expiry approximately 7 days from now", async () => {
      const before = Date.now();
      await useCase.execute(TOKEN);
      const after = Date.now();

      const savedToken = mockAuthRepo.saveRefreshToken.mock.calls[0][0] as any;
      const expiresAt: Date =
        savedToken.expiresAt ?? savedToken.props?.expiresAt;

      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(after + sevenDaysMs);
    });

    it("executes operations in the correct order (revoke → generate → save)", async () => {
      const order: string[] = [];

      mockAuthRepo.revokeRefreshToken.mockImplementation(async () => {
        order.push("revoke");
      });
      mockJwtService.generateTokenPair.mockImplementation(() => {
        order.push("generate");
        return TOKEN_PAIR;
      });
      mockAuthRepo.saveRefreshToken.mockImplementation(async () => {
        order.push("save");
      });

      await useCase.execute(TOKEN);

      expect(order).toEqual(["revoke", "generate", "save"]);
    });
  });

  // ── Token not found ─────────────────────────────────────────────────────────

  describe("when token is not found in the repository", () => {
    beforeEach(() => {
      mockAuthRepo.findRefreshToken.mockResolvedValue(null);
    });

    it("throws 'Invalid or expired refresh token.'", async () => {
      await expect(useCase.execute(TOKEN)).rejects.toThrow(
        "Invalid or expired refresh token.",
      );
    });

    it("does not attempt to revoke or issue new tokens", async () => {
      await expect(useCase.execute(TOKEN)).rejects.toThrow();

      expect(mockAuthRepo.revokeRefreshToken).not.toHaveBeenCalled();
      expect(mockJwtService.generateTokenPair).not.toHaveBeenCalled();
      expect(mockAuthRepo.saveRefreshToken).not.toHaveBeenCalled();
    });
  });

  // ── Token expired ───────────────────────────────────────────────────────────

  describe("when stored token is expired", () => {
    beforeEach(() => {
      mockAuthRepo.findRefreshToken.mockResolvedValue(
        makeStoredToken({ isExpired: () => true }),
      );
    });

    it("throws 'Invalid or expired refresh token.'", async () => {
      await expect(useCase.execute(TOKEN)).rejects.toThrow(
        "Invalid or expired refresh token.",
      );
    });

    it("does not attempt to revoke or issue new tokens", async () => {
      await expect(useCase.execute(TOKEN)).rejects.toThrow();

      expect(mockAuthRepo.revokeRefreshToken).not.toHaveBeenCalled();
      expect(mockJwtService.generateTokenPair).not.toHaveBeenCalled();
      expect(mockAuthRepo.saveRefreshToken).not.toHaveBeenCalled();
    });
  });

  // ── Invalid JWT signature ───────────────────────────────────────────────────

  describe("when JWT verification fails", () => {
    beforeEach(() => {
      mockJwtService.verifyRefreshToken.mockImplementation(() => {
        throw new Error("JsonWebTokenError: invalid signature");
      });
    });

    it("propagates the JWT error", async () => {
      await expect(useCase.execute(TOKEN)).rejects.toThrow(
        "JsonWebTokenError: invalid signature",
      );
    });

    it("does not revoke the token or issue new ones", async () => {
      await expect(useCase.execute(TOKEN)).rejects.toThrow();

      expect(mockAuthRepo.revokeRefreshToken).not.toHaveBeenCalled();
      expect(mockJwtService.generateTokenPair).not.toHaveBeenCalled();
      expect(mockAuthRepo.saveRefreshToken).not.toHaveBeenCalled();
    });
  });

  // ── Repository errors ───────────────────────────────────────────────────────

  describe("when the repository throws during revokeRefreshToken", () => {
    beforeEach(() => {
      mockAuthRepo.revokeRefreshToken.mockRejectedValue(
        new Error("DB connection lost"),
      );
    });

    it("propagates the repository error", async () => {
      await expect(useCase.execute(TOKEN)).rejects.toThrow("DB connection lost");
    });

    it("does not save a new refresh token", async () => {
      await expect(useCase.execute(TOKEN)).rejects.toThrow();

      expect(mockAuthRepo.saveRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe("when the repository throws during saveRefreshToken", () => {
    beforeEach(() => {
      mockAuthRepo.saveRefreshToken.mockRejectedValue(
        new Error("Write failed"),
      );
    });

    it("propagates the repository error", async () => {
      await expect(useCase.execute(TOKEN)).rejects.toThrow("Write failed");
    });
  });
});