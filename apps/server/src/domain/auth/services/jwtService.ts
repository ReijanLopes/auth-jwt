import jwt from "jsonwebtoken";
import "dotenv/config"

export type JwtPayload = {
  sub: string;   // userId
  role: string;
  iat?: number;
  exp?: number;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export interface JwtService {
  generateTokenPair(payload: Omit<JwtPayload, "iat" | "exp">): TokenPair;
  verifyAccessToken(token: string): JwtPayload;
  verifyRefreshToken(token: string): JwtPayload;
}

export class JwtService implements JwtService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor() {
    this.accessSecret = process.env.JWT_ACCESS_SECRET!;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET!;

    if (!this.accessSecret || !this.refreshSecret) {
      throw new Error("JWT secrets must be defined in environment variables.");
    }
  }

  generateTokenPair(payload: Omit<JwtPayload, "iat" | "exp">): TokenPair {
    const accessToken = jwt.sign(payload, this.accessSecret, {
      expiresIn: "15m",
    });

    const refreshToken = jwt.sign(payload, this.refreshSecret, {
      expiresIn: "7d",
    });

    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, this.accessSecret) as JwtPayload;
  }

  verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, this.refreshSecret) as JwtPayload;
  }
}