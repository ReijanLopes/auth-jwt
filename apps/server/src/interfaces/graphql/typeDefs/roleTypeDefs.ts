export const roleTypeDefs = /* GraphQL */ `
  type Role {
    id: ID!
    name: String!
    level: Int!
  }

  type Query {
    roles: [Role!]!
    role(id: ID!): Role
  }

  type Mutation {
    updateRole(id: ID!, name: String, level: Int): Role!
    deleteRole(id: ID!): Boolean!
  }
`;