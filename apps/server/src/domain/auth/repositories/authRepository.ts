import { RefreshToken } from "../entities/refreshToken";
import { PasswordResetToken } from "../entities/passwordResetToken";

export interface AuthRepository {
  saveRefreshToken(refreshToken: RefreshToken): Promise<void>;
  findRefreshToken(token: string): Promise<RefreshToken | null>;
  revokeRefreshToken(token: string): Promise<void>;
  revokeAllUserTokens(userId: string): Promise<void>;

  savePasswordResetToken(resetToken: PasswordResetToken): Promise<void>;
  findPasswordResetToken(token: string): Promise<PasswordResetToken | null>;
  revokePasswordResetToken(token: string): Promise<void>;
  revokeAllUserPasswordResetTokens(userId: string): Promise<void>;
}