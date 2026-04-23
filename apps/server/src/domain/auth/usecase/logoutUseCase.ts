import { AuthRepository } from "../repositories/authRepository";

export class LogoutUseCase {
  constructor(private readonly authRepo: AuthRepository) {}

  async execute(refreshToken: string): Promise<void> {
    await this.authRepo.revokeRefreshToken(refreshToken);
  }
}