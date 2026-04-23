import { createSchema } from "graphql-yoga";
import { authTypeDefs } from "./typeDefs/authTypeDefs";
import { userTypeDefs } from "./typeDefs/userTypeDefs";
import { mediaTypeDefs } from "./typeDefs/mediaTypeDefs";
import { mediaResolvers } from "./resolvers/mediaResolver";
import { authResolvers } from "./resolvers/authResolver";
import { userResolvers } from "./resolvers/userResolver";
import { roleTypeDefs } from "./typeDefs/roleTypeDefs";
import { roleResolvers } from "./resolvers/roleResolver";

export const schema = createSchema({
  typeDefs: [authTypeDefs, userTypeDefs, mediaTypeDefs, roleTypeDefs],
  resolvers: [authResolvers, userResolvers, mediaResolvers, roleResolvers],
});
