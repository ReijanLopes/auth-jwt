import { YogaInitialContext } from "graphql-yoga";

export const userResolvers = {
  Query: {
    users: async (_: unknown, __: unknown, ctx: YogaInitialContext) => {
      return [];
    },
    user: async (_: unknown, { id }: { id: string }) => {
      return null;
    },
  },
};