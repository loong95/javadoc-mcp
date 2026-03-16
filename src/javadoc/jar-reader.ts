import AdmZip from "adm-zip";
import { MavenCoordinate } from "../types.js";
import { ensureJar } from "./resolver.js";

/** 缓存已打开的 ZIP 实例，避免重复 IO */
const zipCache = new Map<string, AdmZip>();

function normalizeEntryPath(entryPath: string): string {
  return entryPath.replace(/^\/+/, "");
}

export function resolveEntryName(
  entryNames: string[],
  entryPath: string
): string | null {
  const normalizedPath = normalizeEntryPath(entryPath);
  if (entryNames.includes(normalizedPath)) {
    return normalizedPath;
  }

  const suffix = `/${normalizedPath}`;
  const match = entryNames
    .filter((name) => name.endsWith(suffix))
    .sort((left, right) => left.length - right.length)[0];

  return match ?? null;
}

function cacheKey(coord: MavenCoordinate): string {
  return `${coord.groupId}:${coord.artifactId}:${coord.version}`;
}

/** 获取或创建 AdmZip 实例 */
async function getZip(coord: MavenCoordinate): Promise<AdmZip> {
  const key = cacheKey(coord);
  let zip = zipCache.get(key);
  if (zip) return zip;

  const jarPath = await ensureJar(coord);
  zip = new AdmZip(jarPath);
  zipCache.set(key, zip);
  return zip;
}

/** 从 JAR 中读取指定条目，返回 UTF-8 字符串。不存在则返回 null。 */
export async function readEntry(
  coord: MavenCoordinate,
  entryPath: string
): Promise<string | null> {
  const zip = await getZip(coord);
  const entryNames = zip
    .getEntries()
    .filter((entry) => !entry.isDirectory)
    .map((entry) => entry.entryName);
  const entryName = resolveEntryName(entryNames, entryPath);
  if (!entryName) return null;

  const entry = zip.getEntry(entryName);
  if (!entry) return null;
  return entry.getData().toString("utf-8");
}

/** 列出 JAR 中所有条目名称 */
export async function listEntries(
  coord: MavenCoordinate
): Promise<string[]> {
  const zip = await getZip(coord);
  return zip.getEntries().map((e) => e.entryName);
}

/** 列出某个目录前缀下的直接条目 */
export async function listDirectory(
  coord: MavenCoordinate,
  dirPrefix: string
): Promise<string[]> {
  const zip = await getZip(coord);
  const prefix = dirPrefix.endsWith("/") ? dirPrefix : dirPrefix + "/";
  return zip
    .getEntries()
    .filter((e) => e.entryName.startsWith(prefix) && e.entryName !== prefix)
    .map((e) => e.entryName);
}
