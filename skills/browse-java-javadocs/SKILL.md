---
name: browse-java-javadocs
description: Inspect external Java and JVM library APIs through the javadoc-mcp MCP server using Maven coordinates. Use when Codex needs authoritative JavaDoc instead of guessing, especially for tasks like finding the right package or class, checking method overloads, reading parameter or return documentation, confirming exceptions or deprecations, comparing APIs across versions, or answering questions about libraries such as Spring, Apache Commons, Netty, Guava, Jakarta, or any dependency published with JavaDoc JARs.
---

# Browse Java Javadocs

## Overview

Use `javadoc-mcp` to read published JavaDoc from Maven artifacts without relying on memory. Prefer this skill when the question is about an external dependency API and the answer depends on exact signatures, overloads, deprecations, return values, thrown exceptions, or package/class discovery.

## Workflow

1. Identify `groupId`, `artifactId`, and `version` before calling tools. If the user omits the version, ask for it or clearly state the version you assume.
2. Start broad with `search` when the user only knows a keyword, class fragment, or member name.
3. Use `list_packages` when the library surface is unclear and you need package discovery.
4. Use `list_classes` after you know the package and need the available types.
5. Use `get_class` to inspect the class signature, inheritance, interfaces, description, and member summaries.
6. Use `get_member` for method or field detail after you know the class and member name.
7. Summarize the result in plain language, separating documented facts from your own inference.

## Tool Selection

### `search`

Use first when the target is fuzzy.

- Good for: “find something about retry”, “where is `StringUtils`”, “which member mentions timeout”.
- Use `category="type"` to narrow to classes and interfaces.
- Use `category="member"` when the user asks about a method name but not the declaring type.
- Use `category="package"` when exploring an unfamiliar library layout.

### `list_packages`

Use when you need the package map for an artifact.

- Good for first-pass exploration of a new dependency.
- Useful when `search` returns too many ambiguous hits.
- The server reads `element-list` first and falls back to `package-list`, so it works for both newer and older JavaDoc layouts.

### `list_classes`

Use when the package is known and you need the type list.

- Good for selecting the exact class, interface, enum, annotation, exception, or record.
- Prefer this before `get_class` if the user gives only a package and a vague type description.

### `get_class`

Use for the class-level overview.

- Returns the signature, inheritance/interfaces, description, and member summaries.
- Use this before `get_member` if you need to confirm which overload family or field names exist.
- Use this to orient yourself before explaining how a type is intended to be used.

### `get_member`

Use for authoritative method or field documentation.

- Returns the detailed JavaDoc for every matching member name in the class.
- Expect multiple sections when the method is overloaded.
- Use this for parameter meanings, return semantics, thrown exceptions, `since`, deprecation notes, and related references.

## Reasoning Pattern

Prefer this drill-down order:

1. `search` or `list_packages`
2. `list_classes`
3. `get_class`
4. `get_member`

Do not jump directly to a conclusion from a class or method name alone. Read the JavaDoc first, then explain:

- what is explicitly documented
- what overloads differ by signature or semantics
- what behavior you infer from the documented API shape

## Response Guidelines

- Name the exact artifact coordinates you used.
- Name the exact package, class, and member you inspected.
- Call out overloaded methods explicitly instead of collapsing them into one description.
- Quote signatures or parameter names only as much as needed, then paraphrase.
- If the docs are silent about runtime behavior, say that the JavaDoc does not specify it.
- If you compare versions, run the same lookup flow for each version and describe the delta precisely.

## Failure Handling

- If `list_packages` reports no package list, the artifact may not publish a usable JavaDoc JAR.
- If `get_class` says the class was not found, fall back to `search` or `list_classes` instead of guessing the fully qualified name.
- If `get_member` says the member was not found, inspect `get_class` first because the method may have a different name or live in another type.
- If the user asks about project-local code rather than a published dependency, prefer source inspection over this skill.

## Examples

- “Explain `org.springframework:spring-web:6.1.8` `WebClient` request building API.”
- “Find the JavaDoc for `StringUtils.join` in `org.apache.commons:commons-lang3:3.14.0`.”
- “Compare `com.google.guava:guava` `Splitter` docs between two versions.”
- “Which package contains retry-related classes in this Maven artifact?”
