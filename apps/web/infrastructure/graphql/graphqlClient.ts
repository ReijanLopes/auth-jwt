import { TokenStorage } from "../storage/token.storage";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT || "http://localhost:4000/graphql";

export class GraphQLClient {
  private tokenStorage = new TokenStorage();
  private refreshingPromise: Promise<string | null> | null = null;

  constructor() {
    this.tokenStorage.setStrategy("memory");
  }

  // ─── HTTP base ────────────────────────────────────────────────────────────
  async fetch<T = any>(query: string, variables = {}, token?: string): Promise<T> {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ query, variables }),
      credentials: "include", // envia/recebe cookies (refreshToken httpOnly)
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    return response.json();
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private isUnauthenticated(json: any): boolean {
    return json.errors?.some(
      (e: any) => e.extensions?.code === "UNAUTHENTICATED"
    );
  }

  private hasErrors(json: any): boolean {
    return Array.isArray(json.errors) && json.errors.length > 0;
  }

  // ─── Token refresh (singleton em voo) ─────────────────────────────────────
  async refreshToken(): Promise<string | null> {
    // Garante que múltiplas chamadas simultâneas aguardem a mesma Promise
    if (this.refreshingPromise) return this.refreshingPromise;

    this.refreshingPromise = (async (): Promise<string | null> => {
      try {
        const res = await this.fetch<{
          data?: { refreshToken?: { accessToken: string } };
          errors?: any[];
        }>(`
          mutation {
            refreshToken {
              accessToken
            }
          }
        `);

        if (this.hasErrors(res)) return null; // refreshToken expirado/inválido

        const token = res.data?.refreshToken?.accessToken ?? null;

        if (token) {
          this.tokenStorage.set(token);
        }

        return token;
      } catch {
        return null;
      } finally {
        this.refreshingPromise = null; // sempre libera, mesmo em erro
      }
    })();

    return this.refreshingPromise;
  }

  // ─── Chamada principal (com retry automático) ──────────────────────────────
  async connect<T>(query: string, variables = {}): Promise<T> {
    const token = this.tokenStorage.get();
    let res = await this.fetch(query, variables, token);

    // Primeiro erro de autenticação → tenta renovar o accessToken
    if (this.isUnauthenticated(res)) {
      const newToken = await this.refreshToken();

      if (!newToken) {
        // Refresh falhou → sessão expirada, limpa estado local
        this.tokenStorage.clear();
        throw new Error("Session expired. Please log in again.");
      }

      // Retry com o novo token
      res = await this.fetch(query, variables, newToken);
    }

    // Se ainda houver erros após retry, lança para o chamador tratar
    if (this.hasErrors(res)) {
      const messages = res.errors.map((e: any) => e.message).join(" | ");
      throw new Error(messages);
    }

    return res;
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────
  async login(email: string, password: string): Promise<string> {
    const res = await this.fetch<{
      data?: { login?: { accessToken: string } };
      errors?: any[];
    }>(
      `
      mutation Login($email: String!, $password: String!) {
        login(input: { email: $email, password: $password }) {
          accessToken
        }
      }
      `,
      { email, password }
    );

    if (this.hasErrors(res)) {
      const messages = res.errors!.map((e: any) => e.message).join(" | ");
      throw new Error(messages);
    }

    const token = res.data?.login?.accessToken;
    if (!token) throw new Error("Login failed: no token returned");

    this.tokenStorage.set(token);
    return token;
  }

  async register(
    email: string,
    password: string,
    name: string,
    phone: string,
    taxId: string
  ): Promise<string> {
    const res = await this.fetch<{
      data?: { register?: { accessToken: string } };
      errors?: any[];
    }>(
      `
      mutation Register(
        $email: String!, $name: String!, $password: String!,
        $phone: String!, $taxId: String!
      ) {
        register(input: {
          email: $email, name: $name, password: $password,
          phone: $phone, taxId: $taxId
        }) {
          accessToken
        }
      }
      `,
      { email, name, password, phone, taxId }
    );

    if (this.hasErrors(res)) {
      const messages = res.errors!.map((e: any) => e.message).join(" | ");
      throw new Error(messages);
    }

    const token = res.data?.register?.accessToken;
    if (!token) throw new Error("Registration failed: no token returned");

    this.tokenStorage.set(token);
    return token;
  }

  async logout(): Promise<void> {
    try {
      // Invalida o refreshToken no servidor (limpa o cookie httpOnly)
      await this.fetch(
        `mutation { logout }`,
        {},
        this.tokenStorage.get() ?? undefined
      );
    } catch {
      // Falha silenciosa — limpamos local de qualquer forma
    } finally {
      this.tokenStorage.clear();
    }
  }

  async getMe() {
    const res = await this.connect<{
      data?: { getMe?: { id: string; email: string; name: string } };
      errors?: any[];
    }>(
      `
      query GetMe {
        getMe {
          id
          email
          name
          role
        }
      }
      `
    );

    return res.data?.getMe ?? null;
  }
}