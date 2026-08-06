type Bucket = {
  count: number;
  resetAt: number;
};

export class RateLimiter {
  private readonly hits = new Map<string, Bucket>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  consume(key: string): void {
    const now = Date.now();
    const bucket = this.hits.get(key);

    if (!bucket || now > bucket.resetAt) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return;
    }

    if (bucket.count >= this.max) {
      throw new Error("Too many attempts. Please try again later.");
    }

    bucket.count += 1;
  }
}
