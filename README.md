# javadoc-mcp

一个 MCP (Model Context Protocol) 服务器，让 AI 助手能够通过 Maven 坐标浏览 JavaDoc 文档。


## 功能

提供 5 个 MCP tools，支持逐层浏览 JavaDoc：

| Tool | 说明 |
|------|------|
| `list_packages` | 列出库中所有包 |
| `list_classes` | 列出包中所有类、接口、枚举、注解 |
| `get_class` | 获取类概览文档（签名、描述、成员摘要） |
| `get_member` | 获取方法/字段的完整文档（参数、返回值、异常等） |
| `search` | 按关键词搜索类型、成员或包 |

## 编译

需要 Node.js 18+。

```bash
npm install
npm run build
```

构建产物输出到 `dist/` 目录。

## 配置

### Claude Code

编辑 `~/.claude/settings.json`：

```json
{
  "mcpServers": {
    "javadoc": {
      "command": "node",
      "args": ["/path/to/javadoc-mcp/dist/index.js"]
    }
  }
}
```

### Claude Desktop

编辑 `claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "javadoc": {
      "command": "node",
      "args": ["/path/to/javadoc-mcp/dist/index.js"]
    }
  }
}
```

### 调试

使用 MCP Inspector 进行交互式测试：

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## 使用示例

典型的浏览流程：

```
1. list_packages(groupId="org.apache.commons", artifactId="commons-lang3", version="3.14.0")
   → 获取所有包名

2. list_classes(..., packageName="org.apache.commons.lang3")
   → 查看包中的类列表

3. get_class(..., className="org.apache.commons.lang3.StringUtils")
   → 查看 StringUtils 类的概览和方法摘要

4. get_member(..., className="org.apache.commons.lang3.StringUtils", memberName="join")
   → 查看 join 方法的完整文档

5. search(..., query="String", category="type")
   → 搜索名称含 "String" 的类型
```

## 本地仓库

JavaDoc JAR 直接使用 Maven 本地仓库中的文件，默认路径为 `~/.m2/repository`。如果 `~/.m2/settings.xml` 中配置了 `<localRepository>`，则使用该路径。

如需重新拉取某个文档，可删除对应坐标下的 `*-javadoc.jar` 后再次调用工具。

## 技术栈

- TypeScript (ES Modules)
- `@modelcontextprotocol/sdk` — MCP 协议实现
- `cheerio` — HTML 解析
- `adm-zip` — 直接从 JAR 读取文件，不解压到磁盘
- `zod` — 参数校验
