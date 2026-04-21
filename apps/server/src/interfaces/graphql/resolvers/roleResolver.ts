type RoleInput = { id: string, name?: string, level?: number }

export const roleResolvers = {
  Query: {
    roles: async (_: unknown, __: unknown) => {
      return [];
    },
    role: async (_: unknown, { id }: { id: string }) => {
      return null;
    },
  },
  Mutation: {
    updateRole: async (_: unknown, { id, name, level}: RoleInput) => {
      return null;
    },
    deleteRole: async (_: unknown, { id }: { id: string }) => {
      return false;
    }
  }
};