import { MailerService } from "../../domain/auth/services/mailerService";

// Stub sem provedor de e-mail configurado: loga o link em vez de enviar.
// Trocar por uma implementação real (SMTP, SES, Resend, etc.) quando houver um provedor.
export class ConsoleMailerService implements MailerService {
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
    console.log(`[mailer] Password reset link for ${email}: ${resetUrl}`);
  }
}
