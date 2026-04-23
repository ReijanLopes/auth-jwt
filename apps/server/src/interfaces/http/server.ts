import express from "express";
import { createYoga } from "graphql-yoga";
import { schema } from "../graphql/schema";
import { useCookies } from '@whatwg-node/server-plugin-cookies'

export function createServer() {
  const app = express();

  app.use(express.json());

  const yoga = createYoga({
    schema,
    graphqlEndpoint: "/graphql",
    plugins: [useCookies()],
    context: ({ request }) => {
      return {request};
    },
  });

  app.use("/graphql", yoga);

  return app;
}