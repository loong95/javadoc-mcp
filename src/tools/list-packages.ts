import { z } from "zod";
import { readEntry } from "../javadoc/jar-reader.js";
import { parsePackageList } from "../javadoc/parser.js";
import type { MavenCoordinate } from "../types.js";

export const listPackagesSchema = z.object({
  groupId: z.string().describe("Maven Group ID, e.g. org.apache.commons"),
  artifactId: z.string().describe("Maven Artifact ID, e.g. commons-lang3"),
  version: z.string().describe("Maven version, e.g. 3.14.0"),
});

export async function listPackages(
  params: z.infer<typeof listPackagesSchema>
): Promise<string> {
  const coord: MavenCoordinate = params;

  // 优先尝试 element-list (Java 11+)，回退到 package-list (Java 8)
  let content = await readEntry(coord, "element-list");
  if (!content) {
    content = await readEntry(coord, "package-list");
  }
  if (!content) {
    return "No package list found in javadoc JAR.";
  }

  const packages = parsePackageList(content);
  if (packages.length === 0) {
    return "No packages found.";
  }

  return `Found ${packages.length} package(s):\n\n${packages.join("\n")}`;
}
