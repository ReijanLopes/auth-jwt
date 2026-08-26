import { prisma } from "../client";
import { RefreshToken } from "../../../../domain/auth/entities/refreshToken";
import { PasswordResetToken } from "../../../../domain/auth/entities/passwordResetToken";
import { AuthRepository } from "../../../../domain/auth/repositories/authRepository";

export class PrismaAuthRepository implements AuthRepository {

  async saveRefreshToken(refreshToken: RefreshToken): Promise<void> {
    await prisma.refreshToken.create({
      data: {
        id:        refreshToken.getId,
        userId:    refreshToken.getUserId,
        token:     refreshToken.getToken,
        expiresAt: refreshToken.getExpiresAt,
      },
    });
  }

  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    const record = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!record) return null;

    return RefreshToken.create({
      id:        record.id,
      userId:    record.userId,
      token:     record.token,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
    });
  }

  async revokeRefreshToken(token: string): Promise<void> {
    
    await prisma.refreshToken.delete({
      where: { token },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async savePasswordResetToken(resetToken: PasswordResetToken): Promise<void> {
    await prisma.passwordResetToken.create({
      data: {
        id:        resetToken.getId,
        userId:    resetToken.getUserId,
        token:     resetToken.getToken,
        expiresAt: resetToken.getExpiresAt,
      },
    });
  }

  async findPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record) return null;

    return PasswordResetToken.create({
      id:        record.id,
      userId:    record.userId,
      token:     record.token,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
    });
  }

  async revokePasswordResetToken(token: string): Promise<void> {
    await prisma.passwordResetToken.deleteMany({
      where: { token },
    });
  }

  async revokeAllUserPasswordResetTokens(userId: string): Promise<void> {
    await prisma.passwordResetToken.deleteMany({
      where: { userId },
    });
  }
}