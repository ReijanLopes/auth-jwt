export const mediaTypeDefs = /* GraphQL */ `
  type Media {
    id: ID!
    url: String!
    type: String!
  }

  type Query {
    medias: [Media!]!
    media(id: ID!): Media
  }

  type Mutation {
    updateMedia(id: ID!, url: String, type: String): Media!
    deleteMedia(id: ID!): Boolean!
  }
`;