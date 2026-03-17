import { z } from "zod";
import { readEntry } from "../javadoc/jar-reader.js";
import { parseClassPage } from "../javadoc/parser.js";
import { parseClassSourceDoc } from "../javadoc/source-parser.js";
import { readSourceEntry } from "../javadoc/source-reader.js";
import type { ClassDoc, MavenCoordinate } from "../types.js";

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
  const sourceMetadata = needsSourceFallback(doc)
    ? await loadSourceMetadata(coord, params.className, classPath)
    : {};

  return renderClassDocumentation(
    params.className,
    mergeClassDocMetadata(doc, sourceMetadata)
  );
}

function needsSourceFallback(doc: ClassDoc): boolean {
  return (
    !doc.authors ||
    doc.authors.length === 0 ||
    !doc.since ||
    !doc.deprecated ||
    !doc.seeAlso ||
    doc.seeAlso.length === 0
  );
}

async function loadSourceMetadata(
  coord: MavenCoordinate,
  className: string,
  classPath: string
): Promise<Partial<ClassDoc>> {
  try {
    const source = await readSourceEntry(coord, `${classPath}.java`);
    if (!source) {
      return {};
    }
    return parseClassSourceDoc(source, className);
  } catch {
    return {};
  }
}

export function mergeClassDocMetadata(
  doc: ClassDoc,
  fallback: Partial<ClassDoc>
): ClassDoc {
  return {
    ...doc,
    authors: fallback.authors ?? doc.authors,
    since: doc.since ?? fallback.since,
    deprecated: fallback.deprecated ?? doc.deprecated,
    seeAlso: doc.seeAlso ?? fallback.seeAlso,
  };
}

export function renderClassDocumentation(
  className: string,
  doc: ClassDoc
): string {
  const lines: string[] = [];
  lines.push(`# ${className}\n`);

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

  if (doc.deprecated) {
    lines.push(`> **Deprecated**: ${doc.deprecated}\n`);
  }

  if (doc.description) {
    lines.push(`## Description\n\n${doc.description}\n`);
  }

  if (doc.authors && doc.authors.length > 0) {
    lines.push(
      `**${doc.authors.length > 1 ? "Authors" : "Author"}**: ${doc.authors.join(", ")}\n`
    );
  }
  if (doc.since) {
    lines.push(`**Since**: ${doc.since}\n`);
  }
  if (doc.seeAlso && doc.seeAlso.length > 0) {
    lines.push(`**See Also**: ${doc.seeAlso.join(", ")}\n`);
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
