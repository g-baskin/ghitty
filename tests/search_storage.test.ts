import { describe, expect, test } from "bun:test";
// @ts-expect-error Browser module intentionally ships as dependency-free JavaScript.
import { createSearchRecord, isValidSearchRecord, searchExportFilename, serializeSearchRecord } from "../public/search-storage.js";

const snapshot = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  topic: "Local-first DB sync!",
  model: "openai/test-model",
  completed_at: "2026-08-20T12:00:00.000Z",
  result: { picks: [], candidate_count: 0 },
};

describe("saved search records", () => {
  test("creates and validates the versioned export shape", () => {
    const record = createSearchRecord(snapshot, "2026-08-20T12:01:00.000Z");

    expect(record).toEqual({
      schema_version: 1,
      id: snapshot.id,
      topic: snapshot.topic,
      model: snapshot.model,
      completed_at: snapshot.completed_at,
      saved_at: "2026-08-20T12:01:00.000Z",
      result: snapshot.result,
    });
    expect(isValidSearchRecord(record)).toBe(true);
  });

  test("rejects malformed records at the rendering boundary", () => {
    const valid = createSearchRecord(snapshot);

    expect(isValidSearchRecord({ ...valid, schema_version: 2 })).toBe(false);
    expect(isValidSearchRecord({ ...valid, id: "not-a-job-id" })).toBe(false);
    expect(isValidSearchRecord({ ...valid, result: [] })).toBe(false);
    expect(() => serializeSearchRecord({ ...valid, saved_at: "not-a-date" })).toThrow("malformed");
  });

  test("serializes stable JSON and a deterministic safe filename", () => {
    const record = createSearchRecord(snapshot, "2026-08-20T12:01:00.000Z");
    const serialized = serializeSearchRecord(record);

    expect(serialized).toBe(serializeSearchRecord(record));
    expect(JSON.parse(serialized)).toEqual(record);
    expect(serialized.indexOf('"completed_at"')).toBeLessThan(serialized.indexOf('"id"'));
    expect(searchExportFilename(record)).toBe("ghitty-local-first-db-sync-2026-08-20.json");
  });
});
