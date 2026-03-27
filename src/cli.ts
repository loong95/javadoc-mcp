#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { readPackageManifest } from "./package-manifest.js";
import {
  toolDefinitions,
  toolDefinitionsByCliName,
  type ToolDefinition,
} from "./tool-definitions.js";

type CliIo = {
  stdout: Pick<NodeJS.WriteStream, "write">;
  stderr: Pick<NodeJS.WriteStream, "write">;
};

type CliParseResult =
  | { kind: "help"; commandName?: string }
  | { kind: "version" }
  | { kind: "run"; definition: ToolDefinition; params: Record<string, string> }
  | { kind: "error"; message: string };

const packageJson = readPackageManifest();
const commandAliases = new Map<string, string>(
  toolDefinitions.flatMap((definition) => [
    [definition.cliName, definition.cliName],
    [definition.name, definition.cliName],
  ])
);

function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/_/g, "-")
    .replace(/[A-Z]/g, (value) => `-${value.toLowerCase()}`)
    .replace(/^-+/, "")
    .toLowerCase();
}

function normalizeCommandName(name: string): string | null {
  return commandAliases.get(normalizeName(name)) ?? null;
}

function parseOptionArgs(args: string[]): Record<string, string> {
  const options: Record<string, string> = {};

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith("-")) {
      throw new Error(`Unexpected positional argument: ${argument}`);
    }

    if (!argument.startsWith("--")) {
      throw new Error(`Unsupported short option: ${argument}`);
    }

    const optionText = argument.slice(2);
    const [rawName, inlineValue] = optionText.split("=", 2);
    const optionName = normalizeName(rawName);
    if (!optionName) {
      throw new Error(`Invalid option: ${argument}`);
    }

    const optionValue =
      inlineValue ?? (index + 1 < args.length ? args[index + 1] : undefined);

    if (inlineValue === undefined) {
      index += 1;
    }

    if (optionValue === undefined || optionValue.startsWith("--")) {
      throw new Error(`Missing value for option --${optionName}`);
    }

    options[optionName] = optionValue;
  }

  return options;
}

function buildCommandUsage(definition: ToolDefinition): string {
  const usage = definition.options
    .map((option) =>
      option.required ? `--${option.flag} <value>` : `[--${option.flag} <value>]`
    )
    .join(" ");

  const lines = [
    `Usage: javadoc-cli ${definition.cliName} ${usage}`.trim(),
    "",
    definition.description,
    "",
    "Options:",
  ];

  for (const option of definition.options) {
    const suffix = option.required ? "required" : "optional";
    lines.push(`  --${option.flag}    ${option.description} (${suffix})`);
  }

  lines.push("  --help         Show this help message");
  return lines.join("\n");
}

function buildGlobalHelp(): string {
  const lines = [
    `${packageJson.name ?? "javadoc-mcp"} ${packageJson.version ?? "0.0.0"}`,
    "",
    "Usage:",
    "  javadoc-cli <command> [options]",
    "  javadoc-cli --help",
    "  javadoc-cli --version",
    "",
    "Commands:",
  ];

  for (const definition of toolDefinitions) {
    lines.push(`  ${definition.cliName}    ${definition.description}`);
  }

  lines.push("");
  lines.push("Use `javadoc-cli <command> --help` for command-specific help.");

  return lines.join("\n");
}

function parseCommandParams(
  definition: ToolDefinition,
  options: Record<string, string>
): CliParseResult {
  const rawParams: Record<string, string> = {};
  for (const option of definition.options) {
    const value = options[option.flag];
    if (value !== undefined) {
      rawParams[option.key] = value;
    }
  }

  const parsed = definition.schema.safeParse(rawParams);
  if (!parsed.success) {
    return {
      kind: "error",
      message: formatZodError(parsed.error),
    };
  }

  return {
    kind: "run",
    definition,
    params: parsed.data as Record<string, string>,
  };
}

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "input";
      return `${path}: ${issue.message}`;
    })
    .join("\n");
}

export function parseCliArgv(argv: string[]): CliParseResult {
  if (argv.length === 0) {
    return { kind: "help" };
  }

  const [firstArg, ...restArgs] = argv;

  if (firstArg === "--help" || firstArg === "help") {
    return { kind: "help" };
  }

  if (firstArg === "--version") {
    return { kind: "version" };
  }

  const commandName = normalizeCommandName(firstArg);
  if (!commandName) {
    return {
      kind: "error",
      message: `Unknown command: ${firstArg}\n\n${buildGlobalHelp()}`,
    };
  }

  if (restArgs.includes("--help")) {
    return { kind: "help", commandName };
  }

  const definition = toolDefinitionsByCliName.get(commandName);
  if (!definition) {
    return {
      kind: "error",
      message: `Unknown command: ${firstArg}`,
    };
  }

  try {
    const options = parseOptionArgs(restArgs);
    return parseCommandParams(definition, options);
  } catch (error) {
    return {
      kind: "error",
      message: `${error instanceof Error ? error.message : String(error)}\n\n${buildCommandUsage(definition)}`,
    };
  }
}

export async function runCli(
  argv = process.argv.slice(2),
  io: CliIo = { stdout: process.stdout, stderr: process.stderr }
): Promise<number> {
  const parsed = parseCliArgv(argv);

  if (parsed.kind === "help") {
    const output = parsed.commandName
      ? buildCommandUsage(
          toolDefinitionsByCliName.get(parsed.commandName) as ToolDefinition
        )
      : buildGlobalHelp();
    io.stdout.write(`${output}\n`);
    return 0;
  }

  if (parsed.kind === "version") {
    io.stdout.write(`${packageJson.version ?? "0.0.0"}\n`);
    return 0;
  }

  if (parsed.kind === "error") {
    io.stderr.write(`${parsed.message}\n`);
    return 1;
  }

  try {
    const result = await parsed.definition.handler(parsed.params);
    io.stdout.write(result.endsWith("\n") ? result : `${result}\n`);
    return 0;
  } catch (error) {
    io.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`
    );
    return 1;
  }
}

const isMainModule =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  runCli().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
