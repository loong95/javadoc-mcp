type ClassSourceDoc = {
  authors?: string[];
  since?: string;
  deprecated?: string;
  seeAlso?: string[];
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeInlineTags(text: string): string {
  return normalizeWhitespace(
    text
      .replace(/\{@(?:link|linkplain)\s+([^}\s]+)(?:\s+([^}]+))?\}/g, (_match, ref, label) =>
        normalizeWhitespace(label ?? ref)
      )
      .replace(/\{@(?:code|literal)\s+([^}]+)\}/g, "$1")
  );
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values.map((value) => normalizeWhitespace(value)).filter(Boolean))];
}

function findClassJavadocComment(
  source: string,
  className: string
): string | null {
  const simpleName = className.split(".").pop() ?? className;
  const declarationPattern = new RegExp(
    String.raw`(?:^|[\s;])(?:public|protected|private|abstract|final|sealed|non-sealed|static|strictfp|\s)*` +
      String.raw`(?:class|interface|enum|record|@interface)\s+${escapeRegex(simpleName)}\b`,
    "m"
  );
  const match = declarationPattern.exec(source);
  if (!match) {
    return null;
  }

  const declarationIndex = match.index;
  const commentStart = source.lastIndexOf("/**", declarationIndex);
  if (commentStart < 0) {
    return null;
  }

  const commentEnd = source.indexOf("*/", commentStart);
  if (commentEnd < 0 || commentEnd > declarationIndex) {
    return null;
  }

  return source.slice(commentStart + 3, commentEnd);
}

export function parseClassSourceDoc(
  source: string,
  className: string
): ClassSourceDoc {
  const comment = findClassJavadocComment(source, className);
  if (!comment) {
    return {};
  }

  const authors: string[] = [];
  const seeAlso: string[] = [];
  let since: string | undefined;
  let deprecated: string | undefined;
  let currentTag: string | undefined;
  let currentLines: string[] = [];

  const flushTag = () => {
    if (!currentTag) {
      return;
    }

    const value = normalizeInlineTags(currentLines.join(" ").trim());
    if (!value) {
      currentTag = undefined;
      currentLines = [];
      return;
    }

    switch (currentTag) {
      case "author":
        authors.push(value);
        break;
      case "since":
        since ??= value;
        break;
      case "see":
        seeAlso.push(value);
        break;
      case "deprecated":
        deprecated ??= value;
        break;
      default:
        break;
    }

    currentTag = undefined;
    currentLines = [];
  };

  for (const rawLine of comment.split(/\r?\n/)) {
    const line = rawLine.replace(/^\s*\*\s?/, "").trim();
    if (!line) {
      if (currentTag) {
        currentLines.push("");
      }
      continue;
    }

    const tagMatch = line.match(/^@(\w+)\s*(.*)$/);
    if (tagMatch) {
      flushTag();
      currentTag = tagMatch[1];
      currentLines = [tagMatch[2]];
      continue;
    }

    if (currentTag) {
      currentLines.push(line);
    }
  }

  flushTag();

  return {
    authors: authors.length > 0 ? uniqueValues(authors) : undefined,
    since,
    deprecated,
    seeAlso: seeAlso.length > 0 ? uniqueValues(seeAlso) : undefined,
  };
}
