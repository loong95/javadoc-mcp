import AdmZip from "adm-zip";
import type { MavenCoordinate } from "../types.js";
import { resolveEntryName } from "./jar-reader.js";
import { ensureSourceJar } from "./resolver.js";

const zipCache = new Map<string, AdmZip>();

function cacheKey(coord: MavenCoordinate): string {
  return `${coord.groupId}:${coord.artifactId}:${coord.version}:sources`;
}

function normalizeEntryPath(entryPath: string): string {
  return entryPath.replace(/^\/+/, "");
}

async function getZip(coord: MavenCoordinate): Promise<AdmZip> {
  const key = cacheKey(coord);
  let zip = zipCache.get(key);
  if (zip) {
    return zip;
  }

  const jarPath = await ensureSourceJar(coord);
  zip = new AdmZip(jarPath);
  zipCache.set(key, zip);
  return zip;
}

export async function readSourceEntry(
  coord: MavenCoordinate,
  entryPath: string
): Promise<string | null> {
  const zip = await getZip(coord);
  const normalizedPath = normalizeEntryPath(entryPath);
  const entryNames = zip
    .getEntries()
    .filter((entry) => !entry.isDirectory)
    .map((entry) => entry.entryName);
  const entryName = resolveEntryName(entryNames, normalizedPath);
  if (!entryName) {
    return null;
  }

  const entry = zip.getEntry(entryName);
  if (!entry) {
    return null;
  }

  return entry.getData().toString("utf-8");
}
