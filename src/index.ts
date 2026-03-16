#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { listPackagesSchema, listPackages } from "./tools/list-packages.js";
import { listClassesSchema, listClasses } from "./tools/list-classes.js";
import { getClassSchema, getClass } from "./tools/get-class.js";
import { getMemberSchema, getMember } from "./tools/get-member.js";
import { searchSchema, search } from "./tools/search.js";

const server = new McpServer({
  name: "javadoc-mcp",
  version: "1.0.0",
});

// 注册 tools
server.tool(
  "list_packages",
  "List all packages in a Java library's JavaDoc. Automatically resolves the JavaDoc JAR through Maven and reads it directly from the local Maven repository.",
  listPackagesSchema.shape,
  async (params) => ({
    content: [{ type: "text", text: await listPackages(params) }],
  })
);

server.tool(
  "list_classes",
  "List all classes, interfaces, enums, and annotations in a Java package.",
  listClassesSchema.shape,
  async (params) => ({
    content: [{ type: "text", text: await listClasses(params) }],
  })
);

server.tool(
  "get_class",
  "Get the overview documentation for a Java class, including its signature, description, and member summaries.",
  getClassSchema.shape,
  async (params) => ({
    content: [{ type: "text", text: await getClass(params) }],
  })
);

server.tool(
  "get_member",
  "Get detailed documentation for a specific method or field of a Java class, including parameters, return type, and exceptions.",
  getMemberSchema.shape,
  async (params) => ({
    content: [{ type: "text", text: await getMember(params) }],
  })
);

server.tool(
  "search",
  "Search JavaDoc for types, members, or packages matching a query string.",
  searchSchema.shape,
  async (params) => ({
    content: [{ type: "text", text: await search(params) }],
  })
);

// 启动
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
