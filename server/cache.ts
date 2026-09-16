import { PublisherCheckReport } from '../src/types.js';

interface CacheEntry {
  report: PublisherCheckReport;
  timestamp: number;
}

class ReportCache {
  private store: Map<string, CacheEntry> = new Map();
  private ttlMs: number;

  constructor(ttlHours: number = 48) {
    this.ttlMs = ttlHours * 60 * 60 * 1000;
  }

  public get(domain: string): PublisherCheckReport | null {
    const key = domain.toLowerCase();
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.store.delete(key);
      return null;
    }

    // Return cloned report with cached flag
    return {
      ...entry.report,
      isCached: true,
      cachedAt: new Date(entry.timestamp).toISOString(),
    };
  }

  public set(domain: string, report: PublisherCheckReport): void {
    const key = domain.toLowerCase();
    this.store.set(key, {
      report: {
        ...report,
        isCached: false,
      },
      timestamp: Date.now(),
    });
  }

  public delete(domain: string): void {
    this.store.delete(domain.toLowerCase());
  }

  public clear(): void {
    this.store.clear();
  }

  public setTTLHours(hours: number): void {
    this.ttlMs = hours * 60 * 60 * 1000;
  }

  public getTTLHours(): number {
    return this.ttlMs / (60 * 60 * 1000);
  }
}

export const reportCache = new ReportCache(48);
