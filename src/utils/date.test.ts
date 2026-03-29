import { describe, it, expect, vi, afterEach } from "vitest";
import { relativeTime, groupByDate } from "./date";

describe("relativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns fallback for null input", () => {
    expect(relativeTime(null)).toBe("\u2014");
    expect(relativeTime(undefined)).toBe("\u2014");
  });

  it("returns custom fallback when provided", () => {
    expect(relativeTime(null, "N/A")).toBe("N/A");
  });

  it('returns "Just now" for < 1 minute ago', () => {
    const now = new Date().toISOString();
    expect(relativeTime(now)).toBe("Just now");
  });

  it("returns minutes ago for 1-59 minutes", () => {
    vi.useFakeTimers();
    const base = new Date("2026-01-15T12:00:00Z");
    vi.setSystemTime(base);

    const fiveMinAgo = new Date("2026-01-15T11:55:00Z").toISOString();
    expect(relativeTime(fiveMinAgo)).toBe("5m ago");

    const thirtyMinAgo = new Date("2026-01-15T11:30:00Z").toISOString();
    expect(relativeTime(thirtyMinAgo)).toBe("30m ago");
  });

  it("returns hours ago for 1-23 hours", () => {
    vi.useFakeTimers();
    const base = new Date("2026-01-15T12:00:00Z");
    vi.setSystemTime(base);

    const twoHoursAgo = new Date("2026-01-15T10:00:00Z").toISOString();
    expect(relativeTime(twoHoursAgo)).toBe("2h ago");

    const twentyThreeHoursAgo = new Date("2026-01-14T13:00:00Z").toISOString();
    expect(relativeTime(twentyThreeHoursAgo)).toBe("23h ago");
  });

  it("returns days ago for 24+ hours", () => {
    vi.useFakeTimers();
    const base = new Date("2026-01-15T12:00:00Z");
    vi.setSystemTime(base);

    const threeDaysAgo = new Date("2026-01-12T12:00:00Z").toISOString();
    expect(relativeTime(threeDaysAgo)).toBe("3d ago");
  });
});

describe("groupByDate", () => {
  it("groups items into date buckets", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T14:00:00Z"));

    const items = [
      { id: 1, date: "2026-01-15T13:00:00Z" }, // Today
      { id: 2, date: "2026-01-14T10:00:00Z" }, // Yesterday
      { id: 3, date: "2026-01-10T10:00:00Z" }, // Previous 7 Days
      { id: 4, date: "2026-01-01T10:00:00Z" }, // Older
    ];

    const groups = groupByDate(items, (i) => i.date);

    expect(groups["Today"]).toHaveLength(1);
    expect(groups["Today"]![0].id).toBe(1);
    expect(groups["Yesterday"]).toHaveLength(1);
    expect(groups["Previous 7 Days"]).toHaveLength(1);
    expect(groups["Older"]).toHaveLength(1);

    vi.useRealTimers();
  });

  it("handles undefined dates by placing in Older", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T14:00:00Z"));

    const items = [{ id: 1, date: undefined }];
    const groups = groupByDate(items, (i) => i.date);

    expect(groups["Older"]).toHaveLength(1);

    vi.useRealTimers();
  });
});
