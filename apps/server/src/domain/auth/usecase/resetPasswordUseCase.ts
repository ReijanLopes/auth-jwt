import { UserRepository } from "../../user/repositories/userRepository";
import { AuthRepository } from "../repositories/authRepository";
import { HashService } from "../services/hashService";
import { isValidPassword } from "../../../shared/validators/passwordValidator";

type ResetPasswordInput = {
  token: string;
  newPassword: string;
};

export class ResetPasswordUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly authRepo: AuthRepository,
    private readonly hashService: HashService,
  ) {}

  async execute(input: ResetPasswordInput): Promise<void> {
    if (!isValidPassword(input.newPassword)) {
      throw new Error(
        "Invalid password. Password must be at least 8 characters long and include at least one letter and one number.",
      );
    }

    const hashedToken = this.hashService.hashSha256(input.token);
    const resetToken = await this.authRepo.findPasswordResetToken(hashedToken);

    if (!resetToken || resetToken.isExpired()) {
      throw new Error("Invalid or expired password reset token.");
    }

    const user = await this.userRepo.findById(resetToken.getUserId);
    if (!user) {
      throw new Error("Invalid or expired password reset token.");
    }

    const hashedPassword = await this.hashService.hashBcrypt(input.newPassword);
    await this.userRepo.updatePassword(user.getId, hashedPassword);

    await this.authRepo.revokePasswordResetToken(hashedToken);
    await this.authRepo.revokeAllUserTokens(user.getId);
  }
}
