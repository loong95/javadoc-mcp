import { z } from "zod";
import { readEntry } from "../javadoc/jar-reader.js";
import { parseClassPage } from "../javadoc/parser.js";
import type { MavenCoordinate } from "../types.js";

export const getClassSchema = z.object({
  groupId: z.string().describe("Maven Group ID"),
  artifactId: z.string().describe("Maven Artifact ID"),
  version: z.string().describe("Maven version"),
  className: z.string().describe("Fully qualified class name, e.g. org.apache.commons.lang3.StringUtils"),
});

export async function getClass(
  params: z.infer<typeof getClassSchema>
): Promise<string> {
  const coord: MavenCoordinate = params;
  const classPath = params.className.replace(/\./g, "/");
  const entryPath = `${classPath}.html`;

  const html = await readEntry(coord, entryPath);
  if (!html) {
    return `Class not found: ${params.className}. Check the class name or use list_classes to see available types.`;
  }

  const doc = parseClassPage(html);

  const lines: string[] = [];
  lines.push(`# ${params.className}\n`);

  if (doc.signature) {
    lines.push("```java");
    lines.push(doc.signature);
    lines.push("```\n");
  }

  if (doc.superClass) {
    lines.push(`**Extends**: ${doc.superClass}\n`);
  }
  if (doc.interfaces && doc.interfaces.length > 0) {
    lines.push(`**Implements**: ${doc.interfaces.join(", ")}\n`);
  }

  if (doc.description) {
    lines.push(`## Description\n\n${doc.description}\n`);
  }

  const sections: [string, typeof doc.methods][] = [
    ["Nested Classes", doc.nestedClasses],
    ["Enum Constants", doc.enumConstants],
    ["Fields", doc.fields],
    ["Constructors", doc.constructors],
    ["Methods", doc.methods],
  ];

  for (const [title, members] of sections) {
    if (!members || members.length === 0) continue;
    lines.push(`## ${title}\n`);
    for (const m of members) {
      const sig = m.signature ? ` — \`${m.signature}\`` : "";
      const desc = m.description ? ` — ${m.description}` : "";
      lines.push(`- **${m.name}**${sig}${desc}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
