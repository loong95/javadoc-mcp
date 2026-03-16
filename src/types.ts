/** Maven 坐标 */
export interface MavenCoordinate {
  groupId: string;
  artifactId: string;
  version: string;
}

/** 包信息 */
export interface PackageInfo {
  name: string;
}

/** 类信息 */
export interface ClassInfo {
  name: string;
  kind: "interface" | "class" | "enum" | "annotation" | "exception" | "record";
  description: string;
}

/** 类文档概览 */
export interface ClassDoc {
  signature: string;
  kind: string;
  description: string;
  typeParameters?: string;
  superClass?: string;
  interfaces?: string[];
  nestedClasses?: MemberSummary[];
  fields?: MemberSummary[];
  constructors?: MemberSummary[];
  methods?: MemberSummary[];
  enumConstants?: MemberSummary[];
}

/** 成员摘要 */
export interface MemberSummary {
  name: string;
  signature?: string;
  description: string;
}

/** 成员详细文档 */
export interface MemberDoc {
  name: string;
  signature: string;
  description: string;
  parameters?: { name: string; description: string }[];
  returns?: string;
  throws?: { type: string; description: string }[];
  since?: string;
  deprecated?: string;
  seeAlso?: string[];
}

/** 搜索结果 */
export interface SearchResult {
  category: "type" | "member" | "package";
  label: string;
  url: string;
  description?: string;
}
