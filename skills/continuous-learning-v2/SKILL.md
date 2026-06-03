---
name: continuous-learning-v2
description: 基于本能的持续学习系统，通过钩子观察会话，创建带置信度评分的原子本能，并将其进化为技能/命令/代理。
origin: Claude-Toolkit
version: 2.1.0
---

# 持续学习 v2.1 - 基于本能的架构

这个技能把 Claude Code 会话转化为可复用知识：钩子持续记录工具调用和结果，后台观察器从观察记录里提取稳定模式，形成带置信度和作用域的原子“本能”。多个相关本能可以继续进化为技能、命令或代理。

## 何时激活

- 设置从 Claude Code 会话自动学习
- 配置观察钩子和后台观察器
- 查看、导出或导入本能库
- 将本能进化为技能、命令或代理
- 管理项目作用域与全局本能
- 将项目本能提升为全局本能

## 核心能力

| 能力 | 说明 |
|------|------|
| 确定性观察 | `PreToolUse` / `PostToolUse` 钩子捕获工具调用开始和完成事件 |
| 项目隔离 | 按 git remote 或仓库根路径生成项目 ID，避免跨项目污染 |
| 原子本能 | 每个本能只描述一个触发条件和一个动作 |
| 置信度评分 | 用 0.3-0.9 表示模式稳定程度 |
| 本地存储 | 观察记录、本能和进化产物都保存在本机 |
| 主动命令 | `/instinct-status`、`/evolve`、`/instinct-export`、`/instinct-import`、`/promote`、`/projects`、`/prune` |

## 本能模型

```yaml
---
id: prefer-functional-style
trigger: "when writing new functions"
confidence: 0.7
domain: "code-style"
source: "session-observation"
scope: project
project_id: "a1b2c3d4e5f6"
project_name: "my-react-app"
---

# Prefer Functional Style

## Action
Use functional patterns over classes when appropriate.

## Evidence
- Observed 5 instances of functional pattern preference
- User corrected class-based approach to functional on 2025-01-15
```

本能属性：

- **原子化**：一个触发条件，一个动作
- **置信度加权**：0.3 = 试探性，0.9 = 近乎确定
- **领域标记**：代码风格、测试、git、调试、工作流等
- **证据支持**：记录观察来源和最后出现时间
- **作用域感知**：`project` 默认项目级，`global` 全局级

## 工作链路

```text
会话活动（在 git 仓库中）
      |
      | PreToolUse / PostToolUse 捕获工具使用
      | detect-project.sh 检测项目上下文
      v
projects/<project-hash>/observations.jsonl
      |
      | observer-loop.sh 后台分析
      v
模式检测
  - 用户纠正 -> 本能
  - 错误解决 -> 本能
  - 重复工作流 -> 本能
  - 范围决策 -> project 或 global
      |
      v
projects/<project-hash>/instincts/personal/
instincts/personal/
      |
      | /evolve 聚类，/promote 提升
      v
projects/<project-hash>/evolved/
evolved/
```

## 数据目录

持续学习数据默认不写入 `~/.claude`，避免后台写入被敏感路径保护拦截。目录解析优先级：

1. `CLV2_HOMUNCULUS_DIR`，必须是绝对路径
2. `$XDG_DATA_HOME/claude-toolkit-homunculus`，当 `XDG_DATA_HOME` 是绝对路径
3. `$HOME/.local/share/claude-toolkit-homunculus`

如果旧版本已在 `~/.claude/homunculus` 存有数据，可执行一次迁移：

```bash
bash skills/continuous-learning-v2/scripts/migrate-homunculus.sh
```

## 项目检测

系统会自动检测当前项目：

1. `CLAUDE_PROJECT_DIR` 环境变量，优先解析到 git 仓库根目录
2. `git remote get-url origin`，规范化后哈希，保证同一远端在不同机器得到同一项目 ID
3. `git rev-parse --show-toplevel`，无远端时用主 worktree 根路径作为后备
4. 无项目上下文时使用全局作用域

每个项目得到一个 12 字符哈希 ID，例如 `a1b2c3d4e5f6`。项目注册表位于数据目录下的 `projects.json`。

## 快速开始

### 插件安装

作为 Claude-Toolkit 插件安装时，不需要在 `~/.claude/settings.json` 里额外添加 hook。插件的 `hooks/hooks.json` 已注册观察钩子。

如果你之前手动复制过 `observe.sh` 到 `settings.json`，请删除重复的 `PreToolUse` / `PostToolUse` 配置。重复注册会导致同一事件被记录多次。

### 手动安装

如果手动安装到 `~/.claude/skills`，可将以下内容添加到 `~/.claude/settings.json`：

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "~/.claude/skills/continuous-learning-v2/hooks/observe.sh"
      }]
    }],
    "PostToolUse": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "~/.claude/skills/continuous-learning-v2/hooks/observe.sh"
      }]
    }]
  }
}
```

## 命令

| 命令 | 描述 |
|------|------|
| `/instinct-status` | 显示项目级和全局本能，按领域分组并展示置信度 |
| `/evolve` | 聚类相关本能，建议或生成技能、命令、代理 |
| `/instinct-export` | 导出本能，可按作用域、领域、置信度过滤 |
| `/instinct-import <file-or-url>` | 导入本能到项目或全局作用域 |
| `/promote [id]` | 将项目本能提升到全局作用域 |
| `/projects` | 列出项目注册表和本能/观察数量 |
| `/prune` | 清理过期的待审本能 |

也可以直接调用脚本：

```bash
python3 skills/continuous-learning-v2/scripts/instinct-cli.py status
python3 skills/continuous-learning-v2/scripts/instinct-cli.py evolve --generate
python3 skills/continuous-learning-v2/scripts/instinct-cli.py projects
```

## 配置

编辑 `skills/continuous-learning-v2/config.json` 控制后台观察器：

```json
{
  "version": "2.1",
  "observer": {
    "enabled": false,
    "run_interval_minutes": 5,
    "min_observations_to_analyze": 20
  }
}
```

| 键 | 默认值 | 描述 |
|----|--------|------|
| `observer.enabled` | `false` | 是否启用后台观察器代理 |
| `observer.run_interval_minutes` | `5` | 后台观察器分析观察结果的间隔 |
| `observer.min_observations_to_analyze` | `20` | 触发一次分析所需的最少观察条数 |

其他行为，如观察捕获、本能阈值、项目作用域、提升标准，由 `observe.sh`、`detect-project.sh` 和 `instinct-cli.py` 的代码默认值控制。

## 文件结构

```text
${XDG_DATA_HOME:-$HOME/.local/share}/claude-toolkit-homunculus/
|-- projects.json
|-- observations.jsonl
|-- instincts/
|   |-- personal/
|   `-- inherited/
|-- evolved/
|   |-- agents/
|   |-- skills/
|   `-- commands/
`-- projects/
    `-- a1b2c3d4e5f6/
        |-- project.json
        |-- observations.jsonl
        |-- observations.archive/
        |-- instincts/
        |   |-- personal/
        |   |-- inherited/
        |   `-- pending/
        `-- evolved/
            |-- skills/
            |-- commands/
            `-- agents/
```

## 作用域决策

| 模式类型 | 建议作用域 | 示例 |
|----------|------------|------|
| 语言/框架约定 | project | 使用 React hooks、遵循 Django REST 模式 |
| 文件结构偏好 | project | 测试放在 `__tests__/`、组件放在 `src/components/` |
| 代码风格 | project | 使用函数式风格、首选 dataclass |
| 错误处理策略 | project | 对错误使用 Result 类型 |
| 安全实践 | global | 验证用户输入、清理 SQL |
| 通用最佳实践 | global | 先写测试、始终处理错误 |
| 工具工作流偏好 | global | 编辑前先搜索、写入前先读取 |
| Git 实践 | global | 约定式提交、小而聚焦的提交 |

如果不确定，默认选择 `project`。项目本能可以后续提升到全局，反向清理全局污染成本更高。

## 本能提升

当同一模式在多个项目中高置信度出现时，可以提升到全局。

自动提升标准：

- 相同本能 ID 出现在 2 个或更多项目
- 平均置信度大于等于 0.8

常用命令：

```bash
python3 skills/continuous-learning-v2/scripts/instinct-cli.py promote prefer-explicit-errors
python3 skills/continuous-learning-v2/scripts/instinct-cli.py promote --dry-run
python3 skills/continuous-learning-v2/scripts/instinct-cli.py promote --force
```

## 置信度评分

| 分数 | 含义 | 行为 |
|------|------|------|
| 0.3 | 试探性 | 建议但不强制 |
| 0.5 | 中等 | 相关时应用 |
| 0.7 | 强 | 可作为默认偏好 |
| 0.9 | 近乎确定 | 核心行为 |

置信度增加场景：

- 模式被反复观察到
- 用户没有纠正该行为
- 相似本能互相支持

置信度降低场景：

- 用户明确纠正该行为
- 长时间未再次观察到该模式
- 出现矛盾证据

## 隐私

- 观察记录和本能保留在本机
- 项目级本能按项目隔离
- 导出对象是“模式”，不是原始对话或代码
- 观察记录会做常见 secret 字段脱敏
- 用户控制导出、导入和提升

## 与主动沉淀的关系

`continuous-learning-v2` 是自动观察链路，适合从长期行为中提取模式。`learned` skill 是主动沉淀链路，适合在一次明确排查或实现结束后，由用户要求提取高质量经验。两者互补：自动链路积累证据，主动链路负责人工确认和高质量保存。
