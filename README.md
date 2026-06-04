# Claude-Toolkit

> 上下文工程是设计原则，Agent Harness 是构建目标，本项目的目标，是为开发者提供一个以大模型为核心、能够调用工具、接收反馈并持续完成任务的系统。


## 快速开始

在几分钟内完成 Claude-Toolkit 的基础安装：

### 第一步：添加市场并安装插件

```bash
/plugin marketplace add https://github.com/baoanaz/Claude-Toolkit
/plugin install claude-toolkit@claude-toolkit
```

### 第二步：验证安装

```bash
/plugin list claude-toolkit@claude-toolkit
```

安装完成后，Claude Code 就可以加载这个仓库提供的 `commands/` 与 `skills/` 能力。

### Codex 安装

如果你使用 Codex，可以把本仓库作为 repo-scoped marketplace 添加：

```bash
# 添加 GitHub 仓库市场
codex plugin marketplace add https://github.com/baoanaz/Claude-Toolkit
codex plugin add claude-toolkit@claude-toolkit

```

然后在 Codex 的插件列表中安装或启用 `claude-toolkit`。

Codex 入口由 `.codex-plugin/plugin.json` 提供，当前会加载 `skills/` 目录。Claude Code 专用的
`commands/`、`hooks/`、`agents/` 与 `rules/` 保留在仓库中，但不会通过 Codex manifest 自动注册。

### 第三步：按需安装 rules

插件安装不会自动分发 `rules/` 目录中的规则文件。如果你希望同时使用规则约束，请继续看下面的"安装 rules"章节。

## 安装 rules

> 重要：请直接复制整个目录，不要把目录里的文件展开后混拷到同一层。
> `common/` 与语言目录里有同名文件，展开复制会破坏相对引用关系。

如果你是从 GitHub 页面直接查看本说明，请先克隆仓库：

```bash
git clone https://github.com/baoanaz/Claude-Toolkit.git
cd Claude-Toolkit
```

然后安装 rules：

```bash
mkdir -p ~/.claude/rules

# 通用规则：建议始终安装
cp -r rules/common ~/.claude/rules/common

# 中文翻译：按需安装
cp -r rules/zh ~/.claude/rules/zh

# 按项目技术栈安装语言规则
cp -r rules/cpp ~/.claude/rules/cpp
cp -r rules/python ~/.claude/rules/python
```

安装建议：

- `common/`：所有项目都建议安装
- `zh/`：需要中文阅读体验时再安装
- `cpp/`、`python/`：按你的实际技术栈选择

更详细的说明可查看：

- `rules/README.md`
- `rules/zh/README.md`

## 项目目录结构

```text
Claude-Toolkit/
|-- .claude-plugin/              # 插件元数据与 marketplace 清单
|   |-- plugin.json              # 插件入口定义
|   |-- marketplace.json         # 自托管市场注册信息
|   `-- README.md                # 插件使用说明
|
|-- .codex-plugin/               # Codex 插件元数据
|   |-- plugin.json              # Codex 插件入口定义
|   `-- README.md                # Codex 插件安装说明
|
|-- .agents/
|   `-- plugins/
|       `-- marketplace.json     # Codex repo-scoped marketplace
|
|-- plugins/
|   `-- claude-toolkit/          # Codex marketplace 指向的插件根目录
|       |-- .codex-plugin/
|       |   `-- plugin.json
|       `-- skills -> ../../skills
|
|-- agents/                      # 10 个专业子代理
|   |-- planner.md               # 功能规划与任务拆解
|   |-- architect.md             # 系统架构设计决策
|   |-- build-error-resolver.md  # 通用构建错误修复
|   |-- code-explorer.md         # 代码探索与依赖追踪
|   |-- code-reviewer.md         # 代码质量与安全审查
|   |-- cpp-build-resolver.md    # C++ 编译链接错误修复
|   |-- cpp-reviewer.md          # C++ 内存安全与惯用法审查
|   |-- docs-lookup.md           # 查库文档与 API 示例
|   |-- performance-optimizer.md # 性能瓶颈分析与优化
|   `-- python-reviewer.md       # Python PEP8 与类型审查
|
|-- commands/                    # 13 个斜杠命令
|   |-- code-review.md           # /code-review 代码审查
|   |-- cpp-build.md             # /cpp-build C++ 构建修复
|   |-- evolve.md                # /evolve 本能进化分析
|   |-- instinct-export.md       # /instinct-export 导出本能
|   |-- instinct-import.md       # /instinct-import 导入本能
|   |-- instinct-status.md       # /instinct-status 查看本能
|   |-- jira.md                  # /jira 工单查询与操作
|   |-- plan.md                  # /plan 规划实现步骤
|   |-- projects.md              # /projects 查看学习项目
|   |-- promote.md               # /promote 提升项目本能
|   |-- prune.md                 # /prune 清理过期待审本能
|   |-- resume-session.md        # /resume-session 恢复上次会话
|   `-- save-session.md          # /save-session 保存当前状态
|
|-- skills/                      # 4 个技能包
|   |-- continuous-learning-v2/  # 基于 instinct 的持续学习
|   |-- learned-jira-bug-workflow/ # Jira BUG 工作流
|   |-- learned/                 # 主动提取并沉淀会话模式
|   `-- strategic-compact/       # 逻辑间隔主动压缩策略
|
|-- rules/                       # 编码规则（通用 + 2 语言 + 中文）
|   |-- README.md                # 结构概览与安装指南
|   |-- common/                  # 语言无关的通用原则
|   |   |-- agents.md            # 代理编排与委派时机
|   |   |-- code-review.md       # 审查标准与严重级别
|   |   |-- coding-style.md      # 不可变性、文件组织、命名
|   |   |-- development-workflow.md # 研究-规划-TDD-审查流程
|   |   |-- git-workflow.md      # 提交格式与 PR 规范
|   |   |-- hooks.md             # Hook 类型与最佳实践
|   |   |-- patterns.md          # 仓储模式与 API 信封
|   |   |-- performance.md       # 模型选择与上下文管理
|   |   |-- security.md          # 密钥管理与安全检查
|   |   `-- testing.md           # TDD 流程与 80% 覆盖率
|   |-- zh/                      # common 的中文翻译版本
|   |-- cpp/                     # C++ 专属规范
|   `-- python/                  # Python 专属规范
|
|-- hooks/                       # Hook 注册配置
|   |-- hooks.json               # 10 个轻量级钩子定义
|   `-- README.md                # Hook 使用文档
|
|-- scripts/                     # 运行时脚本
|   |-- hooks/                   # 钩子实现（13 个）
|   `-- lib/                     # 共享依赖库（9 个）
|
|-- .gitignore
|-- README.md                    # 项目说明
`-- LICENSE                      # MIT 许可证
```


## 许可证

本仓库采用 MIT License，许可证文本见 `LICENSE`。
