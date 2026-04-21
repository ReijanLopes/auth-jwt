import { RefreshToken } from "../entities/refreshToken";

export interface AuthRepository {
  saveRefreshToken(refreshToken: RefreshToken): Promise<void>;
  findRefreshToken(token: string): Promise<RefreshToken | null>;
  revokeRefreshToken(token: string): Promise<void>;
  revokeAllUserTokens(userId: string): Promise<void>;
}