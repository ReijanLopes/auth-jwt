export type RefreshTokenInput = {
  id?: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt?: Date;
};

export class RefreshToken {
  private constructor(
    private readonly id: string,
    private readonly userId: string,
    private readonly token: string,
    private readonly expiresAt: Date,
    private readonly createdAt: Date,
  ) {}

  static create(props: RefreshTokenInput): RefreshToken {
    return new RefreshToken(
      props.id ?? crypto.randomUUID(),
      props.userId,
      props.token,
      props.expiresAt,
      props.createdAt ?? new Date(),
    );
  }

  get getId() { return this.id; }
  get getUserId() { return this.userId; }
  get getToken() { return this.token; }
  get getExpiresAt() { return this.expiresAt; }

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
}