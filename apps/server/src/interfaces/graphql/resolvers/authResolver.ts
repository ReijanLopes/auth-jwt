import { YogaInitialContext } from "graphql-yoga";
import { BcryptHashService } from "../../../domain/auth/services/hashService";
import { JwtService } from "../../../domain/auth/services/jwtService";
import { PrismaAuthRepository } from "../../../infrastructure/database/prisma/repositories/prismaAuthRepository";
import { PrismaRoleRepository } from "../../../infrastructure/database/prisma/repositories/prismaRoleRepository";
import { PrismaUserRepository } from "../../../infrastructure/database/prisma/repositories/prismaUserRepository";
import { RegisterInput, RegisterUseCase } from "../../../domain/auth/usecase/registerUseCase";
import { LoginUseCase } from "../../../domain/auth/usecase/loginUseCase";
import { LogoutUseCase } from "../../../domain/auth/usecase/logoutUseCase";
import { RefreshTokenUseCase } from "../../../domain/auth/usecase/refreshTokenUseCase";
import { CookieService } from "../../../infrastructure/http/services/cookieService";

type LoginInput = {
  email: string;
  password: string;
};

const userRepo = new PrismaUserRepository();
const authRepo = new PrismaAuthRepository();
const roleRepo = new PrismaRoleRepository();
const hashService = new BcryptHashService();
const jwtService = new JwtService();
const cookieService = new CookieService();

export const authResolvers = {
  Mutation: {
    login: async (
      _: unknown,
      { input }: { input: LoginInput },
      ctx: YogaInitialContext,
    ) => {
      const { email, password } = input;

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
      ctx: YogaInitialContext,
    ) => {
      const { name, email, phone, password, taxId, role } = input;

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
    refreshToken: async (_: unknown, __: unknown, ctx: YogaInitialContext) => {
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
    logout: async (_: unknown, __: unknown, ctx: YogaInitialContext) => {
      const refreshToken = await cookieService.getToken(ctx, "refreshToken");
      if (!refreshToken) {
        throw new Error(
          "Invalid or missing refresh token.",
        );
      }

      const usecase = new LogoutUseCase(authRepo);
      await usecase.execute(refreshToken);

      cookieService.deleteToken(ctx, "refreshToken");
      return false;
    },
    getMe: async (_: unknown, __: unknown, ctx: YogaInitialContext) => {
      const refreshToken = await cookieService.getToken(ctx, "refreshToken");
      return null;
    }
  },
};
