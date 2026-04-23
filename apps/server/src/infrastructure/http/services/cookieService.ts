import { YogaInitialContext } from "graphql-yoga";
import { ICookieService } from "../repositories/cookieRepository";

import "dotenv/config";

export class CookieService implements ICookieService {
  private isProd: boolean;
  private domain: string;

  constructor() {
    this.isProd = process.env.NODE_ENV === "production";
    this.domain = this.isProd ? "nuna.com" : "localhost";
  }

  setToken(
    ctx: YogaInitialContext, 
    token: string, 
    name: string, 
    expiresIn: number
  ): void {
    ctx.request.cookieStore?.set({
      name: name,
      value: token,
      domain: this.domain,
      path: "/",
      expires: new Date(Date.now() + expiresIn),
      secure: this.isProd,
      sameSite: "lax",
      httpOnly: true,
    });
  }

  async getToken(ctx: YogaInitialContext, name: string): Promise<string | undefined> {
    const cookie = await ctx.request.cookieStore?.get(name);
    return cookie?.value;
  }

  deleteToken(ctx: YogaInitialContext, name: string): void {
    ctx.request.cookieStore?.delete(name);
  }
}