export const userResolvers = {
  Query: {
    users: async (_: unknown, __: unknown) => {
      return [];
    },
    user: async (_: unknown, { id }: { id: string }) => {
      return null;
    },
  },
};