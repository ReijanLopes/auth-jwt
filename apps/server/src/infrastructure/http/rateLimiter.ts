export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  consume(key: string): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const queue = this.hits.get(key) ?? [];
    while (queue.length > 0 && queue[0] <= windowStart) {
      queue.shift();
    }

    if (queue.length >= this.max) {
      throw new Error("Too many attempts. Please try again later.");
    }

    queue.push(now);
    this.hits.set(key, queue);
  }
}
