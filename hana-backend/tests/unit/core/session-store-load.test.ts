import nodeFs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadSessionFilesFromDisk } from "@/config/session";

const dirs: string[] = [];

const makeDir = (): string => {
  const dir = nodeFs.mkdtempSync(path.join(os.tmpdir(), "vp-sessions-"));
  dirs.push(dir);
  return dir;
};

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    nodeFs.rmSync(dir, { force: true, recursive: true });
  }
});

describe("loadSessionFilesFromDisk", () => {
  it("reloads valid session files instead of wiping them", () => {
    const dir = makeDir();
    const sid = "abc123";
    nodeFs.writeFileSync(
      path.join(dir, `${sid}.json`),
      JSON.stringify({
        cookie: { expires: new Date(Date.now() + 60_000).toISOString() },
        dbName: "AJAX_POS_DB",
        sessionId: "sap-1",
      }),
    );

    const result = loadSessionFilesFromDisk(dir);
    expect(result.loaded).toHaveLength(1);
    expect(result.loaded[0]?.sid).toBe(sid);
    expect(result.loaded[0]?.content).toContain("AJAX_POS_DB");
    expect(nodeFs.existsSync(path.join(dir, `${sid}.json`))).toBe(true);
  });

  it("drops expired and corrupt files only", () => {
    const dir = makeDir();
    nodeFs.writeFileSync(
      path.join(dir, "old.json"),
      JSON.stringify({ cookie: { expires: new Date(Date.now() - 1000).toISOString() } }),
    );
    nodeFs.writeFileSync(path.join(dir, "bad.json"), "{not-json");
    nodeFs.writeFileSync(path.join(dir, "ok.json"), JSON.stringify({ dbName: "DB_A" }));

    const result = loadSessionFilesFromDisk(dir);
    expect(result.loaded.map((row) => row.sid)).toEqual(["ok"]);
    expect(result.skippedExpired).toBe(1);
    expect(result.removedCorrupt).toBe(1);
    expect(nodeFs.existsSync(path.join(dir, "old.json"))).toBe(false);
    expect(nodeFs.existsSync(path.join(dir, "bad.json"))).toBe(false);
  });
});
