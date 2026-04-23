export const userTypeDefs = /* GraphQL */ `
  type User {
    id: ID!
    name: String
    email: String!
    phone: String
    taxId: String
    role: Role!
    media: Media
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    users: [User!]!
    user(id: ID!): User
  }
`;