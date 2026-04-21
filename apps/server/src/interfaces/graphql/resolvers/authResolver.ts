import { YogaInitialContext } from "graphql-yoga";
import { BcryptHashService } from "../../../domain/auth/services/hashService";
import { JwtService } from "../../../domain/auth/services/jwtService";
import { PrismaAuthRepository } from "../../../infrastructure/database/prisma/repositories/prismaAuthRepository";
import { PrismaRoleRepository } from "../../../infrastructure/database/prisma/repositories/prismaRoleRepository";
import { PrismaUserRepository } from "../../../infrastructure/database/prisma/repositories/prismaUserRepository";
import {
  RegisterInput,
  RegisterUseCase,
} from "../../../domain/auth/usecase/registerUseCase";

type LoginInput = {
  email: string;
  password: string;
};

// type RegisterInput = {
//   name: string;
//   email: string;
//   phone: string;
//   password: string;
//   taxId: string;
//   role: string;
// };

const isProd = process.env.NODE_ENV === "production";

const userRepo = new PrismaUserRepository();
const authRepo = new PrismaAuthRepository();
const roleRepo = new PrismaRoleRepository();
const hashService = new BcryptHashService();
const jwtService = new JwtService();

function setTokenCookie(
  ctx: YogaInitialContext,
  token: string,
  name: string,
  isProd: boolean,
  expiresIn: number,
) {
  ctx.request.cookieStore?.set({
    name: name,
    value: token,
    domain: isProd ? "nuna.com" : "localhost",
    path: "/",
    expires: new Date(Date.now() + expiresIn),
    secure: isProd,
    sameSite: "lax",
    httpOnly: true,
  });
}

export const authResolvers = {
  Mutation: {
    login: async (
      _: unknown,
      { input }: { input: LoginInput },
      ctx: YogaInitialContext,
    ) => {
      return null;
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

      setTokenCookie(
        ctx,
        tokenPair.refreshToken,
        "refreshToken",
        isProd,
        7 * 24 * 60 * 60 * 1000,
      ); // 7 dias

      return { accessToken: tokenPair.accessToken };
    },
    refreshToken: async (_: unknown, __: unknown) => {
      return false;
    },
    logout: async (_: unknown, __: unknown) => {
      return false;
    },
  },
};
