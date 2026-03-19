# javadoc-mcp

一个 MCP (Model Context Protocol) 服务器，让 AI 助手能够通过 Maven 坐标浏览 JavaDoc 文档。

## 功能

提供 5 个 MCP tools，支持逐层浏览 JavaDoc：

| Tool | 说明 |
|------|------|
| `list_packages` | 列出库中所有包 |
| `list_classes` | 列出包中的类、接口、枚举、注解、异常、record |
| `get_class` | 获取类概览文档（签名、描述、成员摘要） |
| `get_member` | 获取方法/字段的完整文档（参数、返回值、异常等） |
| `search` | 按关键词搜索类型、成员或包；`category` 可省略，`type/member` 结果会显示完整类名并支持完整限定名查询 |

## 运行要求

- Node.js 18+
- Maven (`mvn` 需要在 `PATH` 中可用)

服务会优先读取本地 Maven 仓库中的 JavaDoc JAR；如果缺失，则通过 `mvn dependency:get` 拉取对应的 `-javadoc.jar`。

## 安装

### 方式一：直接通过 npx 使用

```bash
npx -y javadoc-mcp
```

### 方式二：全局安装

```bash
npm install -g javadoc-mcp
```

安装完成后，可直接运行：

```bash
javadoc-mcp
```

## 配置 MCP 客户端

### Claude Code

推荐直接通过 `npx` 启动，这样不需要手动管理安装路径：

编辑 `~/.claude/settings.json`：

```json
{
  "mcpServers": {
    "javadoc": {
      "command": "npx",
      "args": ["-y", "javadoc-mcp"]
    }
  }
}
```

如果你已经全局安装，也可以写成：

```json
{
  "mcpServers": {
    "javadoc": {
      "command": "javadoc-mcp",
      "args": []
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
      "command": "npx",
      "args": ["-y", "javadoc-mcp"]
    }
  }
}
```

## 从源码开发

```bash
npm install
npm run build
npm test
```

构建产物输出到 `dist/` 目录。

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
   → 查看包中的类型列表

3. get_class(..., className="org.apache.commons.lang3.StringUtils")
   → 查看 StringUtils 类的概览和方法摘要

4. get_member(..., className="org.apache.commons.lang3.StringUtils", memberName="join")
   → 查看 join 方法的完整文档

5. search(..., query="String", category="type")
   → 搜索名称或完整类名含 "String" 的类型

6. search(..., query="org.apache.commons.lang3.StringUtils.join")
   → 在未指定 `category` 时跨类型/成员/包搜索，按完整成员引用查找成员
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

## 仓库与反馈

- GitHub: https://github.com/loong95/javadoc-mcp
- Issues: https://github.com/loong95/javadoc-mcp/issues
