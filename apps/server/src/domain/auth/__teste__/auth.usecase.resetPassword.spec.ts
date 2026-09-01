import { ResetPasswordUseCase } from "../usecase/resetPasswordUseCase";
import { UserRepository } from "../../user/repositories/userRepository";
import { AuthRepository } from "../repositories/authRepository";
import { HashService } from "../services/hashService";
import { PasswordResetToken } from "../entities/passwordResetToken";
import { Role, UserRole } from "../../role/entities/role";
import { User } from "../../user/entities/user";

import { describe, expect, it, jest } from "@jest/globals";

describe("ResetPasswordUseCase", () => {
  const makeSut = () => {
    const userRepo: jest.Mocked<UserRepository> = {
      findById: jest.fn(),
      updatePassword: jest.fn(),
    } as any;

    const authRepo: jest.Mocked<AuthRepository> = {
      findPasswordResetToken: jest.fn(),
      revokePasswordResetToken: jest.fn(),
      revokeAllUserTokens: jest.fn(),
    } as any;

    const hashService: jest.Mocked<HashService> = {
      hashBcrypt: jest.fn(),
      hashSha256: jest.fn(),
      compareBcrypt: jest.fn(),
    };

    const sut = new ResetPasswordUseCase(userRepo, authRepo, hashService);

    return { sut, userRepo, authRepo, hashService };
  };

  const makeUser = () => {
    const role = Role.from({ name: UserRole.EMPLOYEE, level: 1 });

    return User.create({
      name: "John Doe",
      email: "john@email.com",
      phone: "(27) 99999-9999",
      password: "hashed-password",
      taxId: "12345678909",
      role,
      companyId: "11111111-1111-1111-1111-111111111111",
      departmentId: "22222222-2222-2222-2222-222222222222",
      isActive: true,
    });
  };

  const makeInput = () => ({
    token: "raw-token",
    newPassword: "Valid123",
  });

  it("should reset the password successfully", async () => {
    const { sut, userRepo, authRepo, hashService } = makeSut();

    const user = makeUser();
    const resetToken = PasswordResetToken.create({
      userId: user.getId,
      token: "hashed-token",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    hashService.hashSha256.mockReturnValue("hashed-token");
    authRepo.findPasswordResetToken.mockResolvedValue(resetToken);
    userRepo.findById.mockResolvedValue(user);
    hashService.hashBcrypt.mockResolvedValue("new-hashed-password");

    await sut.execute(makeInput());

    expect(userRepo.updatePassword).toHaveBeenCalledWith(
      user.getId,
      "new-hashed-password",
    );
    expect(authRepo.revokePasswordResetToken).toHaveBeenCalledWith(
      "hashed-token",
    );
    expect(authRepo.revokeAllUserTokens).toHaveBeenCalledWith(user.getId);
  });

  it("should throw if the token is invalid or not found", async () => {
    const { sut, authRepo } = makeSut();

    authRepo.findPasswordResetToken.mockResolvedValue(null);

    await expect(sut.execute(makeInput())).rejects.toThrow(
      "Invalid or expired password reset token.",
    );
  });

  it("should throw if the token is expired", async () => {
    const { sut, authRepo } = makeSut();

    const expiredToken = PasswordResetToken.create({
      userId: "some-user-id",
      token: "hashed-token",
      expiresAt: new Date(Date.now() - 1000),
    });
    authRepo.findPasswordResetToken.mockResolvedValue(expiredToken);

    await expect(sut.execute(makeInput())).rejects.toThrow(
      "Invalid or expired password reset token.",
    );
  });

  it("should throw if the user no longer exists", async () => {
    const { sut, authRepo, userRepo } = makeSut();

    const resetToken = PasswordResetToken.create({
      userId: "some-user-id",
      token: "hashed-token",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    authRepo.findPasswordResetToken.mockResolvedValue(resetToken);
    userRepo.findById.mockResolvedValue(null);

    await expect(sut.execute(makeInput())).rejects.toThrow(
      "Invalid or expired password reset token.",
    );
  });

  it("should throw if the new password is invalid", async () => {
    const { sut } = makeSut();

    await expect(
      sut.execute({ ...makeInput(), newPassword: "123" }),
    ).rejects.toThrow("Invalid password.");
  });
});
