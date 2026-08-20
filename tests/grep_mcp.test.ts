import { describe, expect, test } from "bun:test";
import { parseRequest, parseSearchOutput } from "../grep_mcp";

const licensedBlock = `2 matches across 1 file

Repo: owner/repo (★12.5k, updated 2026-08-18, Apache-2.0)
File: src/index.ts
Link: https://github.com/owner/repo/blob/main/src/index.ts

10 │ import { Client } from "library";
11 │ Client.start();`;

describe("parseSearchOutput", () => {
  test("parses documented labeled output with a recognized license", () => {
    expect(parseSearchOutput(licensedBlock)).toEqual([
      {
        repo: "owner/repo",
        file: "src/index.ts",
        link: "https://github.com/owner/repo/blob/main/src/index.ts",
        snippet: '10 │ import { Client } from "library";\n11 │ Client.start();',
        license: "Apache-2.0",
        stars: 12_500,
        updated_at: "2026-08-18",
      },
    ]);
  });

  test("returns no rows for the documented no-results response", () => {
    expect(parseSearchOutput("No results found for your query.\n\nTry a broader literal.")).toEqual([]);
  });

  test("drops malformed, mismatched, and unlicensed blocks", () => {
    const text = `${licensedBlock}

Repo: owner/private (★10, NOASSERTION)
File: src/secret.ts
Link: https://github.com/owner/private/blob/main/src/secret.ts

1 │ secret

Repo: owner/wrong (MIT)
File: src/index.ts
Link: https://github.com/another/repo/blob/main/src/index.ts

1 │ mismatch

Repo: owner/fake (DefinitelyNotALicense)
File: src/index.ts
Link: https://github.com/owner/fake/blob/main/src/index.ts

1 │ fake license

Repo: not a repository (MIT)
File: src/index.ts
Link: https://github.com/not/a/blob/main/src/index.ts

1 │ malformed`;
    expect(parseSearchOutput(text)).toHaveLength(1);
  });

  test("bounds rows and snippets", () => {
    const blocks = Array.from({ length: 25 }, (_, index) =>
      licensedBlock
        .replaceAll("owner/repo", `owner/repo-${index}`)
        .replace('10 │ import { Client } from "library";\n11 │ Client.start();', `1 │ ${"x".repeat(5_000)}`),
    ).join("\n\n");
    const rows = parseSearchOutput(blocks);
    expect(rows).toHaveLength(20);
    expect(rows[0]?.snippet.length).toBe(4_000);
  });
});

describe("parseRequest", () => {
  test("accepts and trims one to ten bounded probes", () => {
    expect(parseRequest({ probes: ["  useState(  "] })).toEqual(["useState("]);
    expect(parseRequest({ probes: Array.from({ length: 10 }, (_, index) => `probe-${index}`) })).toHaveLength(10);
  });

  test("rejects invalid shapes and bounds", () => {
    expect(() => parseRequest({ probes: [] })).toThrow("1-10");
    expect(() => parseRequest({ probes: Array.from({ length: 11 }, () => "probe") })).toThrow("1-10");
    expect(() => parseRequest({ probes: ["ab"] })).toThrow("3-256");
    expect(() => parseRequest({ probes: [`ok\0bad`] })).toThrow("NUL");
    expect(() => parseRequest({ probes: [42] })).toThrow("text");
  });
});
