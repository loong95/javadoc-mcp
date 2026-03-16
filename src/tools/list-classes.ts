import { z } from "zod";
import { readEntry } from "../javadoc/jar-reader.js";
import { parsePackageSummary } from "../javadoc/parser.js";
import type { MavenCoordinate } from "../types.js";

export const listClassesSchema = z.object({
  groupId: z.string().describe("Maven Group ID"),
  artifactId: z.string().describe("Maven Artifact ID"),
  version: z.string().describe("Maven version"),
  packageName: z.string().describe("Fully qualified package name, e.g. org.apache.commons.lang3"),
});

export async function listClasses(
  params: z.infer<typeof listClassesSchema>
): Promise<string> {
  const coord: MavenCoordinate = params;
  const packagePath = params.packageName.replace(/\./g, "/");
  const entryPath = `${packagePath}/package-summary.html`;

  const html = await readEntry(coord, entryPath);
  if (!html) {
    return `Package summary not found: ${params.packageName}. Check the package name or use list_packages to see available packages.`;
  }

  const classes = parsePackageSummary(html);
  if (classes.length === 0) {
    return `No classes found in package ${params.packageName}.`;
  }

  // 按 kind 分组
  const grouped = new Map<string, typeof classes>();
  for (const cls of classes) {
    const group = grouped.get(cls.kind) || [];
    group.push(cls);
    grouped.set(cls.kind, group);
  }

  const lines: string[] = [`Package \`${params.packageName}\` — ${classes.length} type(s):\n`];
  const kindTitles: Record<string, string> = {
    class: "Classes",
    interface: "Interfaces",
    enum: "Enums",
    annotation: "Annotations",
    exception: "Exceptions",
    record: "Records",
  };

  for (const [kind, items] of grouped) {
    lines.push(`### ${kindTitles[kind] ?? `${kind.charAt(0).toUpperCase() + kind.slice(1)}s`}`);
    for (const item of items) {
      const desc = item.description ? ` — ${item.description}` : "";
      lines.push(`- \`${item.name}\`${desc}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
