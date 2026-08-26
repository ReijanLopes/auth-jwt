import { BcryptHashService } from "../../../domain/auth/services/hashService";
import { JwtService } from "../../../domain/auth/services/jwtService";
import { PrismaAuthRepository } from "../../../infrastructure/database/prisma/repositories/prismaAuthRepository";
import { PrismaRoleRepository } from "../../../infrastructure/database/prisma/repositories/prismaRoleRepository";
import { PrismaUserRepository } from "../../../infrastructure/database/prisma/repositories/prismaUserRepository";
import { RegisterInput, RegisterUseCase } from "../../../domain/auth/usecase/registerUseCase";
import { LoginUseCase } from "../../../domain/auth/usecase/loginUseCase";
import { LogoutUseCase } from "../../../domain/auth/usecase/logoutUseCase";
import { RefreshTokenUseCase } from "../../../domain/auth/usecase/refreshTokenUseCase";
import { RequestPasswordResetUseCase } from "../../../domain/auth/usecase/requestPasswordResetUseCase";
import { ResetPasswordUseCase } from "../../../domain/auth/usecase/resetPasswordUseCase";
import { CookieService } from "../../../infrastructure/http/services/cookieService";
import { ConsoleMailerService } from "../../../infrastructure/mail/consoleMailerService";
import { RateLimiter } from "../../../infrastructure/http/rateLimiter";
import { GraphQLContext, getClientIp } from "../context";

type LoginInput = {
  email: string;
  password: string;
};

type ResetPasswordInput = {
  token: string;
  newPassword: string;
};

const userRepo = new PrismaUserRepository();
const authRepo = new PrismaAuthRepository();
const roleRepo = new PrismaRoleRepository();
const hashService = new BcryptHashService();
const jwtService = new JwtService();
const cookieService = new CookieService();
const mailerService = new ConsoleMailerService();

// 5 tentativas de login por IP a cada 15 minutos
const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000);
// 5 cadastros por IP a cada 1 hora
const registerRateLimiter = new RateLimiter(5, 60 * 60 * 1000);
// 3 pedidos de reset de senha por IP a cada 15 minutos
const passwordResetRateLimiter = new RateLimiter(3, 15 * 60 * 1000);

export const authResolvers = {
  Mutation: {
    login: async (
      _: unknown,
      { input }: { input: LoginInput },
      ctx: GraphQLContext,
    ) => {
      const { email, password } = input;

      loginRateLimiter.consume(getClientIp(ctx));

      const usecase = new LoginUseCase(
        userRepo,
        authRepo,
        hashService,
        jwtService,
      );
      const tokenPair = await usecase.execute({ email, password });

      cookieService.setToken(
        ctx,
        tokenPair.refreshToken,
        "refreshToken",
        7 * 24 * 60 * 60 * 1000,
      );

      return { accessToken: tokenPair.accessToken };
    },
    register: async (
      _: unknown,
      { input }: { input: RegisterInput },
      ctx: GraphQLContext,
    ) => {
      const { name, email, phone, password, taxId, role } = input;

      registerRateLimiter.consume(getClientIp(ctx));

      const usecase = new RegisterUseCase(
        userRepo,
        authRepo,
        roleRepo,
        hashService,
        jwtService,
      );

      const tokenPair = await usecase.execute({
        name,
        email,
        phone,
        password,
        taxId,
        role,
      });

      cookieService.setToken(
        ctx,
        tokenPair.refreshToken,
        "refreshToken",
        7 * 24 * 60 * 60 * 1000,
      );

      return { accessToken: tokenPair.accessToken };
    },
    refreshToken: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const refreshToken = await cookieService.getToken(ctx, "refreshToken");
      if (!refreshToken) {
        throw new Error("Invalid or missing refresh token.");
      }

      const usecase = new RefreshTokenUseCase(authRepo, jwtService, hashService);
      const tokenPair = await usecase.execute(refreshToken);

      cookieService.setToken(
        ctx,
        tokenPair.refreshToken,
        "refreshToken",
        7 * 24 * 60 * 60 * 1000,
      );
      
      return { accessToken: tokenPair.accessToken };
    },
    logout: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const refreshToken = await ctx.request.cookieStore?.get("refreshToken");
      if (!refreshToken?.value) {
        throw new Error(
          "Invalid or missing refresh token.",
        );
      }

      const usecase = new LogoutUseCase(authRepo, hashService);
      await usecase.execute(refreshToken.value);

      cookieService.deleteToken(ctx, "refreshToken");
      return true;
    },
    requestPasswordReset: async (
      _: unknown,
      { email }: { email: string },
      ctx: GraphQLContext,
    ) => {
      passwordResetRateLimiter.consume(getClientIp(ctx));

      const usecase = new RequestPasswordResetUseCase(
        userRepo,
        authRepo,
        hashService,
        mailerService,
      );
      await usecase.execute({ email });

      return true;
    },
    resetPassword: async (
      _: unknown,
      { input }: { input: ResetPasswordInput },
      ctx: GraphQLContext,
    ) => {
      passwordResetRateLimiter.consume(getClientIp(ctx));

      const usecase = new ResetPasswordUseCase(userRepo, authRepo, hashService);
      await usecase.execute(input);

      return true;
    },
  },
};
