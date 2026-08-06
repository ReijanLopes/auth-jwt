import express from "express";
import { createYoga } from "graphql-yoga";
import { schema } from "../graphql/schema";
import { createContext } from "../graphql/context";
import { JwtService } from "../../domain/auth/services/jwtService";
import { useCookies } from '@whatwg-node/server-plugin-cookies'

export function createServer() {
  const app = express();
  const jwtService = new JwtService();

  app.use(express.json());

  const yoga = createYoga({
    schema,
    graphqlEndpoint: "/graphql",
    plugins: [useCookies()],
    context: (base) => createContext(base, jwtService),
  });

  app.use("/graphql", yoga);

  return app;
}