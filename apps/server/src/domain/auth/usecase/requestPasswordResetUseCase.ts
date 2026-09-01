import { UserRepository } from "../../user/repositories/userRepository";
import { AuthRepository } from "../repositories/authRepository";
import { HashService } from "../services/hashService";
import { MailerService } from "../services/mailerService";
import { PasswordResetToken } from "../entities/passwordResetToken";

type RequestPasswordResetInput = {
  email: string;
};

export class RequestPasswordResetUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly authRepo: AuthRepository,
    private readonly hashService: HashService,
    private readonly mailerService: MailerService,
  ) {}

  async execute(input: RequestPasswordResetInput): Promise<void> {
    const user = await this.userRepo.findByEmail(input.email);
    // Não revela se o e-mail existe ou não, para evitar enumeração de usuários.
    if (!user || !user.getIsActive) {
      return;
    }

    await this.authRepo.revokeAllUserPasswordResetTokens(user.getId);

    const rawToken = crypto.randomUUID();
    const hashedToken = this.hashService.hashSha256(rawToken);

    const resetToken = PasswordResetToken.create({
      userId: user.getId,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
    });

    await this.authRepo.savePasswordResetToken(resetToken);
    await this.mailerService.sendPasswordResetEmail(user.getEmail, rawToken);
  }
}
