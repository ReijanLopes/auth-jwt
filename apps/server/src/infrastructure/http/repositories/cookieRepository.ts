import { YogaInitialContext } from "graphql-yoga";

export interface ICookieService {
  setToken(ctx: YogaInitialContext, token: string, name: string, expiresIn: number): void;
  getToken(ctx: YogaInitialContext, name: string): Promise<string | undefined>;
  deleteToken(ctx: YogaInitialContext, name: string): void;
}