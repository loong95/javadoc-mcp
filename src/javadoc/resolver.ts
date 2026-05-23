import { MavenCoordinate } from "../types.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEFAULT_LOCAL_REPOSITORY = path.join(os.homedir(), ".m2", "repository");
const USER_SETTINGS_PATH = path.join(os.homedir(), ".m2", "settings.xml");

function expandMavenPath(rawPath: string): string {
  return rawPath
    .trim()
    .replace(/^~(?=$|[\\/])/, os.homedir())
    .replace(/\$\{user\.home\}/g, os.homedir())
    .replace(/\$\{env\.HOME\}/g, process.env.HOME ?? os.homedir());
}

export function extractLocalRepositoryPath(settings: string): string | null {
  const uncommentedSettings = settings.replace(/<!--[\s\S]*?-->/g, "");
  const match = uncommentedSettings.match(
    /<localRepository>\s*([^<]+?)\s*<\/localRepository>/
  );

  return match ? match[1].trim() : null;
}

function resolveLocalRepository(): string {
  try {
    if (!fs.existsSync(USER_SETTINGS_PATH)) {
      return DEFAULT_LOCAL_REPOSITORY;
    }

    const settings = fs.readFileSync(USER_SETTINGS_PATH, "utf-8");
    const localRepository = extractLocalRepositoryPath(settings);
    if (!localRepository) {
      return DEFAULT_LOCAL_REPOSITORY;
    }

    return expandMavenPath(localRepository);
  } catch {
    return DEFAULT_LOCAL_REPOSITORY;
  }
}

const LOCAL_REPOSITORY = resolveLocalRepository();

type MavenInvocation = {
  command: string;
  args: string[];
};

type MavenArgOptions = {
  localRepository?: string;
  settingsPath?: string | null;
};

function getClassifierJarFileName(
  coord: MavenCoordinate,
  classifier: string
): string {
  return `${coord.artifactId}-${coord.version}-${classifier}.jar`;
}

/** 获取某个 Maven 坐标对应分类器 JAR 在本地 Maven 仓库中的路径 */
export function getClassifierJarPath(
  coord: MavenCoordinate,
  classifier: string
): string {
  const groupPath = coord.groupId.replace(/\./g, "/");
  return path.join(
    LOCAL_REPOSITORY,
    groupPath,
    coord.artifactId,
    coord.version,
    getClassifierJarFileName(coord, classifier)
  );
}

/** 获取某个 Maven 坐标对应的 JavaDoc JAR 在本地 Maven 仓库中的路径 */
export function getJarPath(coord: MavenCoordinate): string {
  return getClassifierJarPath(coord, "javadoc");
}

/** 检查 JAR 是否已存在于本地 Maven 仓库 */
export function isCached(coord: MavenCoordinate): boolean {
  return fs.existsSync(getJarPath(coord));
}

function isClassifierCached(
  coord: MavenCoordinate,
  classifier: string
): boolean {
  return fs.existsSync(getClassifierJarPath(coord, classifier));
}

export function getMavenInvocation(
  args: string[],
  platform: NodeJS.Platform = process.platform
): MavenInvocation {
  if (platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "mvn", ...args],
    };
  }

  return {
    command: "mvn",
    args,
  };
}

export function buildMavenArgs(
  args: string[],
  options: MavenArgOptions = {}
): string[] {
  const finalArgs: string[] = [];

  if (options.settingsPath) {
    finalArgs.push("-s", options.settingsPath);
  }

  if (options.localRepository) {
    finalArgs.push(`-Dmaven.repo.local=${options.localRepository}`);
  }

  finalArgs.push(...args);

  return finalArgs;
}

export function formatProcessError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const details = [error.message.trim()];
  const stdout =
    "stdout" in error && typeof error.stdout === "string"
      ? error.stdout.trim()
      : "";
  const stderr =
    "stderr" in error && typeof error.stderr === "string"
      ? error.stderr.trim()
      : "";

  if (stdout) {
    details.push("stdout:", stdout);
  }

  if (stderr) {
    details.push("stderr:", stderr);
  }

  return details.join("\n");
}

/** 通过 mvn 命令将指定 classifier 的 JAR 下载到本地 Maven 仓库 */
async function downloadViaMaven(
  coord: MavenCoordinate,
  classifier: string
): Promise<void> {
  const artifact = `${coord.groupId}:${coord.artifactId}:${coord.version}:jar:${classifier}`;
  const settingsPath = fs.existsSync(USER_SETTINGS_PATH) ? USER_SETTINGS_PATH : null;
  const invocation = getMavenInvocation(
    buildMavenArgs(
      [
        "dependency:get",
        `-Dartifact=${artifact}`,
        "-Dtransitive=false",
      ],
      {
        localRepository: LOCAL_REPOSITORY,
        settingsPath,
      }
    )
  );

  await execFileAsync(invocation.command, invocation.args);
}

/** 确保指定 classifier 的 JAR 已存在于本地 Maven 仓库。返回 JAR 文件路径。 */
export async function ensureClassifierJar(
  coord: MavenCoordinate,
  classifier: string
): Promise<string> {
  const jarPath = getClassifierJarPath(coord, classifier);

  if (isClassifierCached(coord, classifier)) {
    return jarPath;
  }

  try {
    await downloadViaMaven(coord, classifier);
  } catch (mvnError) {
    throw new Error(
      `Failed to resolve ${classifier} jar for ${coord.groupId}:${coord.artifactId}:${coord.version} into local Maven repository ${LOCAL_REPOSITORY}. ` +
        `Maven: ${formatProcessError(mvnError)}.`
    );
  }

  if (!fs.existsSync(jarPath)) {
    throw new Error(
      `Resolved ${classifier} jar for ${coord.groupId}:${coord.artifactId}:${coord.version}, ` +
        `but no JAR was found in local Maven repository: ${jarPath}.`
    );
  }

  return jarPath;
}

/** 确保 JavaDoc JAR 已存在于本地 Maven 仓库。返回 JAR 文件路径。 */
export async function ensureJar(coord: MavenCoordinate): Promise<string> {
  return ensureClassifierJar(coord, "javadoc");
}

/** 确保 sources JAR 已存在于本地 Maven 仓库。返回 JAR 文件路径。 */
export async function ensureSourceJar(coord: MavenCoordinate): Promise<string> {
  return ensureClassifierJar(coord, "sources");
}
