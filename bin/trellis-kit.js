#!/usr/bin/env node

import fs from "fs";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgRoot = path.resolve(__dirname, "..");
const packageJsonPath = path.join(pkgRoot, "package.json");

const templateFiles = [
  {
    from: "templates/trellis/spec/guides/review-workflow.md",
    to: ".trellis/spec/guides/review-workflow.md",
  },
  {
    from: "templates/trellis/spec/guides/review-loop-workflow.md",
    to: ".trellis/spec/guides/review-loop-workflow.md",
  },
  {
    from: "templates/trellis/spec/guides/minimal-implementation.md",
    to: ".trellis/spec/guides/minimal-implementation.md",
  },
  {
    from: "templates/trellis/spec/templates/review-brief-template.md",
    to: ".trellis/spec/templates/review-brief-template.md",
  },
  {
    from: "templates/trellis/spec/templates/rereview-brief-template.md",
    to: ".trellis/spec/templates/rereview-brief-template.md",
  },
  {
    from: "templates/trellis/spec/templates/review-fix-summary-template.md",
    to: ".trellis/spec/templates/review-fix-summary-template.md",
  },
  {
    from: "templates/trellis/spec/guides/development-location-decision.md",
    to: ".trellis/spec/guides/development-location-decision.md",
  },
  {
    from: "templates/trellis/spec/guides/fast-path-change-policy.md",
    to: ".trellis/spec/guides/fast-path-change-policy.md",
  },
  {
    from: "templates/trellis/spec/guides/spec-cleanup-guide.md",
    to: ".trellis/spec/guides/spec-cleanup-guide.md",
  },
  {
    from: "templates/claude/commands/coding.md",
    to: ".claude/commands/coding.md",
  },
  {
    from: "templates/claude/commands/fix.md",
    to: ".claude/commands/fix.md",
  },
  {
    from: "templates/claude/commands/review.md",
    to: ".claude/commands/review.md",
  },
  {
    from: "templates/claude/commands/review-fix.md",
    to: ".claude/commands/review-fix.md",
  },
  {
    from: "templates/claude/commands/spec-cleanup.md",
    to: ".claude/commands/spec-cleanup.md",
  },
];

const oldFilesToPrune = [
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

function readPackageJson() {
  try {
    return JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  } catch (error) {
    throw new Error(`Failed to read package metadata at ${packageJsonPath}: ${error.message}`);
  }
}

function printHelp() {
  const pkg = readPackageJson();
  console.log(`Trellis Kit ${pkg.version}

Usage:
  trellis-kit init [--force] [--dry-run]
  trellis-kit update [--dry-run] [--prune-old]
  trellis-kit --help
  trellis-kit --version

Commands:
  init          Install Trellis + Claude Code workflow files.
                Existing files are skipped unless --force is passed.
  update        Update installed workflow files from this package.
                Existing files are overwritten by default.

Options:
  --force       Overwrite existing files during init. Update overwrites by default.
  --prune-old   During update, delete legacy review scripts from .trellis/scripts/
                and .trellis/spec/scripts/, old renamed templates from .trellis/spec/,
                and old renamed commands from .claude/commands/.
  --dry-run     Preview actions without writing files or changing permissions.
  --help        Print this help message.
  --version     Print package version.

Safety:
  Existing files are skipped by init by default. This installer does not run
  Trellis, Claude Code, Codex, git push, git merge, git rebase, or modify
  .trellis/workflow.md. It deletes files only with update --prune-old
  (documented legacy review scripts, renamed spec templates, and renamed Claude commands).`);
}

function printVersion() {
  console.log(readPackageJson().version);
}

function usageError(message) {
  console.error(`ERROR: ${message}`);
  console.error("Run `trellis-kit --help` for usage.");
  process.exitCode = 1;
}

function parseArgs(args) {
  if (args.length === 0) {
    return { command: "help" };
  }

  if (args.includes("--help")) {
    if (args.length === 1 || (["init", "update"].includes(args[0]) && args.length === 2)) {
      return { command: "help" };
    }
    return { error: `unknown command or option combination: ${args.join(" ")}` };
  }

  if (args.includes("--version")) {
    if (args.length > 1) {
      return { error: "--version cannot be combined with other arguments" };
    }
    return { command: "version" };
  }

  const [command, ...options] = args;
  if (!["init", "update"].includes(command)) {
    return { error: `unknown command: ${command}` };
  }

  const parsed = { command, force: command === "update", dryRun: false, pruneOld: false };
  for (const option of options) {
    if (option === "--force" && command === "init") {
      parsed.force = true;
    } else if (option === "--force") {
      return { error: "--force is not needed with update; update overwrites installed files by default" };
    } else if (option === "--dry-run") {
      parsed.dryRun = true;
    } else if (option === "--prune-old" && command === "update") {
      parsed.pruneOld = true;
    } else if (option === "--prune-old") {
      return { error: "--prune-old can only be used with update" };
    } else {
      return { error: `unknown option: ${option}` };
    }
  }

  return parsed;
}

function warnIfMissing(targetRoot, dirname, hint) {
  if (!fs.existsSync(path.join(targetRoot, dirname))) {
    console.warn(`WARN: current directory does not contain ${dirname}`);
    if (hint) {
      console.warn(`      ${hint}`);
    }
  }
}

function validateTemplateSources() {
  for (const file of templateFiles) {
    const source = path.join(pkgRoot, file.from);
    if (!fs.existsSync(source)) {
      throw new Error(`Missing bundled template: ${file.from}`);
    }
    if (!fs.statSync(source).isFile()) {
      throw new Error(`Bundled template is not a file: ${file.from}`);
    }
  }
}

function actionForDestination(destExists, force, dryRun) {
  if (destExists && !force) {
    return dryRun ? "WOULD SKIP existing" : "SKIP existing";
  }
  if (destExists && force) {
    return dryRun ? "WOULD OVERWRITE" : "OVERWRITE";
  }
  return dryRun ? "WOULD CREATE" : "CREATE";
}

function installFile(file, targetRoot, options) {
  const source = path.join(pkgRoot, file.from);
  const destination = path.join(targetRoot, file.to);
  const destExists = fs.existsSync(destination);
  const action = actionForDestination(destExists, options.force, options.dryRun);

  const separator = action.endsWith("existing") ? ": " : " ";
  console.log(`${action}${separator}${file.to}`);

  if (options.dryRun || (destExists && !options.force)) {
    return;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);

  if (file.executable) {
    fs.chmodSync(destination, 0o755);
  }
}

function pruneOldFiles(targetRoot, dryRun) {
  for (const relativePath of oldFilesToPrune) {
    const target = path.join(targetRoot, relativePath);
    let stat;
    try {
      stat = fs.lstatSync(target);
    } catch (error) {
      if (error.code === "ENOENT") {
        console.log(`${dryRun ? "WOULD SKIP missing" : "SKIP missing"}: ${relativePath}`);
        continue;
      }
      throw error;
    }

    if (!stat.isFile() && !stat.isSymbolicLink()) {
      console.log(`SKIP non-file: ${relativePath}`);
      continue;
    }

    console.log(`${dryRun ? "WOULD DELETE" : "DELETE"} ${relativePath}`);
    if (!dryRun) {
      fs.unlinkSync(target);
    }
  }
}

function printNextSteps(command, dryRun) {
  const action = command === "update" ? "Updated" : "Installed";
  const dryAction = command === "update" ? "update" : "install";
  const verb = dryRun ? `Dry run complete for Trellis Kit ${dryAction}.` : `${action} Trellis Kit.`;
  console.log(`\n${verb}

Next steps:
1. Continue or implement a prepared Trellis task in Claude Code:
   /coding <task-id>

2. Start a small bug fix or patch in Claude Code:
   /fix <bug description>

3. Run Codex review for the active Trellis task through trellis channel:
   /review

4. Apply actionable fixes from the latest saved review result:
   /review-fix

5. Re-review fixes through the same trellis channel workflow:
   /review --rereview

6. Clean up Trellis specs when needed:
   /spec-cleanup`);
}

function installTemplates(command, options) {
  const targetRoot = process.cwd();

  console.log("Trellis Kit");
  console.log(`\nCommand: ${command}`);
  console.log(`Target: ${targetRoot}\n`);

  warnIfMissing(targetRoot, ".git", "Trellis workflow files are intended for use inside a git project.");
  warnIfMissing(targetRoot, ".trellis", "Run `trellis init -u <name> --claude --codex` first if this is a new project.");
  warnIfMissing(targetRoot, ".claude", "Run Trellis/Claude Code setup first if you want the /coding, /fix, /review, /review-fix, and /spec-cleanup commands available.");

  if (command === "init" && options.pruneOld) {
    throw new Error("--prune-old can only be used with update");
  }

  validateTemplateSources();

  console.log("");
  for (const file of templateFiles) {
    installFile(file, targetRoot, options);
  }

  if (command === "update" && options.pruneOld) {
    pruneOldFiles(targetRoot, options.dryRun);
  }

  printNextSteps(command, options.dryRun);
}

try {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.error) {
    usageError(parsed.error);
  } else if (parsed.command === "help") {
    printHelp();
  } else if (parsed.command === "version") {
    printVersion();
  } else if (["init", "update"].includes(parsed.command)) {
    installTemplates(parsed.command, parsed);
  }
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
