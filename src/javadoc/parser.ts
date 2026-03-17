import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type {
  ClassInfo,
  ClassDoc,
  MemberSummary,
  MemberDoc,
  SearchResult,
} from "../types.js";

// ─── 包列表解析 ───

/** 解析 element-list 或 package-list 文件内容，返回包名数组 */
export function parsePackageList(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("module:"));
}

// ─── 包摘要页解析 ───

/** 从 package-summary.html 提取该包下所有类/接口信息 */
export function parsePackageSummary(html: string): ClassInfo[] {
  const $ = cheerio.load(html);
  const results: ClassInfo[] = [];

  // 现代版 JavaDoc (Java 11+): div.summary-table 或 table.typeSummary
  // 旧版 JavaDoc (Java 8): table.typeSummary
  const kindMap: Record<string, ClassInfo["kind"]> = {
    interface: "interface",
    class: "class",
    enum: "enum",
    annotation: "annotation",
    exception: "exception",
    record: "record",
    "annotation type": "annotation",
    "annotation interface": "annotation",
  };

  // 尝试现代版格式 (Java 11+): 每个分类有 caption + div.summary-table
  $("div.summary-table, table.typeSummary, table.overviewSummary").each(
    (_i, table) => {
      const $table = $(table);
      // 推断 kind: 从前面的 caption/标题
      let kind: ClassInfo["kind"] = "class";
      const caption =
        $table.find("div.table-header, caption, .caption").first().text().trim().toLowerCase();
      for (const [key, value] of Object.entries(kindMap)) {
        if (caption.includes(key)) {
          kind = value;
          break;
        }
      }

      // 现代版: div.col-first + div.col-last/col-second
      $table.find("div.col-first").each((_j, cell) => {
        const nameEl = $(cell).find("a").first();
        const name = nameEl.text().trim();
        if (!name) return;
        const descCell = $(cell).nextAll("div.col-last, div.col-second").first();
        const description = descCell.text().trim();
        results.push({ name, kind, description });
      });

      // 旧版: tr > th/td.colFirst + td.colLast
      $table.find("tr").each((_j, row) => {
        const nameEl = $(row)
          .find("th.colFirst a, td.colFirst a, td.col-first a")
          .first();
        const name = nameEl.text().trim();
        if (!name) return;
        // 避免与现代版重复
        if (results.some((r) => r.name === name)) return;
        const description = $(row)
          .find("td.colLast, td.col-last")
          .last()
          .text()
          .trim();
        results.push({ name, kind, description });
      });
    }
  );

  return results;
}

// ─── 类页面解析 ───

/** 从类 HTML 页面提取类文档概览 */
export function parseClassPage(html: string): ClassDoc {
  const $ = cheerio.load(html);
  const classContainer = findClassDescriptionContainer($);

  // 签名
  const signatureEl = $("div.type-signature, pre.typeSignature, div.description pre").first();
  const signature = signatureEl.text().trim() || "";

  // 推断 kind
  let kind = "class";
  const sigLower = signature.toLowerCase();
  if (sigLower.includes("interface")) kind = "interface";
  else if (sigLower.includes("@interface")) kind = "annotation";
  else if (sigLower.includes("enum")) kind = "enum";
  else if (sigLower.includes("record")) kind = "record";

  // 描述: 类级别的 javadoc 文本
  const description = extractClassDescription($, classContainer);
  const classNotes = extractDocNotes($, classContainer);

  // 继承链
  const superClass = $("span.extends-implements, ul.inheritance")
    .last()
    .text()
    .trim()
    .replace(/^extends\s+/, "") || undefined;

  // 实现接口
  const interfaces: string[] = [];
  $("dt:contains('All Implemented Interfaces'), dt:contains('All Superinterfaces')")
    .next("dd")
    .find("a")
    .each((_i, el) => {
      interfaces.push($(el).text().trim());
    });

  // 提取摘要表
  const nestedClasses = parseSummaryTable($, "nested-class-summary", "Nested Class");
  const fields = parseSummaryTable($, "field-summary", "Field");
  const constructors = parseSummaryTable($, "constructor-summary", "Constructor");
  const methods = parseSummaryTable($, "method-summary", "Method");
  const enumConstants = parseSummaryTable($, "enum-constant-summary", "Enum Constant");

  return {
    signature,
    kind,
    description,
    authors: classNotes.authors,
    since: classNotes.since,
    deprecated: classNotes.deprecated,
    seeAlso: classNotes.seeAlso,
    superClass,
    interfaces: interfaces.length > 0 ? interfaces : undefined,
    nestedClasses: nestedClasses.length > 0 ? nestedClasses : undefined,
    fields: fields.length > 0 ? fields : undefined,
    constructors: constructors.length > 0 ? constructors : undefined,
    methods: methods.length > 0 ? methods : undefined,
    enumConstants: enumConstants.length > 0 ? enumConstants : undefined,
  };
}

function findClassDescriptionContainer(
  $: cheerio.CheerioAPI
): cheerio.Cheerio<AnyNode> {
  const candidates = [
    "section.class-description",
    "div.class-description",
    "div.contentContainer > div.description",
    "div.description",
    "div.contentContainer > ul.blockList > li.blockList",
  ];

  for (const selector of candidates) {
    const container = $(selector).first();
    if (container.length > 0) {
      return container;
    }
  }

  return $.root();
}

function extractClassDescription(
  $: cheerio.CheerioAPI,
  container: cheerio.Cheerio<AnyNode>
): string {
  const containerText = container.find("div.block").first().text().trim();
  if (containerText) {
    return containerText;
  }

  const candidates = [
    "section.class-description > div.block",
    "div.class-description > div.block",
    "div.description > div.block",
    "div.contentContainer > div.description > div.block",
    "div.contentContainer div.description > ul.blockList > li.blockList > div.block",
    "div.contentContainer > ul.blockList > li.blockList > div.block",
  ];

  for (const selector of candidates) {
    const text = $(selector).first().text().trim();
    if (text) {
      return text;
    }
  }

  return "";
}

type DocNotes = {
  authors?: string[];
  since?: string;
  deprecated?: string;
  seeAlso?: string[];
};

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeNoteLabel(text: string): string {
  return normalizeWhitespace(text).replace(/:$/, "").toLowerCase();
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values.map((value) => normalizeWhitespace(value)).filter(Boolean))];
}

function collectNoteValues(
  $: cheerio.CheerioAPI,
  dt: cheerio.Cheerio<AnyNode>,
  extractor?: (dd: cheerio.Cheerio<AnyNode>) => string[]
): string[] {
  const values: string[] = [];
  let node = dt.next();

  while (node.length > 0) {
    const tagName = node.prop("tagName")?.toLowerCase();
    if (tagName === "dt") {
      break;
    }
    if (tagName === "dd") {
      const extracted = extractor
        ? extractor(node)
        : [normalizeWhitespace(node.text())];
      values.push(...extracted);
    }
    node = node.next();
  }

  return uniqueValues(values);
}

function extractSeeAlsoValues(
  $: cheerio.CheerioAPI,
  dd: cheerio.Cheerio<AnyNode>
): string[] {
  const values = [
    ...dd.find("a").map((_i, el) => normalizeWhitespace($(el).text())).get(),
    ...dd
      .find("code")
      .filter((_i, el) => $(el).parents("a").length === 0)
      .map((_i, el) => normalizeWhitespace($(el).text()))
      .get(),
  ];

  if (values.length > 0) {
    return uniqueValues(values);
  }

  return uniqueValues([dd.text()]);
}

function extractDeprecatedText(
  $: cheerio.CheerioAPI,
  container: cheerio.Cheerio<AnyNode>
): string | undefined {
  const deprecationBlock = container.find("div.deprecation-block").first();
  if (deprecationBlock.length > 0) {
    const label = normalizeWhitespace(
      deprecationBlock
        .find(".deprecated-label, .deprecatedLabel, span.deprecatedLabel")
        .first()
        .text()
    );
    const comment = normalizeWhitespace(
      deprecationBlock.find(".deprecation-comment").first().text()
    );
    const text = [label, comment].filter(Boolean).join(" ").trim();
    if (text) {
      return text;
    }
  }

  const deprecatedValues = container
    .find("dl.notes dt, dl dt")
    .toArray()
    .filter((dt) => normalizeNoteLabel($(dt).text()) === "deprecated")
    .flatMap((dt) => collectNoteValues($, $(dt)));
  if (deprecatedValues.length > 0) {
    return deprecatedValues.join(" ");
  }

  const deprecatedLabel = container.find("span.deprecatedLabel").first();
  if (deprecatedLabel.length > 0) {
    return normalizeWhitespace(deprecatedLabel.parent().text()) || "Deprecated";
  }

  return undefined;
}

function extractDocNotes(
  $: cheerio.CheerioAPI,
  container: cheerio.Cheerio<AnyNode>
): DocNotes {
  let since: string | undefined;
  const authors: string[] = [];
  const seeAlso: string[] = [];

  container.find("dl.notes dt, dl dt").each((_i, dt) => {
    const label = normalizeNoteLabel($(dt).text());
    if (!label) {
      return;
    }

    if (label === "since" && !since) {
      since = collectNoteValues($, $(dt)).join(" ") || undefined;
      return;
    }

    if (label === "author" || label === "authors") {
      authors.push(...collectNoteValues($, $(dt)));
      return;
    }

    if (label === "see also") {
      seeAlso.push(...collectNoteValues($, $(dt), (dd) => extractSeeAlsoValues($, dd)));
    }
  });

  const deprecated = extractDeprecatedText($, container);

  return {
    authors: authors.length > 0 ? uniqueValues(authors) : undefined,
    since,
    deprecated,
    seeAlso: seeAlso.length > 0 ? uniqueValues(seeAlso) : undefined,
  };
}

function parseSummaryTable(
  $: cheerio.CheerioAPI,
  sectionId: string,
  captionKeyword: string
): MemberSummary[] {
  const results: MemberSummary[] = [];

  // 尝试通过 section id 定位 (现代版)
  let section: cheerio.Cheerio<AnyNode> = $(`section#${sectionId}, a[id="${sectionId}"], a[name="${sectionId}"]`).first();
  if (section.length === 0) {
    // 尝试通过 caption 文本定位 (旧版)
    section = $(`caption:contains("${captionKeyword}")`).closest("table");
  }
  if (section.length === 0) return results;

  // 现代版: div.summary-table 内 div.col-second/div.col-first + div.col-last
  section.find("div.summary-table div.col-second, div.summary-table div.col-first").each((_i, cell) => {
    const $cell = $(cell);
    // col-second 存在时优先用它（方法名列），否则用 col-first
    if ($cell.hasClass("col-first") && section.find("div.col-second").length > 0) return;

    const codeEl = $cell.find("code").first();
    const name = codeEl.find("a").first().text().trim() || codeEl.text().trim();
    if (!name) return;
    const sig = codeEl.text().trim();
    const descCell = $cell.nextAll("div.col-last").first();
    const description = descCell.text().trim();
    results.push({ name, signature: sig, description });
  });

  // 旧版: table tr
  section.find("table tr, tr").each((_i, row) => {
    const cols = $(row).find("td");
    if (cols.length < 2) return;
    const nameCol = cols.length >= 3 ? $(cols[1]) : $(cols[0]);
    const descCol = $(cols[cols.length - 1]);
    const codeEl = nameCol.find("code").first();
    const name = codeEl.find("a").first().text().trim() || codeEl.text().trim();
    if (!name || results.some((r) => r.name === name)) return;
    const sig = codeEl.text().trim();
    const description = descCol.text().trim();
    results.push({ name, signature: sig, description });
  });

  return results;
}

// ─── 成员详细文档解析 ───

/** 从类 HTML 中提取指定名称的成员详细文档 */
export function parseMemberDetail(
  html: string,
  memberName: string
): MemberDoc[] {
  const $ = cheerio.load(html);
  const results: MemberDoc[] = [];

  // 查找匹配的锚点/section（现代版和旧版兼容）
  const anchors = $(
    `a[id="${memberName}"], a[name="${memberName}"], ` +
    `section.detail[id="${memberName}"], ` +
    `a[id^="${memberName}-"], a[name^="${memberName}-"], ` +
    `a[id^="${memberName}("], a[name^="${memberName}("]`
  );

  if (anchors.length === 0) {
    // 回退: 遍历所有 detail section 搜索
    $("section.detail, li.blockList").each((_i, section) => {
      const heading = $(section).find("h3, h4").first().text().trim();
      if (heading === memberName) {
        const doc = extractMemberDoc($, $(section), memberName);
        if (doc) results.push(doc);
      }
    });
    return results;
  }

  anchors.each((_i, anchor) => {
    const $anchor = $(anchor);
    // 现代版: anchor 在 section.detail 内
    let container = $anchor.closest("section.detail");
    if (container.length === 0) {
      // 旧版: anchor 后面紧跟 ul > li.blockList
      container = $anchor.nextAll("ul").first().find("li.blockList").first();
    }
    if (container.length === 0) {
      // 再回退: 取 anchor 到下一个同级锚点之间的内容
      container = $anchor.parent();
    }
    const doc = extractMemberDoc($, container, memberName);
    if (doc) results.push(doc);
  });

  return results;
}

function extractMemberDoc(
  $: cheerio.CheerioAPI,
  container: cheerio.Cheerio<AnyNode>,
  memberName: string
): MemberDoc | null {
  const notes = extractDocNotes($, container);
  // 签名
  const sigEl = container.find("div.member-signature, pre").first();
  const signature = sigEl.text().trim() || memberName;

  // 描述
  const descBlock = container.find("div.block, div.description div.block").first();
  const description = descBlock.text().trim() || "";

  // 参数
  const parameters: MemberDoc["parameters"] = [];
  container.find("dl.notes dt:contains('Parameters'), dl dt:contains('Parameters')").each((_i, dt) => {
    let dd = $(dt).next("dd");
    while (dd.length > 0 && dd.prop("tagName")?.toLowerCase() === "dd") {
      const text = dd.text().trim();
      const dashIdx = text.indexOf(" - ");
      if (dashIdx > 0) {
        parameters.push({
          name: text.substring(0, dashIdx).trim(),
          description: text.substring(dashIdx + 3).trim(),
        });
      } else {
        parameters.push({ name: text, description: "" });
      }
      const next = dd.next();
      if (next.prop("tagName")?.toLowerCase() === "dd") {
        dd = next;
      } else {
        break;
      }
    }
  });

  // 返回值
  let returns: string | undefined;
  const returnsDt = container.find("dl.notes dt:contains('Returns'), dl dt:contains('Returns')").first();
  if (returnsDt.length > 0) {
    returns = returnsDt.next("dd").text().trim() || undefined;
  }

  // 异常
  const throws: MemberDoc["throws"] = [];
  container.find("dl.notes dt:contains('Throws'), dl dt:contains('Throws')").each((_i, dt) => {
    let dd = $(dt).next("dd");
    while (dd.length > 0 && dd.prop("tagName")?.toLowerCase() === "dd") {
      const typeEl = dd.find("code, a").first();
      const type = typeEl.text().trim();
      const desc = dd.text().trim().replace(type, "").replace(/^\s*-\s*/, "").trim();
      if (type) throws.push({ type, description: desc });
      const next = dd.next();
      if (next.prop("tagName")?.toLowerCase() === "dd") {
        dd = next;
      } else {
        break;
      }
    }
  });

  return {
    name: memberName,
    signature,
    description,
    parameters: parameters.length > 0 ? parameters : undefined,
    returns,
    throws: throws.length > 0 ? throws : undefined,
    since: notes.since,
    deprecated: notes.deprecated,
    seeAlso: notes.seeAlso,
  };
}

// ─── 搜索索引解析 ───

/** 解析 *-search-index.js 文件内容 */
export function parseSearchIndex(
  content: string,
  category: SearchResult["category"]
): SearchResult[] {
  // 格式: xxxSearchIndex = [{...}, ...];
  const match = content.match(/=\s*(\[[\s\S]*\])\s*;?\s*$/);
  if (!match) return [];

  let items: Array<Record<string, string>>;
  try {
    items = JSON.parse(match[1]);
  } catch {
    return [];
  }

  return items.map((item) => {
    const label = item.l || item.c || "";
    let url = item.u || item.url || "";
    const description = item.d || "";

    // 对于 member 类型，item.p 是类名，item.c 是类名
    if (category === "member" && item.p) {
      url = item.p.replace(/\./g, "/") + ".html#" + (item.u || label);
    } else if (category === "type" && item.p) {
      url = item.p.replace(/\./g, "/") + "/" + label + ".html";
    } else if (category === "package") {
      url = label.replace(/\./g, "/") + "/package-summary.html";
    }

    return { category, label, url, description };
  });
}
