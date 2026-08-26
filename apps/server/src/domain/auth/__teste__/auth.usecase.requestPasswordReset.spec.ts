import { RequestPasswordResetUseCase } from "../usecase/requestPasswordResetUseCase";
import { UserRepository } from "../../user/repositories/userRepository";
import { AuthRepository } from "../repositories/authRepository";
import { HashService } from "../services/hashService";
import { MailerService } from "../services/mailerService";
import { Role, UserRole } from "../../role/entities/role";
import { User } from "../../user/entities/user";

import { describe, expect, it, jest } from "@jest/globals";

describe("RequestPasswordResetUseCase", () => {
  const makeSut = () => {
    const userRepo: jest.Mocked<UserRepository> = {
      findByEmail: jest.fn(),
    } as any;

    const authRepo: jest.Mocked<AuthRepository> = {
      revokeAllUserPasswordResetTokens: jest.fn(),
      savePasswordResetToken: jest.fn(),
    } as any;

    const hashService: jest.Mocked<HashService> = {
      hashBcrypt: jest.fn(),
      hashSha256: jest.fn(),
      compareBcrypt: jest.fn(),
    };

    const mailerService: jest.Mocked<MailerService> = {
      sendPasswordResetEmail: jest.fn(),
    };

    const sut = new RequestPasswordResetUseCase(
      userRepo,
      authRepo,
      hashService,
      mailerService,
    );

    return { sut, userRepo, authRepo, hashService, mailerService };
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

  it("should generate and send a reset token when the user exists", async () => {
    const { sut, userRepo, authRepo, hashService, mailerService } = makeSut();

    const user = makeUser();
    userRepo.findByEmail.mockResolvedValue(user);
    hashService.hashSha256.mockReturnValue("hashed-reset-token");

    await sut.execute({ email: "john@email.com" });

    expect(authRepo.revokeAllUserPasswordResetTokens).toHaveBeenCalledWith(
      user.getId,
    );
    expect(authRepo.savePasswordResetToken).toHaveBeenCalled();
    expect(mailerService.sendPasswordResetEmail).toHaveBeenCalledWith(
      user.getEmail,
      expect.any(String),
    );
  });

  it("should do nothing when the user does not exist", async () => {
    const { sut, userRepo, authRepo, mailerService } = makeSut();

    userRepo.findByEmail.mockResolvedValue(null);

    await sut.execute({ email: "unknown@email.com" });

    expect(authRepo.savePasswordResetToken).not.toHaveBeenCalled();
    expect(mailerService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("should do nothing when the user is deactivated", async () => {
    const { sut, userRepo, authRepo, mailerService } = makeSut();

    const user = makeUser();
    user.deactivate();
    userRepo.findByEmail.mockResolvedValue(user);

    await sut.execute({ email: user.getEmail });

    expect(authRepo.savePasswordResetToken).not.toHaveBeenCalled();
    expect(mailerService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });
});
