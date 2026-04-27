// modules/auth/infra/token.storage.ts

type StorageStrategy = "memory" | "localStorage";

export class TokenStorage {
  private strategy: StorageStrategy;
  private token: string | null;

  constructor(strategy: StorageStrategy = "memory") {
    this.strategy = strategy;
    this.token = null;
  }

  setStrategy(strategy: StorageStrategy): this {
    this.strategy = strategy;
    return this;
  }

  get(): string | undefined {
    if (this.strategy === "localStorage") {
      if (typeof window === "undefined") return undefined;
      return localStorage.getItem("accessToken") ?? undefined;
    }

    return this.token ?? undefined;
  }

  set(token: string | null): this {
    if (this.strategy === "localStorage") {
      if (typeof window === "undefined") return this;

      if (token) {
        localStorage.setItem("accessToken", token);
      } else {
        localStorage.removeItem("accessToken");
      }
    } else {
      this.token = token ?? null;
    }

    return this;
  }

  clear(): this {
    return this.set(null);
  }

  has(): boolean {
    return !!this.get();
  }
}