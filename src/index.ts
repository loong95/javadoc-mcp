#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readPackageManifest } from "./package-manifest.js";
import { toolDefinitions } from "./tool-definitions.js";

const packageJson = readPackageManifest();

const server = new McpServer({
  name: packageJson.name ?? "javadoc-mcp",
  version: packageJson.version ?? "1.0.1",
});

for (const tool of toolDefinitions) {
  server.tool(
    tool.name,
    tool.description,
    tool.schema.shape,
    async (params: unknown) => ({
      content: [
        {
          type: "text" as const,
          text: await tool.handler(params as Record<string, string>),
        },
      ],
    })
  );
}

// 启动
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
