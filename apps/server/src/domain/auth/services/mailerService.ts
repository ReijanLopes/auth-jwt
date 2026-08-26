export interface MailerService {
  sendPasswordResetEmail(email: string, token: string): Promise<void>;
}
