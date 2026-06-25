#!/usr/bin/env node

import fs from "fs";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgRoot = path.resolve(__dirname, "..");
const packageJsonPath = path.join(pkgRoot, "package.json");

const isWindows = process.platform === "win32";
const scriptExtension = isWindows ? "ps1" : "sh";
const scriptExecutable = !isWindows;

const templateFiles = [
  {
    from: "templates/trellis/spec/guides/claude-codex-review-workflow.md",
    to: ".trellis/spec/guides/claude-codex-review-workflow.md",
  },
  {
    from: "templates/trellis/spec/templates/codex-handoff-template.md",
    to: ".trellis/spec/templates/codex-handoff-template.md",
  },
  {
    from: `templates/trellis/scripts/codex-review.${scriptExtension}`,
    to: `.trellis/scripts/codex-review.${scriptExtension}`,
    executable: scriptExecutable,
  },
  {
    from: `templates/trellis/scripts/codex-rereview.${scriptExtension}`,
    to: `.trellis/scripts/codex-rereview.${scriptExtension}`,
    executable: scriptExecutable,
  },
  {
    from: "templates/claude/commands/dev.md",
    to: ".claude/commands/dev.md",
  },
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
  console.log(`Trellis Codex Review Kit ${pkg.version}

Usage:
  trellis-codex-review-kit init [--force] [--dry-run]
  trellis-codex-review-kit update [--dry-run]
  trellis-codex-review-kit --help
  trellis-codex-review-kit --version

Commands:
  init          Install Trellis + Claude Code + Codex Review workflow files.
                Existing files are skipped unless --force is passed.
  update        Update installed workflow files from this package.
                Existing files are overwritten by default.
                Both commands install Bash .sh review scripts on macOS/Linux
                and native PowerShell .ps1 review scripts on Windows.

Options:
  --force       Overwrite existing files during init. Update overwrites by default.
  --dry-run     Preview actions without writing files or changing permissions.
  --help        Print this help message.
  --version     Print package version.

Safety:
  Existing files are skipped by default. This installer does not run Trellis,
  Claude Code, Codex, git push, git merge, git rebase, or modify .trellis/workflow.md.`);
}

function printVersion() {
  console.log(readPackageJson().version);
}

function usageError(message) {
  console.error(`ERROR: ${message}`);
  console.error("Run `trellis-codex-review-kit --help` for usage.");
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

  const parsed = { command, force: command === "update", dryRun: false };
  for (const option of options) {
    if (option === "--force" && command === "init") {
      parsed.force = true;
    } else if (option === "--force") {
      return { error: "--force is not needed with update; update overwrites installed files by default" };
    } else if (option === "--dry-run") {
      parsed.dryRun = true;
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

function printNextSteps(command, dryRun) {
  const action = command === "update" ? "Updated" : "Installed";
  const dryAction = command === "update" ? "update" : "install";
  const verb = dryRun ? `Dry run complete for Trellis Codex Review Kit ${dryAction}.` : `${action} Trellis Codex Review Kit.`;
  console.log(`\n${verb}

Next steps:
1. Verify Codex CLI:
   codex --version

2. Start new work in Claude Code:
   /dev 新需求：xxxx。写完后生成 handoff，自动 commit，并自动触发 Codex Review。不要 push，不要 finish-work。

3. Continue interrupted work:
   /trellis:continue`);
}

function installTemplates(command, options) {
  const targetRoot = process.cwd();

  console.log("Trellis Codex Review Kit");
  console.log(`\nCommand: ${command}`);
  console.log(`Target: ${targetRoot}\n`);

  warnIfMissing(targetRoot, ".git", "Run inside a git project before using the installed review scripts.");
  warnIfMissing(targetRoot, ".trellis", "Run `trellis init -u <name> --claude --codex` first if this is a new project.");
  warnIfMissing(targetRoot, ".claude", "Run Trellis/Claude Code setup first if you want the /dev command available.");

  validateTemplateSources();

  console.log("");
  for (const file of templateFiles) {
    installFile(file, targetRoot, options);
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
