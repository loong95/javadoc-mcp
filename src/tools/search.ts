import { z } from "zod";
import { readEntry } from "../javadoc/jar-reader.js";
import { parseSearchIndex } from "../javadoc/parser.js";
import type { MavenCoordinate, SearchResult } from "../types.js";

export const searchSchema = z.object({
  groupId: z.string().describe("Maven Group ID"),
  artifactId: z.string().describe("Maven Artifact ID"),
  version: z.string().describe("Maven version"),
  query: z.string().describe("Search query string"),
  category: z
    .enum(["type", "member", "package"])
    .optional()
    .describe("Filter by category: type, member, or package"),
});

const SEARCH_INDEX_FILES: { file: string; category: SearchResult["category"] }[] = [
  { file: "type-search-index.js", category: "type" },
  { file: "member-search-index.js", category: "member" },
  { file: "package-search-index.js", category: "package" },
];

const MAX_RESULTS = 30;

export async function search(
  params: z.infer<typeof searchSchema>
): Promise<string> {
  const coord: MavenCoordinate = params;
  const queryLower = params.query.toLowerCase();

  const allResults: SearchResult[] = [];

  for (const { file, category } of SEARCH_INDEX_FILES) {
    if (params.category && params.category !== category) continue;

    const content = await readEntry(coord, file);
    if (!content) continue;

    const items = parseSearchIndex(content, category);
    for (const item of items) {
      if (item.label.toLowerCase().includes(queryLower)) {
        allResults.push(item);
      }
    }
  }

  if (allResults.length === 0) {
    return `No results found for '${params.query}'.`;
  }

  const limited = allResults.slice(0, MAX_RESULTS);
  const lines: string[] = [
    `Found ${allResults.length} result(s)${allResults.length > MAX_RESULTS ? ` (showing first ${MAX_RESULTS})` : ""}:\n`,
  ];

  for (const r of limited) {
    lines.push(`- [${r.category}] **${r.label}**${r.description ? ` — ${r.description}` : ""}`);
  }

  return lines.join("\n");
}
