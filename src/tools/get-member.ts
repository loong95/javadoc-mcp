import { z } from "zod";
import { readEntry } from "../javadoc/jar-reader.js";
import { parseMemberDetail } from "../javadoc/parser.js";
import type { MavenCoordinate } from "../types.js";

export const getMemberSchema = z.object({
  groupId: z.string().describe("Maven Group ID"),
  artifactId: z.string().describe("Maven Artifact ID"),
  version: z.string().describe("Maven version"),
  className: z.string().describe("Fully qualified class name"),
  memberName: z.string().describe("Method or field name, e.g. isEmpty or join"),
});

export async function getMember(
  params: z.infer<typeof getMemberSchema>
): Promise<string> {
  const coord: MavenCoordinate = params;
  const classPath = params.className.replace(/\./g, "/");
  const entryPath = `${classPath}.html`;

  const html = await readEntry(coord, entryPath);
  if (!html) {
    return `Class not found: ${params.className}. Check the class name or use list_classes to see available types.`;
  }

  const docs = parseMemberDetail(html, params.memberName);
  if (docs.length === 0) {
    return `Member '${params.memberName}' not found in ${params.className}. Use get_class to see available members.`;
  }

  const lines: string[] = [];
  for (const doc of docs) {
    lines.push(`## ${doc.name}\n`);

    if (doc.signature) {
      lines.push("```java");
      lines.push(doc.signature);
      lines.push("```\n");
    }

    if (doc.deprecated) {
      lines.push(`> **Deprecated**: ${doc.deprecated}\n`);
    }

    if (doc.description) {
      lines.push(`${doc.description}\n`);
    }

    if (doc.parameters && doc.parameters.length > 0) {
      lines.push("**Parameters**:\n");
      for (const p of doc.parameters) {
        lines.push(`- \`${p.name}\` — ${p.description}`);
      }
      lines.push("");
    }

    if (doc.returns) {
      lines.push(`**Returns**: ${doc.returns}\n`);
    }

    if (doc.throws && doc.throws.length > 0) {
      lines.push("**Throws**:\n");
      for (const t of doc.throws) {
        lines.push(`- \`${t.type}\` — ${t.description}`);
      }
      lines.push("");
    }

    if (doc.since) {
      lines.push(`**Since**: ${doc.since}\n`);
    }

    if (doc.seeAlso && doc.seeAlso.length > 0) {
      lines.push(`**See Also**: ${doc.seeAlso.join(", ")}\n`);
    }

    lines.push("---\n");
  }

  return lines.join("\n");
}
