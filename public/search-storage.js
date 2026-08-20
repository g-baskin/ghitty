const DB_NAME = "ghitty";
const STORE_NAME = "saved-searches";
const SCHEMA_VERSION = 1;
const JOB_ID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIsoDate(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function isValidSearchRecord(record) {
  return (
    isObject(record) &&
    record.schema_version === SCHEMA_VERSION &&
    typeof record.id === "string" &&
    JOB_ID_PATTERN.test(record.id) &&
    typeof record.topic === "string" &&
    record.topic.length > 0 &&
    record.topic.length <= 200 &&
    (record.model === null || typeof record.model === "string") &&
    isIsoDate(record.completed_at) &&
    isIsoDate(record.saved_at) &&
    isObject(record.result)
  );
}

export function createSearchRecord(snapshot, savedAt = new Date().toISOString()) {
  const record = {
    schema_version: SCHEMA_VERSION,
    id: snapshot.id,
    topic: snapshot.topic,
    model: snapshot.model ?? null,
    completed_at: snapshot.completed_at,
    saved_at: savedAt,
    result: snapshot.result,
  };
  if (!isValidSearchRecord(record)) throw new TypeError("Search record is malformed");
  return record;
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortValue(value[key])]),
  );
}

export function serializeSearchRecord(record) {
  if (!isValidSearchRecord(record)) throw new TypeError("Search record is malformed");
  return `${JSON.stringify(sortValue(record), null, 2)}\n`;
}

export function searchExportFilename(record) {
  if (!isValidSearchRecord(record)) throw new TypeError("Search record is malformed");
  const slug = record.topic
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `ghitty-${slug || "search"}-${record.completed_at.slice(0, 10)}.json`;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open saved searches"));
    request.onblocked = () => reject(new Error("Saved searches are blocked by another tab"));
  });
}

function runTransaction(mode, operation) {
  return openDatabase().then(
    (database) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const request = operation(transaction.objectStore(STORE_NAME));
        transaction.oncomplete = () => {
          database.close();
          resolve(request.result);
        };
        transaction.onerror = () =>
          reject(transaction.error ?? new Error("Saved search operation failed"));
        transaction.onabort = () =>
          reject(transaction.error ?? new Error("Saved search operation was aborted"));
      }),
  );
}

export async function saveSearchRecord(record) {
  if (!isValidSearchRecord(record)) throw new TypeError("Search record is malformed");
  await runTransaction("readwrite", (store) => store.put(record));
}

export async function listSearchRecords() {
  const records = await runTransaction("readonly", (store) => store.getAll());
  return records
    .filter(isValidSearchRecord)
    .sort((left, right) => right.saved_at.localeCompare(left.saved_at));
}

export function downloadSearchRecord(record) {
  const url = URL.createObjectURL(
    new Blob([serializeSearchRecord(record)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = searchExportFilename(record);
  link.click();
  URL.revokeObjectURL(url);
}
