import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = path.join(root, "test", "fixtures");

const expectedMappings = new Map([
  ["templates/trellis/spec/guides/review-workflow.md", ".trellis/spec/guides/review-workflow.md"],
  ["templates/trellis/spec/guides/review-loop-workflow.md", ".trellis/spec/guides/review-loop-workflow.md"],
  ["templates/trellis/spec/guides/minimal-implementation.md", ".trellis/spec/guides/minimal-implementation.md"],
  ["templates/trellis/spec/templates/review-brief-template.md", ".trellis/spec/templates/review-brief-template.md"],
  ["templates/trellis/spec/templates/rereview-brief-template.md", ".trellis/spec/templates/rereview-brief-template.md"],
  ["templates/trellis/spec/templates/review-fix-summary-template.md", ".trellis/spec/templates/review-fix-summary-template.md"],
  ["templates/trellis/spec/guides/development-location-decision.md", ".trellis/spec/guides/development-location-decision.md"],
  ["templates/trellis/spec/guides/fast-path-change-policy.md", ".trellis/spec/guides/fast-path-change-policy.md"],
  ["templates/trellis/spec/guides/spec-cleanup-guide.md", ".trellis/spec/guides/spec-cleanup-guide.md"],
  ["templates/claude/commands/coding.md", ".claude/commands/coding.md"],
  ["templates/claude/commands/fix.md", ".claude/commands/fix.md"],
  ["templates/claude/commands/review.md", ".claude/commands/review.md"],
  ["templates/claude/commands/review-fix.md", ".claude/commands/review-fix.md"],
  ["templates/claude/commands/spec-cleanup.md", ".claude/commands/spec-cleanup.md"],
]);

const legacyTargets = [
  ".trellis/scripts/codex-review.sh",
  ".trellis/scripts/codex-rereview.sh",
  ".trellis/scripts/codex-review.ps1",
  ".trellis/scripts/codex-rereview.ps1",
  ".trellis/spec/scripts/codex-review.sh",
  ".trellis/spec/scripts/codex-rereview.sh",
  ".trellis/spec/scripts/codex-review.ps1",
  ".trellis/spec/scripts/codex-rereview.ps1",
  ".trellis/spec/guides/claude-codex-review-workflow.md",
  ".trellis/spec/guides/review-handoff-workflow.md",
  ".trellis/spec/templates/codex-handoff-template.md",
  ".trellis/spec/templates/review-handoff-template.md",
  ".trellis/spec/templates/rereview-handoff-template.md",
  ".claude/commands/handoff.md",
  ".claude/commands/rereview.md",
  ".claude/commands/task.md",
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function markdownSection(source, heading) {
  const marker = `## ${heading}`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `missing Markdown section: ${heading}`);
  const bodyStart = start + marker.length;
  const nextHeading = source.indexOf("\n## ", bodyStart);
  return source.slice(bodyStart, nextHeading === -1 ? source.length : nextHeading);
}

function assertMarkersInOrder(source, markers) {
  let previousIndex = -1;
  let previousLabel = "the start of the document";
  for (const [label, marker] of markers) {
    const index = source.indexOf(marker);
    assert.notEqual(index, -1, `missing ${label}: ${marker}`);
    assert.ok(index > previousIndex, `${label} must appear after ${previousLabel}`);
    previousIndex = index;
    previousLabel = label;
  }
}

function listFiles(directory, prefix = "") {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relativePath = path.join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(path.join(directory, entry.name), relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }
  return files;
}

function runCli(args, cwd) {
  return execFileSync(process.execPath, [path.join(root, "bin", "trellis-kit.js"), ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runGit(args, cwd) {
  return execFileSync("git", ["-c", "core.autocrlf=false", ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function makeTempDirectory(t, prefix) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseMappings(source) {
  const mappings = new Map();
  const objectPattern = /\{\s*from:\s*"([^"]+)",\s*to:\s*"([^"]+)"(?:,\s*executable:\s*true)?\s*,?\s*\}/g;
  for (const match of source.matchAll(objectPattern)) {
    mappings.set(match[1], match[2]);
  }
  return mappings;
}

function parseNpmPackManifest(output, packageName) {
  const context = `npm pack --dry-run --json output for package "${packageName}"`;
  let payload;
  try {
    payload = JSON.parse(output);
  } catch (error) {
    throw new Error(`${context} is not valid JSON: ${error.message}`);
  }

  let manifest;
  if (Array.isArray(payload)) {
    const matches = payload.filter(
      (candidate) =>
        candidate !== null &&
        typeof candidate === "object" &&
        !Array.isArray(candidate) &&
        candidate.name === packageName,
    );
    if (matches.length > 1) {
      throw new Error(`${context} contains multiple npm 11 manifests for the package`);
    }
    [manifest] = matches;
  } else if (payload !== null && typeof payload === "object" && Object.hasOwn(payload, packageName)) {
    manifest = payload[packageName];
  }

  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error(
      `${context} does not contain a manifest in the npm 11 array or npm 12 package-name object schema`,
    );
  }
  if (manifest.name !== packageName) {
    throw new Error(`${context} manifest has an unexpected package name: ${JSON.stringify(manifest.name)}`);
  }
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error(`${context} manifest is missing a non-empty files array`);
  }
  for (const [index, file] of manifest.files.entries()) {
    if (
      file === null ||
      typeof file !== "object" ||
      Array.isArray(file) ||
      typeof file.path !== "string" ||
      file.path.trim() === ""
    ) {
      throw new Error(`${context} manifest has an invalid file entry at files[${index}]`);
    }
  }
  return manifest;
}

function parseJsonl(source) {
  return source
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map((line, index) => {
      let event;
      try {
        event = JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid JSONL at line ${index + 1}: ${error.message}`);
      }
      if (
        event === null ||
        typeof event !== "object" ||
        Array.isArray(event) ||
        !Number.isInteger(event.seq) ||
        typeof event.ts !== "string" ||
        typeof event.kind !== "string" ||
        typeof event.by !== "string" ||
        event.by.trim() === ""
      ) {
        throw new Error(`Invalid Channel event at line ${index + 1}`);
      }
      return event;
    });
}

function firstDoneAfterSend(events, sendSeq) {
  return (
    events.find(
      (event) => event.kind === "done" && event.by === "check-codex" && event.seq > sendSeq,
    ) ?? null
  );
}

function completedReview(events, sendSeq) {
  const done = firstDoneAfterSend(events, sendSeq);
  if (!done) return null;

  const messages = events.filter(
    (event) =>
      event.kind === "message" &&
      event.by === "check-codex" &&
      event.seq > sendSeq &&
      event.seq < done.seq &&
      typeof event.text === "string" &&
      event.text.trim() !== "",
  );
  return messages.at(-1)?.text ?? null;
}

function isCompleteWorkerStream(events, sendSeq) {
  let previousSeq = sendSeq;
  for (const event of events) {
    if (event.by !== "check-codex" || event.seq <= previousSeq) return false;
    previousSeq = event.seq;
  }
  return firstDoneAfterSend(events, sendSeq) !== null;
}

function completionStatus(waitExitCode, events, sendSeq) {
  return {
    complete: firstDoneAfterSend(events, sendSeq) !== null,
    waitTimedOut: waitExitCode === 124,
  };
}

function provenance(pair, sendSeq = 10) {
  return `<!-- trellis-review: ${JSON.stringify({
    pair,
    channel: `review-example-${pair}`,
    sendSeq,
    jsonl: `codex-review-${pair}.jsonl`,
    workspaceStable: true,
  })} -->`;
}

function writePair(directory, pair, jsonl, markdown) {
  fs.writeFileSync(path.join(directory, `codex-review-${pair}.jsonl`), jsonl);
  if (markdown !== null) {
    fs.writeFileSync(path.join(directory, `codex-review-${pair}.md`), markdown);
  }
}

function parseProvenance(markdown) {
  const newline = markdown.indexOf("\n");
  if (newline < 0) return null;

  const firstLine = markdown.slice(0, newline);
  const prefix = "<!-- trellis-review: ";
  const suffix = " -->";
  if (!firstLine.startsWith(prefix) || !firstLine.endsWith(suffix)) return null;

  return {
    metadata: JSON.parse(firstLine.slice(prefix.length, -suffix.length)),
    body: markdown.slice(newline + 1),
  };
}

function hasExpectedReviewTitle(message) {
  return (
    message === "# Review Result" ||
    message.startsWith("# Review Result\n") ||
    message === "# Rereview Result" ||
    message.startsWith("# Rereview Result\n")
  );
}

function completePairs(directory) {
  const pairs = [];
  for (const name of fs.readdirSync(directory)) {
    const match = /^codex-review-(\d{3})\.md$/.exec(name);
    if (!match) continue;

    const pair = match[1];
    if (pair === "000") continue;
    const jsonlName = `codex-review-${pair}.jsonl`;
    const jsonlPath = path.join(directory, jsonlName);
    if (!fs.existsSync(jsonlPath)) continue;

    try {
      const markdown = fs.readFileSync(path.join(directory, name), "utf8");
      const parsedMarkdown = parseProvenance(markdown);
      const metadata = parsedMarkdown?.metadata;
      const events = parseJsonl(fs.readFileSync(jsonlPath, "utf8"));
      const streamComplete = metadata ? isCompleteWorkerStream(events, metadata.sendSeq) : false;
      const finalMessage = streamComplete ? completedReview(events, metadata.sendSeq) : null;
      if (
        metadata?.pair === pair &&
        typeof metadata.channel === "string" &&
        metadata.channel.trim() !== "" &&
        Number.isInteger(metadata.sendSeq) &&
        metadata.sendSeq > 0 &&
        metadata.jsonl === jsonlName &&
        metadata.workspaceStable === true &&
        finalMessage !== null &&
        hasExpectedReviewTitle(finalMessage) &&
        finalMessage === parsedMarkdown.body
      ) {
        pairs.push(pair);
      }
    } catch {
      // Invalid and orphaned artifacts are intentionally excluded.
    }
  }
  return pairs.sort();
}

function selectReview(directory) {
  const pairs = completePairs(directory);
  if (pairs.length > 0) return { kind: "pair", pair: pairs.at(-1) };

  const legacy = fs.readdirSync(directory).filter((name) => {
    if (!/^codex-review(?:-\d+)?\.md$/.test(name)) return false;
    const jsonlSibling = `${name.slice(0, -3)}.jsonl`;
    if (fs.existsSync(path.join(directory, jsonlSibling))) return false;
    const markdown = fs.readFileSync(path.join(directory, name), "utf8");
    try {
      return parseProvenance(markdown) === null;
    } catch {
      return false;
    }
  });
  if (legacy.length === 1) return { kind: "legacy", file: legacy[0] };
  if (legacy.length > 1) throw new Error("Ambiguous legacy review artifacts");
  return null;
}

test("installer registers and installs all 14 source-to-target mappings byte-for-byte", (t) => {
  const actualMappings = parseMappings(read("bin/trellis-kit.js"));
  assert.deepEqual(actualMappings, expectedMappings);

  const targetRoot = makeTempDirectory(t, "trellis-kit-init-");
  runCli(["init"], targetRoot);

  for (const [source, target] of expectedMappings) {
    assert.deepEqual(fs.readFileSync(path.join(targetRoot, target)), fs.readFileSync(path.join(root, source)), target);
  }
  for (const target of legacyTargets) {
    assert.equal(fs.existsSync(path.join(targetRoot, target)), false, target);
  }
});

test("init dry-run reports all mappings without creating target directories", (t) => {
  const targetRoot = makeTempDirectory(t, "trellis-kit-dry-run-");
  const output = runCli(["init", "--dry-run"], targetRoot);

  for (const target of expectedMappings.values()) {
    assert.ok(output.includes(`WOULD CREATE ${target}`), target);
  }
  assert.equal(fs.existsSync(path.join(targetRoot, ".trellis")), false);
  assert.equal(fs.existsSync(path.join(targetRoot, ".claude")), false);
});

test("active product files use channel list --all and never executable channel ls", () => {
  const files = [
    "README.md",
    "README.en.md",
    "README.zh-CN.md",
    ...listFiles(path.join(root, "templates"))
      .filter((name) => name.endsWith(".md"))
      .map((name) => path.join("templates", name)),
  ];
  for (const file of files) {
    assert.doesNotMatch(read(file), /trellis channel ls(?:\s|$)/m, file);
  }
  assert.match(read("templates/claude/commands/review.md"), /trellis channel list --all/);
});

test("review command encodes the 0.6.6 review-only and artifact contracts", () => {
  const command = read("templates/claude/commands/review.md");
  for (const expected of [
    "trellis channel spawn <channel-name>",
    "--provider codex",
    "--as check-codex",
    '--file "$NUMBERED_BRIEF"',
    "--ephemeral",
    "SEND_SEQ",
    "--since \"$SEND_SEQ\"",
    "--kind done",
    "codex-review-NNN.jsonl",
    "codex-review-NNN.md",
    "JSON.parse",
    'event.by === "review"',
    'event.to === "check-codex"',
    'event.by === "check-codex"',
    "git status --short",
    "git diff --binary",
    "git diff --cached --binary",
    "git ls-files --others --exclude-standard -z",
    "binary-safe",
    'flag: "wx"',
    "trellis channel prune --scope project --ephemeral",
    "trellis channel prune --scope project --ephemeral --yes",
    "positive integer",
  ]) {
    assert.ok(command.includes(expected), `missing review contract: ${expected}`);
  }
  assert.match(
    command,
    /trellis channel spawn <channel-name>[\s\\]+--provider codex[\s\\]+--as check-codex[\s\\]+--file "\$NUMBERED_BRIEF"/,
  );
  const briefCreation = command.indexOf("Select the next unused `NNN` and write `review-brief-NNN.md`");
  const spawnCommand = command.indexOf("trellis channel spawn <channel-name>");
  const sendCommand = command.indexOf('trellis channel send "$CHANNEL"');
  assert.ok(briefCreation >= 0 && briefCreation < spawnCommand && spawnCommand < sendCommand);
  assert.match(command, /--file "\$NUMBERED_BRIEF"[\s\S]*--text-file "\$NUMBERED_BRIEF"/);
  assert.doesNotMatch(command, /--agent review\b/);
  assert.doesNotMatch(command, /--agent check\b/);
  assert.doesNotMatch(command, /event\.from\s*===/);
  assert.doesNotMatch(command, /^\s*trellis channel run\b/m);
  assert.doesNotMatch(command, /--last 100 > <review-result-path>/);
  assert.doesNotMatch(command, /--since "\$SEND_SEQ"\s*>/);
});

test("history done after send sequence is authoritative even when wait times out", () => {
  const events = parseJsonl(fs.readFileSync(path.join(fixtureDir, "complete-review.jsonl"), "utf8"));
  assert.deepEqual(completionStatus(124, events, 10), { complete: true, waitTimedOut: true });
  assert.deepEqual(completionStatus(124, events, 14), { complete: false, waitTimedOut: true });
  assert.equal(
    completedReview(events, 10),
    "# Review Result\n\n## Blocking\n\nNone\n\n## Should Fix\n\nNo findings.",
  );

  const doneWithoutMessage = parseJsonl(
    '{"seq":41,"ts":"2026-07-10T00:00:00.000Z","kind":"done","by":"check-codex"}\n',
  );
  assert.deepEqual(completionStatus(124, doneWithoutMessage, 40), {
    complete: true,
    waitTimedOut: true,
  });
  assert.equal(completedReview(doneWithoutMessage, 40), null);
});

test("raw Channel events use by as the author field and reject a from-only fixture", () => {
  assert.throws(
    () =>
      parseJsonl(
        '{"seq":1,"ts":"2026-07-10T00:00:00.000Z","kind":"done","from":"check-codex"}\n',
      ),
    /Invalid Channel event at line 1/,
  );
});

test("full diff and untracked content hashes detect changes that status and diff stat miss", (t) => {
  const directory = makeTempDirectory(t, "trellis-workspace-snapshot-");
  runGit(["init", "--quiet"], directory);
  fs.mkdirSync(path.join(directory, ".git", "no-hooks"));
  runGit(["config", "core.hooksPath", ".git/no-hooks"], directory);
  fs.writeFileSync(path.join(directory, "tracked.txt"), "alpha\n");
  runGit(["add", "tracked.txt"], directory);
  runGit(
    [
      "-c",
      "user.name=Trellis Test",
      "-c",
      "user.email=trellis-test@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "--quiet",
      "-m",
      "baseline",
    ],
    directory,
  );

  fs.writeFileSync(path.join(directory, "tracked.txt"), "bravo\n");
  fs.writeFileSync(path.join(directory, "untracked.txt"), "one\n");
  const statusBefore = runGit(["status", "--short", "--untracked-files=all"], directory);
  const statBefore = runGit(["diff", "--stat"], directory);
  const diffBefore = runGit(["diff", "--binary"], directory);
  const untrackedBefore = sha256(fs.readFileSync(path.join(directory, "untracked.txt")));

  fs.writeFileSync(path.join(directory, "tracked.txt"), "cider\n");
  fs.writeFileSync(path.join(directory, "untracked.txt"), "two\n");
  const statusAfter = runGit(["status", "--short", "--untracked-files=all"], directory);
  const statAfter = runGit(["diff", "--stat"], directory);
  const diffAfter = runGit(["diff", "--binary"], directory);
  const untrackedAfter = sha256(fs.readFileSync(path.join(directory, "untracked.txt")));

  assert.equal(statusAfter, statusBefore);
  assert.equal(statAfter, statBefore);
  assert.notEqual(diffAfter, diffBefore);
  assert.notEqual(untrackedAfter, untrackedBefore);
});

test("invalid JSONL and missing done cannot form a complete review", () => {
  const incomplete = parseJsonl(fs.readFileSync(path.join(fixtureDir, "incomplete-review.jsonl"), "utf8"));
  assert.equal(completedReview(incomplete, 20), null);
  assert.throws(
    () => parseJsonl(fs.readFileSync(path.join(fixtureDir, "malformed-review.jsonl"), "utf8")),
    /Invalid JSONL at line 2/,
  );
});

test("pair selection ignores orphans, selects latest complete pair, and falls back to one legacy file", (t) => {
  const directory = makeTempDirectory(t, "trellis-review-pairs-");
  const completeJsonl = fs.readFileSync(path.join(fixtureDir, "complete-review.jsonl"), "utf8");
  const finalMessage = completedReview(parseJsonl(completeJsonl), 10);

  writePair(directory, "001", completeJsonl, `${provenance("001")}\n${finalMessage}`);
  writePair(directory, "002", completeJsonl, null);
  writePair(
    directory,
    "003",
    fs.readFileSync(path.join(fixtureDir, "incomplete-review.jsonl"), "utf8"),
    `${provenance("003", 20)}\nPartial\n`,
  );
  writePair(directory, "004", completeJsonl, `${provenance("004")}\n${finalMessage}`);
  writePair(
    directory,
    "005",
    completeJsonl,
    `${provenance("005").replace('"workspaceStable":true', '"workspaceStable":false')}\n${finalMessage}`,
  );
  writePair(directory, "006", completeJsonl, `${provenance("006")}\n${finalMessage}\n`);

  const rereviewEvents = parseJsonl(completeJsonl);
  rereviewEvents.filter((event) => event.kind === "message").at(-1).text =
    "# Rereview Result\n\n## Blocking\n\nNone\n\n## Final Recommendation\n\nReady.";
  const rereviewJsonl = `${rereviewEvents.map((event) => JSON.stringify(event)).join("\n")}\n`;
  const rereviewMessage = completedReview(rereviewEvents, 10);
  writePair(directory, "007", rereviewJsonl, `${provenance("007")}\n${rereviewMessage}`);

  assert.deepEqual(completePairs(directory), ["001", "004", "007"]);
  assert.deepEqual(selectReview(directory), { kind: "pair", pair: "007" });

  writePair(directory, "000", completeJsonl, `${provenance("000")}\n${finalMessage}`);
  writePair(directory, "008", completeJsonl, `${provenance("008", 0)}\n${finalMessage}`);
  writePair(directory, "009", completeJsonl, `${provenance("009")}\r\n${finalMessage}`);
  assert.deepEqual(completePairs(directory), ["001", "004", "007"]);

  const orphanDirectory = makeTempDirectory(t, "trellis-review-orphan-");
  fs.writeFileSync(path.join(orphanDirectory, "codex-review-001.md"), `${provenance("001")}\n${finalMessage}`);
  fs.writeFileSync(path.join(orphanDirectory, "codex-review-002.md"), "# Legacy-looking review\n");
  fs.writeFileSync(
    path.join(orphanDirectory, "codex-review-002.jsonl"),
    fs.readFileSync(path.join(fixtureDir, "incomplete-review.jsonl")),
  );
  assert.equal(selectReview(orphanDirectory), null);

  const legacyDirectory = makeTempDirectory(t, "trellis-review-legacy-");
  fs.writeFileSync(path.join(legacyDirectory, "review-brief-001.md"), "# Not a review result\n");
  fs.writeFileSync(path.join(legacyDirectory, "review-fix-summary-001.md"), "# Not a review result\n");
  fs.writeFileSync(path.join(legacyDirectory, "codex-review-007.md"), "# Legacy review\n");
  assert.deepEqual(selectReview(legacyDirectory), { kind: "legacy", file: "codex-review-007.md" });
  fs.writeFileSync(path.join(legacyDirectory, "codex-review.md"), "# Another legacy review\n");
  assert.throws(() => selectReview(legacyDirectory), /Ambiguous legacy review artifacts/);
});

test("review-fix and rereview require complete numbered pairs and same-number summaries", () => {
  const reviewFix = read("templates/claude/commands/review-fix.md");
  const review = read("templates/claude/commands/review.md");
  for (const expected of [
    "complete pair",
    "codex-review-NNN.md",
    "codex-review-NNN.jsonl",
    "review-fix-summary-NNN.md",
    'event.by === "check-codex"',
    "no same-stem JSONL sibling",
  ]) {
    assert.ok(reviewFix.includes(expected), `review-fix missing: ${expected}`);
  }
  for (const expected of [
    "complete pair",
    "review-fix-summary-NNN.md",
    "NNN+1",
    'event.by === "check-codex"',
    "no same-stem JSONL sibling",
  ]) {
    assert.ok(review.includes(expected), `rereview missing: ${expected}`);
  }
});

test("coding preflight resolves and inspects before activation and native context loading", () => {
  const coding = read("templates/claude/commands/coding.md");
  const targetedPhaseLookup =
    "python3 ./.trellis/scripts/get_context.py --mode phase --step 1.3 --platform claude-code";

  assertMarkersInOrder(coding, [
    ["read-only task resolution", "## Resolve The Task Without Mutation"],
    ["resolved-path readiness inspection", "## Inspect Resolved Task Readiness"],
    ["manifest preflight", "## Preflight Task Context Manifests"],
    ["development-location and approval gates", "## Development Location And Approval Gates"],
    ["task activation", "## Activate Or Switch The Task"],
    ["native current-task context loading", "## Load Native Trellis Context"],
    ["native Trellis continuation", "## Continue Native Trellis Flow"],
  ]);

  const resolution = markdownSection(coding, "Resolve The Task Without Mutation");
  assert.match(resolution, /task\.py current --source/);
  assert.match(resolution, /task\.py list\b/);
  assert.match(resolution, /task\.py list-archive/);
  assert.doesNotMatch(resolution, /task\.py (?:start|add-context)\b/);
  assert.doesNotMatch(resolution, /get_context\.py/);

  const activationHeading = coding.indexOf("## Activate Or Switch The Task");
  const beforeActivation = coding.slice(
    coding.indexOf("## Resolve The Task Without Mutation"),
    activationHeading,
  );
  const preActivationContextCommands = beforeActivation
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("python3 ./.trellis/scripts/get_context.py"));
  assert.deepEqual(
    preActivationContextCommands,
    [targetedPhaseLookup],
    "only the targeted read-only Phase 1.3 lookup may run before activation",
  );

  const gates = markdownSection(coding, "Development Location And Approval Gates");
  assert.match(gates, /planning/);
  assert.match(gates, /implementation approval/i);

  const activation = markdownSection(coding, "Activate Or Switch The Task");
  const startCommand = "python3 ./.trellis/scripts/task.py start <resolved-task-path>";
  assert.ok(activation.includes(startCommand), "activation must use the resolved task path");
  assert.equal(coding.split(startCommand).length - 1, 1, "the activation command must appear exactly once");
  assert.ok(coding.indexOf(startCommand) > activationHeading, "activation must follow every preflight gate");

  const nativeContext = markdownSection(coding, "Load Native Trellis Context");
  assert.match(nativeContext, /after (?:activation|the activation decision|activation or pointer switch).*succeeds/i);
  assert.match(nativeContext, /^python3 \.\/\.trellis\/scripts\/get_context\.py$/m);
  assert.match(nativeContext, /get_context\.py --mode phase$/m);
  assert.match(nativeContext, /get_context\.py --mode phase --step <X\.X> --platform claude-code/);
  assert.doesNotMatch(coding, /--platform claude(?=\s|$)/);
});

test("coding manifest preflight uses exact additive and idempotent context repair", () => {
  const coding = read("templates/claude/commands/coding.md");
  const preflight = markdownSection(coding, "Preflight Task Context Manifests");
  const canonicalPath = ".trellis/spec/guides/minimal-implementation.md";
  const implementRepair =
    'python3 ./.trellis/scripts/task.py add-context "<resolved-task-path>" implement ".trellis/spec/guides/minimal-implementation.md" "Apply the minimal implementation rule during implementation"';
  const checkRepair =
    'python3 ./.trellis/scripts/task.py add-context "<resolved-task-path>" check ".trellis/spec/guides/minimal-implementation.md" "Check applicable simplification and over-engineering risks"';

  for (const expected of [
    "implement.jsonl",
    "check.jsonl",
    canonicalPath,
    "non-empty parsed `file` value exactly equals the canonical path",
    "object containing only `_example`",
    "not a real entry",
    "preserve every existing row",
    "do not add a duplicate",
    "genuinely relevant real entry",
    "Continue the same `/coding` invocation",
  ]) {
    assert.ok(preflight.includes(expected), `manifest preflight missing: ${expected}`);
  }

  for (const risk of [
    "over-engineering",
    "cleanup",
    "deprecated compatibility",
    "broad refactor",
    "unnecessary abstraction",
  ]) {
    assert.ok(preflight.includes(risk), `manifest preflight missing conditional check risk: ${risk}`);
  }

  assert.match(
    preflight,
    /guide exists[\s\S]*implement\.jsonl[\s\S]*must contain/i,
    "implementation context must be mandatory when the installed guide exists",
  );
  assert.match(preflight, /check\.jsonl[\s\S]*only when/i);
  assert.match(preflight, /no (?:listed )?check risk[\s\S]*do not add/i);
  assert.ok(preflight.includes(implementRepair));
  assert.ok(preflight.includes(checkRepair));
  assert.doesNotMatch(preflight, /(?:echo|printf|cat)\b[^\n]*(?:implement|check)\.jsonl/);

  assertMarkersInOrder(preflight, [
    ["structural JSONL inspection", "Parse every nonblank JSONL row structurally"],
    ["implementation manifest repair", implementRepair],
    ["conditional check manifest repair", checkRepair],
    ["post-repair manifest read", "Re-read `implement.jsonl` and `check.jsonl`"],
    ["failed repair blocker", "a canonical entry required by steps 4 or 5 is still absent"],
    ["task validation", "python3 ./.trellis/scripts/task.py validate <resolved-task-path>"],
    ["context listing", "python3 ./.trellis/scripts/task.py list-context <resolved-task-path>"],
    ["same-invocation continuation", "Continue the same `/coding` invocation"],
  ]);
});

test("coding preflight preserves readiness modes and compatibility blockers", () => {
  const coding = read("templates/claude/commands/coding.md");
  const inspection = markdownSection(coding, "Inspect Resolved Task Readiness");
  const preflight = markdownSection(coding, "Preflight Task Context Manifests");
  const gates = markdownSection(coding, "Development Location And Approval Gates");
  const activation = markdownSection(coding, "Activate Or Switch The Task");

  for (const expected of [
    "<resolved-task-path>/task.json",
    "<resolved-task-path>/prd.md",
    "<resolved-task-path>/design.md",
    "<resolved-task-path>/implement.md",
    "<resolved-task-path>/implement.jsonl",
    "<resolved-task-path>/check.jsonl",
    "Lightweight",
    "Complex",
    "sub-agent dispatch",
    "inline",
  ]) {
    assert.ok(inspection.includes(expected), `resolved-path inspection missing: ${expected}`);
  }
  assert.match(inspection, /Lightweight[\s\S]*prd\.md/i);
  assert.match(inspection, /Complex[\s\S]*prd\.md[\s\S]*design\.md[\s\S]*implement\.md/i);

  for (const expected of [
    "missing or seed-only manifests",
    "Invalid JSONL",
    "dangling referenced path",
    "Inline workflows",
    "load the guide directly",
    "older installation",
  ]) {
    assert.ok(preflight.includes(expected), `compatibility preflight missing: ${expected}`);
  }
  assert.match(preflight, /Inline workflows[\s\S]*skip manifest mutation/i);
  assert.match(preflight, /older installation[\s\S]*do not create a dangling entry/i);
  assert.match(preflight, /Invalid JSONL[\s\S]*stop before repair/i);
  assert.match(preflight, /dangling referenced path[\s\S]*stop before repair/i);

  assert.match(gates, /rerun[\s\S]*preflight[\s\S]*final workspace/i);
  for (const expected of ["planning", "non-current `in_progress`", "current `in_progress`", "completed"]) {
    assert.ok(activation.includes(expected), `activation state table missing: ${expected}`);
  }
  assert.match(activation, /^\| current `in_progress` \|[^\n]*do not call `task\.py start`/im);
  assert.match(activation, /completed[\s\S]*stop unless/i);
});

test("minimal implementation guide defines the task manifest contract", () => {
  const guide = read("templates/trellis/spec/guides/minimal-implementation.md");
  const contract = markdownSection(guide, "Task Context Manifest Contract");

  for (const expected of [
    ".trellis/spec/guides/minimal-implementation.md",
    "implement.jsonl",
    "check.jsonl",
    "implementation sub-agent dispatch",
    "over-engineering",
    "cleanup",
    "deprecated compatibility",
    "broad refactor",
    "unnecessary abstraction",
    "Inline workflows",
    "Lightweight and complex",
    "Rows containing only `_example`",
    "additive",
    "older installation",
  ]) {
    assert.ok(contract.includes(expected), `guide manifest contract missing: ${expected}`);
  }
  assert.match(contract, /implement\.jsonl[\s\S]*must contain/i);
  assert.match(contract, /check\.jsonl[\s\S]*only when/i);
  assert.match(contract, /Inline workflows[\s\S]*load this guide directly/i);
  assert.match(contract, /older installation[\s\S]*must not create a dangling/i);
});

test("coding preflight retains task matching and forbidden automation boundaries", () => {
  const coding = read("templates/claude/commands/coding.md");
  const resolution = markdownSection(coding, "Resolve The Task Without Mutation");
  const gates = markdownSection(coding, "Development Location And Approval Gates");
  const forbidden = markdownSection(coding, "Forbidden");

  for (const expected of [
    "exact directory-name match first",
    "suffix match",
    "multiple matches",
    "Task not found: <target-id>",
    "archived/completed",
  ]) {
    assert.ok(resolution.includes(expected), `task resolution boundary missing: ${expected}`);
  }
  assert.ok(gates.includes("请选择开发位置："));
  assert.ok(coding.includes("Do not automatically generate Review Brief Markdown or run review"));
  for (const forbiddenAction of [
    "Create a new task",
    "Run any external reviewer",
    "Commit",
    "Push",
    "Merge",
    "Rebase",
    "Run finish-work",
  ]) {
    assert.ok(forbidden.includes(forbiddenAction), `forbidden boundary missing: ${forbiddenAction}`);
  }
});

test("coding, fix, and spec-cleanup retain their stage boundaries", () => {
  const coding = read("templates/claude/commands/coding.md");
  for (const expected of [
    "task.py current --source",
    "task.py list-archive",
    "task.py start <resolved-task-path>",
    "get_context.py --mode phase --step <X.X> --platform claude-code",
    "Do not automatically generate Review Brief Markdown or run review",
  ]) {
    assert.ok(coding.includes(expected), `coding missing: ${expected}`);
  }

  const fix = read("templates/claude/commands/fix.md");
  for (const expected of [
    "Stay in the current workspace for `/fix`",
    "Do not auto-generate Review Brief or run review",
    "Do not auto-commit",
  ]) {
    assert.ok(fix.includes(expected), `fix missing: ${expected}`);
  }

  const specCleanup = read("templates/claude/commands/spec-cleanup.md");
  for (const expected of [
    "Automatically move clear archive candidates",
    "Automatically merge low-risk duplicate specs",
    "stop and ask the user",
    "Run external reviewer tools",
  ]) {
    assert.ok(specCleanup.includes(expected), `spec-cleanup missing: ${expected}`);
  }
});

test("review briefs enforce the complete no-edit boundary", () => {
  for (const file of [
    "templates/trellis/spec/templates/review-brief-template.md",
    "templates/trellis/spec/templates/rereview-brief-template.md",
  ]) {
    const brief = read(file);
    for (const expected of [
      "Do not modify, create, delete, rename, format, or generate project files.",
      "Do not self-fix findings.",
      "Use only read-only Git, search, file-reading, and existing validation commands known not to write project state.",
      "Do not install dependencies or run checks known to write cache/generated state.",
      "Do not commit, checkout, reset, stash, merge, rebase, or push.",
      "Do not run external reviewers or review the entire repository.",
    ]) {
      assert.ok(brief.includes(expected), `${file} missing no-edit boundary: ${expected}`);
    }
  }
});

test("review dispatch is agentless and no review agent is packaged or installed", () => {
  const command = read("templates/claude/commands/review.md");
  const installer = read("bin/trellis-kit.js");
  assert.doesNotMatch(command, /--agent (?:review|check)\b/);
  assert.match(command, /--provider codex/);
  assert.match(command, /--as check-codex/);
  assert.match(command, /--file "\$NUMBERED_BRIEF"/);
  assert.equal(fs.existsSync(path.join(root, "templates/trellis/agents/review.md")), false);
  assert.doesNotMatch(installer, /templates\/trellis\/agents\/review\.md/);
  assert.doesNotMatch(installer, /\.trellis\/agents\/review\.md/);
});

test("current generated copies match all 14 packaged sources and omit review agent", (t) => {
  const hasRuntimeCopies = fs.existsSync(path.join(root, ".trellis")) && fs.existsSync(path.join(root, ".claude"));
  if (!hasRuntimeCopies) {
    t.skip("clean package checkout has no gitignored runtime copies");
    return;
  }

  for (const [source, target] of expectedMappings) {
    const targetPath = path.join(root, target);
    assert.equal(fs.existsSync(targetPath), true, `missing generated target: ${target}`);
    assert.deepEqual(fs.readFileSync(targetPath), fs.readFileSync(path.join(root, source)), target);
  }
  assert.equal(fs.existsSync(path.join(root, ".trellis/agents/review.md")), false);
});

test("ordinary update preserves legacy files and prune-old is explicit", (t) => {
  const targetRoot = makeTempDirectory(t, "trellis-kit-prune-");
  runCli(["init"], targetRoot);

  for (const target of legacyTargets) {
    const targetPath = path.join(targetRoot, target);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, "legacy\n");
  }
  const currentTarget = ".claude/commands/review.md";
  fs.writeFileSync(path.join(targetRoot, currentTarget), "locally modified\n");
  const updateDryRunOutput = runCli(["update", "--dry-run"], targetRoot);
  assert.ok(updateDryRunOutput.includes(`WOULD OVERWRITE ${currentTarget}`));
  assert.equal(fs.readFileSync(path.join(targetRoot, currentTarget), "utf8"), "locally modified\n");

  const ordinaryOutput = runCli(["update"], targetRoot);
  assert.doesNotMatch(ordinaryOutput, /(?:WOULD )?DELETE/);
  assert.deepEqual(
    fs.readFileSync(path.join(targetRoot, currentTarget)),
    fs.readFileSync(path.join(root, "templates/claude/commands/review.md")),
  );
  for (const target of legacyTargets) {
    assert.equal(fs.existsSync(path.join(targetRoot, target)), true, target);
  }

  const dryRunOutput = runCli(["update", "--dry-run", "--prune-old"], targetRoot);
  for (const target of legacyTargets) {
    assert.match(dryRunOutput, new RegExp(`WOULD DELETE ${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.equal(fs.existsSync(path.join(targetRoot, target)), true, target);
  }

  const pruneOutput = runCli(["update", "--prune-old"], targetRoot);
  for (const target of legacyTargets) {
    assert.match(pruneOutput, new RegExp(`DELETE ${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.equal(fs.existsSync(path.join(targetRoot, target)), false, target);
  }
});

test("prune-old removes a broken legacy symlink and preserves a legacy-path directory", {
  skip: process.platform === "win32" && "symlink creation may require elevated Windows privileges",
}, (t) => {
  const targetRoot = makeTempDirectory(t, "trellis-kit-prune-types-");
  const symlinkTarget = path.join(targetRoot, legacyTargets[0]);
  const directoryTarget = path.join(targetRoot, legacyTargets[1]);
  fs.mkdirSync(path.dirname(symlinkTarget), { recursive: true });
  fs.symlinkSync(path.join(targetRoot, "missing-target"), symlinkTarget);
  fs.mkdirSync(directoryTarget, { recursive: true });

  const output = runCli(["update", "--prune-old"], targetRoot);
  assert.equal(fs.existsSync(symlinkTarget), false);
  assert.match(output, new RegExp(`DELETE ${legacyTargets[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.equal(fs.statSync(directoryTarget).isDirectory(), true);
  assert.match(output, new RegExp(`SKIP non-file: ${legacyTargets[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
});

test("README installed-file lists cover every mapping", () => {
  for (const readme of ["README.md", "README.en.md", "README.zh-CN.md"]) {
    const contents = read(readme);
    for (const target of expectedMappings.values()) {
      assert.ok(contents.includes(target), `${readme} missing ${target}`);
    }
    for (const target of legacyTargets) {
      assert.ok(contents.includes(target), `${readme} missing prune target ${target}`);
    }
  }
  assert.equal(read("README.md"), read("README.zh-CN.md"));
  for (const readme of ["README.md", "README.en.md", "README.zh-CN.md"]) {
    const contents = read(readme);
    assert.match(contents, /--provider claude --as review-claude --file/, readme);
    assert.doesNotMatch(contents, /--agent (?:review|check)\b/, readme);
    assert.ok(contents.includes("test ! -e .trellis/agents/review.md"), `${readme} missing review-agent exclusion check`);
    assert.ok(contents.includes('event.by === "check-codex"'), `${readme} missing raw-event author schema`);
    assert.ok(contents.includes("binary-safe"), `${readme} missing cross-shell raw capture guidance`);
  }
});

test("npm pack JSON parser supports npm 11 and npm 12 while selecting the named package", () => {
  const packageName = "trellis-kit";
  const files = [{ path: "bin/trellis-kit.js" }];
  const expectedManifest = { name: packageName, files };
  const otherManifest = { name: "another-package", files: [{ path: "other.js" }] };
  const npm11Output = JSON.stringify([otherManifest, expectedManifest]);
  const npm12Output = JSON.stringify({
    "another-package": otherManifest,
    [packageName]: expectedManifest,
  });

  assert.deepEqual(parseNpmPackManifest(npm11Output, packageName), expectedManifest);
  assert.deepEqual(parseNpmPackManifest(npm12Output, packageName), expectedManifest);
});

test("npm pack JSON parser rejects malformed or ambiguous manifests with context", () => {
  const invalidJson = /npm pack --dry-run --json output for package "trellis-kit".*not valid JSON/i;
  const missingManifest = /npm pack --dry-run --json output for package "trellis-kit".*does not contain a manifest/i;
  const files = [{ path: "bin/trellis-kit.js" }];

  assert.throws(() => parseNpmPackManifest("", "trellis-kit"), invalidJson);
  assert.throws(() => parseNpmPackManifest("{", "trellis-kit"), invalidJson);
  assert.throws(() => parseNpmPackManifest("[]", "trellis-kit"), missingManifest);
  assert.throws(
    () => parseNpmPackManifest(JSON.stringify([{ name: "another-package", files }]), "trellis-kit"),
    missingManifest,
  );
  assert.throws(
    () => parseNpmPackManifest(JSON.stringify({ "another-package": { name: "another-package", files } }), "trellis-kit"),
    missingManifest,
  );
  assert.throws(
    () => parseNpmPackManifest(JSON.stringify({ "trellis-kit": null }), "trellis-kit"),
    missingManifest,
  );
  assert.throws(
    () => parseNpmPackManifest(JSON.stringify({ "trellis-kit": {} }), "trellis-kit"),
    /npm pack --dry-run --json output for package "trellis-kit".*package name/i,
  );
  assert.throws(
    () =>
      parseNpmPackManifest(
        JSON.stringify([
          { name: "trellis-kit", files },
          { name: "trellis-kit", files },
        ]),
        "trellis-kit",
      ),
    /npm pack --dry-run --json output for package "trellis-kit".*multiple/i,
  );
  assert.throws(
    () =>
      parseNpmPackManifest(
        JSON.stringify({ "trellis-kit": { name: "another-package", files } }),
        "trellis-kit",
      ),
    /npm pack --dry-run --json output for package "trellis-kit".*package name/i,
  );
});

test("npm pack JSON parser rejects missing, empty, or malformed files with context", () => {
  const context = /npm pack --dry-run --json output for package "trellis-kit".*files/i;
  const output = (files) => JSON.stringify({ "trellis-kit": { name: "trellis-kit", files } });

  assert.throws(
    () => parseNpmPackManifest(JSON.stringify({ "trellis-kit": { name: "trellis-kit" } }), "trellis-kit"),
    context,
  );
  assert.throws(() => parseNpmPackManifest(output([]), "trellis-kit"), context);
  assert.throws(() => parseNpmPackManifest(output("bin/trellis-kit.js"), "trellis-kit"), context);
  assert.throws(() => parseNpmPackManifest(output([null]), "trellis-kit"), context);
  assert.throws(() => parseNpmPackManifest(output([{}]), "trellis-kit"), context);
  assert.throws(() => parseNpmPackManifest(output([{ path: "" }]), "trellis-kit"), context);
});

test("npm package contains current templates and excludes legacy entrypoints", () => {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const output = execFileSync(npm, ["pack", "--dry-run", "--json"], { cwd: root, encoding: "utf8" });
  const packageName = JSON.parse(read("package.json")).name;
  const manifest = parseNpmPackManifest(output, packageName);
  const files = new Set(manifest.files.map((file) => file.path));

  assert.equal(files.has("bin/trellis-kit.js"), true);
  for (const source of expectedMappings.keys()) {
    assert.equal(files.has(source), true, `package missing ${source}`);
  }
  for (const legacy of [
    "templates/trellis/agents/review.md",
    "templates/claude/commands/handoff.md",
    "templates/claude/commands/rereview.md",
    "templates/claude/commands/task.md",
    "templates/trellis/scripts/codex-review.sh",
    "templates/trellis/scripts/codex-rereview.sh",
    "templates/trellis/scripts/codex-review.ps1",
    "templates/trellis/scripts/codex-rereview.ps1",
    "templates/trellis/spec/guides/claude-codex-review-workflow.md",
    "templates/trellis/spec/guides/review-handoff-workflow.md",
    "templates/trellis/spec/templates/codex-handoff-template.md",
    "templates/trellis/spec/templates/review-handoff-template.md",
    "templates/trellis/spec/templates/rereview-handoff-template.md",
  ]) {
    assert.equal(files.has(legacy), false, `package unexpectedly contains ${legacy}`);
  }
});

test("npm publish workflow runs contract tests before syntax and package checks", () => {
  const workflow = read(".github/workflows/npm-publish.yml");
  const testStep = workflow.indexOf("run: npm test");
  const syntaxStep = workflow.indexOf("run: node --check bin/trellis-kit.js");
  const packStep = workflow.indexOf("run: npm pack --dry-run");
  assert.ok(testStep >= 0, "missing npm test gate");
  assert.ok(testStep < syntaxStep && syntaxStep < packStep, "publish validation steps are out of order");
});
