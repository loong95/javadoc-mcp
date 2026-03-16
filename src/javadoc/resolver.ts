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

function resolveLocalRepository(): string {
  try {
    if (!fs.existsSync(USER_SETTINGS_PATH)) {
      return DEFAULT_LOCAL_REPOSITORY;
    }

    const settings = fs.readFileSync(USER_SETTINGS_PATH, "utf-8");
    const match = settings.match(/<localRepository>([^<]+)<\/localRepository>/);
    if (!match) {
      return DEFAULT_LOCAL_REPOSITORY;
    }

    return expandMavenPath(match[1]);
  } catch {
    return DEFAULT_LOCAL_REPOSITORY;
  }
}

const LOCAL_REPOSITORY = resolveLocalRepository();

/** 获取某个 Maven 坐标对应的 JavaDoc JAR 在本地 Maven 仓库中的路径 */
export function getJarPath(coord: MavenCoordinate): string {
  const groupPath = coord.groupId.replace(/\./g, "/");
  return path.join(
    LOCAL_REPOSITORY,
    groupPath,
    coord.artifactId,
    coord.version,
    `${coord.artifactId}-${coord.version}-javadoc.jar`
  );
}

/** 检查 JAR 是否已存在于本地 Maven 仓库 */
export function isCached(coord: MavenCoordinate): boolean {
  return fs.existsSync(getJarPath(coord));
}

/** 通过 mvn 命令将 JavaDoc JAR 下载到本地 Maven 仓库 */
async function downloadViaMaven(coord: MavenCoordinate): Promise<void> {
  const artifact = `${coord.groupId}:${coord.artifactId}:${coord.version}:jar:javadoc`;
  await execFileAsync("mvn", [
    "dependency:get",
    `-Dartifact=${artifact}`,
    "-Dtransitive=false",
  ]);
}

/** 确保 JavaDoc JAR 已存在于本地 Maven 仓库。返回 JAR 文件路径。 */
export async function ensureJar(coord: MavenCoordinate): Promise<string> {
  const jarPath = getJarPath(coord);

  if (isCached(coord)) {
    return jarPath;
  }

  try {
    await downloadViaMaven(coord);
  } catch (mvnError) {
    throw new Error(
      `Failed to resolve javadoc for ${coord.groupId}:${coord.artifactId}:${coord.version} into local Maven repository ${LOCAL_REPOSITORY}. ` +
        `Maven: ${mvnError instanceof Error ? mvnError.message : mvnError}.`
    );
  }

  if (!fs.existsSync(jarPath)) {
    throw new Error(
      `Resolved javadoc for ${coord.groupId}:${coord.artifactId}:${coord.version}, ` +
        `but no JAR was found in local Maven repository: ${jarPath}.`
    );
  }

  return jarPath;
}
