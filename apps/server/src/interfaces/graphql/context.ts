import { YogaInitialContext } from "graphql-yoga";
import { JwtService, JwtPayload } from "../../domain/auth/services/jwtService";

type NodeRequestLike = {
  ip?: string;
  socket?: { remoteAddress?: string };
};

export type GraphQLContext = YogaInitialContext & {
  user: JwtPayload | null;
  req?: NodeRequestLike;
};

export function createContext(
  base: YogaInitialContext & { req?: NodeRequestLike },
  jwtService: JwtService,
): GraphQLContext {
  const authHeader = base.request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  let user: JwtPayload | null = null;
  if (token) {
    try {
      user = jwtService.verifyAccessToken(token);
    } catch {
      user = null;
    }
  }

  return { ...base, user };
}

export function requireAuth(ctx: GraphQLContext): JwtPayload {
  if (!ctx.user) {
    throw new Error("Authentication required.");
  }
  return ctx.user;
}

export function getClientIp(ctx: GraphQLContext): string {
  const forwardedFor = ctx.request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return ctx.req?.ip ?? ctx.req?.socket?.remoteAddress ?? "unknown";
}
