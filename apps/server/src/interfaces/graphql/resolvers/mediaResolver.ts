type MediaInput = { id: string, url?: string, type?: string }

export const mediaResolvers = {
  Query: {
    medias: async (_: unknown, __: unknown) => {
      return [];
    },
    media: async (_: unknown, { id }: { id: string }) => {
      return null;
    },
  },
  Mutation: {
    updateMedia: async (_: unknown, { id, url, type }: MediaInput) => {
      return null;
    },
    deleteMedia: async (_: unknown, { id }: { id: string }) => {
      return false;
    }
  }
};