import { AuthRepository } from "../repositories/authRepository";
import { HashService } from "../services/hashService";

export class LogoutUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly hashService: HashService,
  ) {}

  async execute(refreshToken: string): Promise<void> {
    const tokenHash = this.hashService.hashSha256(refreshToken);
    await this.authRepo.revokeRefreshToken(tokenHash);
  }
}