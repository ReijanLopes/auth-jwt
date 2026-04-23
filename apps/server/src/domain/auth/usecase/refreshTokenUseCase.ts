import { AuthRepository } from "../repositories/authRepository";
import { JwtService, TokenPair } from "../services/jwtService";
import { RefreshToken } from "../entities/refreshToken";
import { HashService } from "../services/hashService";

export class RefreshTokenUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly hashService: HashService,
  ) {}

  async execute(token: string): Promise<TokenPair> {
    const tokenHash = this.hashService.hashSha256(token);
    const stored = await this.authRepo.findRefreshToken(tokenHash);

    console.log("Stored token:", stored);
    console.log("Is expired?", tokenHash, stored?.isExpired());
    if (!stored || stored.isExpired()) {
      throw new Error("Invalid or expired refresh token.");
    }

    const payload = this.jwtService.verifyRefreshToken(token);

    await this.authRepo.revokeRefreshToken(tokenHash);

    const tokens = this.jwtService.generateTokenPair({
      sub: payload.sub,
      role: payload.role,
    });
    const newRefreshTokenHash = this.hashService.hashSha256(tokens.refreshToken);

    const newRefreshToken = RefreshToken.create({
      userId: payload.sub,
      token: newRefreshTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await this.authRepo.saveRefreshToken(newRefreshToken);

    return tokens;
  }
}