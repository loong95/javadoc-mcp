# Repository Guidelines

## Project Structure & Module Organization
Source lives under `src/`. `src/index.ts` boots the MCP server and registers tools. Tool entrypoints are in `src/tools/` (`list-packages.ts`, `get-class.ts`, etc.), while JavaDoc fetching and parsing logic lives in `src/javadoc/`. Shared types are defined in `src/types.ts`. Build output is generated into `dist/`; treat that directory as disposable and do not edit it by hand.

## Build, Test, and Development Commands
Install dependencies with `npm install`.

- `npm run build`: compile TypeScript from `src/` to `dist/` with declarations and source maps.
- `npm start`: run the built MCP server from `dist/index.js`.
- `npm run dev`: run the TypeScript compiler in watch mode during development.
- `npx @modelcontextprotocol/inspector node dist/index.js`: inspect the server interactively after a build.

Use Node.js 18+ as noted in the README.

## Coding Style & Naming Conventions
Follow the existing TypeScript style in `src/`: 2-space indentation, semicolons, ES module imports with explicit `.js` extensions, and `strict` typing. Prefer small, focused modules and named exports. Keep MCP tool files in kebab-case (`get-member.ts`) and exported functions in camelCase (`getMember`). Reuse Zod schemas for tool inputs and keep parsing logic isolated in `src/javadoc/`.

## Testing Guidelines
This checkout does not include an automated test suite yet, and `package.json` currently defines no `test` script. For changes that affect parsing or resolution, add focused tests before expanding functionality, and document manual verification steps in the PR. At minimum, verify `npm run build` succeeds and smoke-test one Maven coordinate through MCP Inspector.

## Commit & Pull Request Guidelines
Local Git history is not available in this workspace, so no repository-specific commit convention can be inferred here. Use short, imperative commit subjects such as `Add fallback for legacy package lists`. Keep commits scoped to one change. PRs should describe the user-visible effect, list verification steps, and note any Maven artifacts or JavaDoc variants used for testing. Include screenshots only when UI tooling output makes review clearer.

## Security & Configuration Tips
The server resolves JavaDoc JARs through `mvn` and reads them directly from the configured local Maven repository. Do not commit cache files or credentials. When debugging configuration, prefer local MCP settings that point to `dist/index.js` rather than editing global paths in source.
