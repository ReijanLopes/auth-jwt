export const authTypeDefs = `#graphql
  type AuthPayload {
    accessToken: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input RegisterInput {
    name: String!
    email: String!
    phone: String!
    password: String!
    taxId: String!
  }

  type Mutation {
    login(input: LoginInput!): AuthPayload!
    register(input: RegisterInput!): AuthPayload!
    refreshToken: AuthPayload!
    logout: Boolean!
  }
`;