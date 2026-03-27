import { z } from "zod";
import { listPackagesSchema, listPackages } from "./tools/list-packages.js";
import { listClassesSchema, listClasses } from "./tools/list-classes.js";
import { getClassSchema, getClass } from "./tools/get-class.js";
import { getMemberSchema, getMember } from "./tools/get-member.js";
import { searchSchema, search } from "./tools/search.js";

type ToolOption = {
  flag: string;
  key: string;
  description: string;
  required?: boolean;
};

export type ToolDefinition = {
  name: string;
  cliName: string;
  description: string;
  schema: z.ZodObject<z.ZodRawShape>;
  handler: (params: Record<string, string>) => Promise<string>;
  options: readonly ToolOption[];
};

export const toolDefinitions = [
  {
    name: "list_packages",
    cliName: "list-packages",
    description:
      "List all packages in a Java library's JavaDoc. Automatically resolves the JavaDoc JAR through Maven and reads it directly from the local Maven repository.",
    schema: listPackagesSchema,
    handler: listPackages as ToolDefinition["handler"],
    options: [
      {
        flag: "group-id",
        key: "groupId",
        description: "Maven Group ID, e.g. org.apache.commons",
        required: true,
      },
      {
        flag: "artifact-id",
        key: "artifactId",
        description: "Maven Artifact ID, e.g. commons-lang3",
        required: true,
      },
      {
        flag: "version",
        key: "version",
        description: "Maven version, e.g. 3.14.0",
        required: true,
      },
    ],
  },
  {
    name: "list_classes",
    cliName: "list-classes",
    description:
      "List all classes, interfaces, enums, and annotations in a Java package.",
    schema: listClassesSchema,
    handler: listClasses as ToolDefinition["handler"],
    options: [
      {
        flag: "group-id",
        key: "groupId",
        description: "Maven Group ID",
        required: true,
      },
      {
        flag: "artifact-id",
        key: "artifactId",
        description: "Maven Artifact ID",
        required: true,
      },
      {
        flag: "version",
        key: "version",
        description: "Maven version",
        required: true,
      },
      {
        flag: "package-name",
        key: "packageName",
        description:
          "Fully qualified package name, e.g. org.apache.commons.lang3",
        required: true,
      },
    ],
  },
  {
    name: "get_class",
    cliName: "get-class",
    description:
      "Get the overview documentation for a Java class, including its signature, description, and member summaries.",
    schema: getClassSchema,
    handler: getClass as ToolDefinition["handler"],
    options: [
      {
        flag: "group-id",
        key: "groupId",
        description: "Maven Group ID",
        required: true,
      },
      {
        flag: "artifact-id",
        key: "artifactId",
        description: "Maven Artifact ID",
        required: true,
      },
      {
        flag: "version",
        key: "version",
        description: "Maven version",
        required: true,
      },
      {
        flag: "class-name",
        key: "className",
        description:
          "Fully qualified class name, e.g. org.apache.commons.lang3.StringUtils",
        required: true,
      },
    ],
  },
  {
    name: "get_member",
    cliName: "get-member",
    description:
      "Get detailed documentation for a specific method or field of a Java class, including parameters, return type, and exceptions.",
    schema: getMemberSchema,
    handler: getMember as ToolDefinition["handler"],
    options: [
      {
        flag: "group-id",
        key: "groupId",
        description: "Maven Group ID",
        required: true,
      },
      {
        flag: "artifact-id",
        key: "artifactId",
        description: "Maven Artifact ID",
        required: true,
      },
      {
        flag: "version",
        key: "version",
        description: "Maven version",
        required: true,
      },
      {
        flag: "class-name",
        key: "className",
        description: "Fully qualified class name",
        required: true,
      },
      {
        flag: "member-name",
        key: "memberName",
        description: "Method or field name, e.g. isEmpty or join",
        required: true,
      },
    ],
  },
  {
    name: "search",
    cliName: "search",
    description:
      "Search JavaDoc for types, members, or packages matching a query string.",
    schema: searchSchema,
    handler: search as ToolDefinition["handler"],
    options: [
      {
        flag: "group-id",
        key: "groupId",
        description: "Maven Group ID",
        required: true,
      },
      {
        flag: "artifact-id",
        key: "artifactId",
        description: "Maven Artifact ID",
        required: true,
      },
      {
        flag: "version",
        key: "version",
        description: "Maven version",
        required: true,
      },
      {
        flag: "query",
        key: "query",
        description: "Search query string",
        required: true,
      },
      {
        flag: "category",
        key: "category",
        description: "Optional filter: type, member, or package",
      },
    ],
  },
] as const satisfies readonly ToolDefinition[];

export const toolDefinitionsByCliName = new Map<string, ToolDefinition>(
  toolDefinitions.map((definition) => [definition.cliName, definition])
);
