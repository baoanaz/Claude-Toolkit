---
name: learned-jira-bug-workflow
description: "当用户提到 Jira、BUG、issue key 或 Jira 链接时，按阶段提取 BUG 基础信息和附件清单，匹配相关 learned skill，确认是否下载 LOG/视频/图片，归档到 /tmp/jira/<issue_key>/ 后再确认是否继续分析"
user-invocable: false
origin: auto-extracted
---

# Jira BUG 信息获取工作流

**适用场景:** 用户提到 Jira、BUG、issue key 或 Jira 链接时，先获取问题全貌，再按阶段确认下载、归档和后续分析。

## 触发条件

满足任一条件即触发：
- Jira 链接：`https://jira.cvte.com/browse/<KEY>-<NUM>`
- issue key：如 `IMT1203-9809`、`LH2507004-504`
- 用户只说到 `Jira`、`BUG`、`缺陷`、`帮我看 Jira`、`找一下我的 BUG`

如果用户没有给出明确 issue key：
- 优先用 Jira 搜索当前用户相关 BUG，例如 `assignee = currentUser() AND issuetype in (缺陷, Bug) ORDER BY updated DESC`
- 如果返回多个候选，只列出 key、标题、状态、更新时间，让用户选择，不要直接下载附件

## 信息获取步骤

### 0. 常用 Jira MCP 工具

在当前 Codex 工具列表中，Jira MCP 工具通常以短工具名展示，例如 `jira_get_issue`、`jira_search`。不同客户端可能把同一个工具渲染为 `mcp__...__jira_get_issue` 这类长名称；写 skill 时优先使用短工具名，执行时按当前会话实际暴露的工具名调用。

常用工具：
- `jira_search`：用户只说 Jira/BUG、未给 issue key 时，用 JQL 搜索候选 BUG
- `jira_get_issue`：读取 BUG 基础信息、描述、状态、人员、附件清单
- `jira_download_attachments`：用户确认后下载附件内容
- `jira_get_issue_images`：用户确认后获取截图类附件，便于直接查看 UI 状态
- `jira_batch_get_changelogs`：可选，查看状态/字段变更历史
- `jira_get_worklog`：可选，查看已有工时记录
- `jira_get_issue_dates`：可选，查看创建、更新、解决等时间信息
- `jira_get_issue_development_info`：可选，查看 Jira 关联的分支、提交、PR
- `jira_add_comment`：仅在用户明确要求时，用于把分析结论或进展回写到 Jira
- `jira_update_issue` / `jira_transition_issue`：仅在用户明确要求时修改字段或流转状态

### 1. 轻量提取基础信息

调用 `jira_get_issue`，先只拉基础字段和附件清单：
- 摘要、描述（复现步骤/期望/实际结果）
- 状态、优先级、指派人、报告人
- 项目、类型、标签、版本、创建/更新时间
- 附件文件名、大小、类型、上传时间
- 评论和变更历史只在用户要求或基础信息不足时再拉取

本阶段不要下载附件内容，只确认问题描述和附件概览。

### 2. 提取案发前后文

从 Jira 描述、标题、评论和附件文件名中整理：
- 问题发生的前置条件、操作步骤、期望结果、实际结果
- 关键时间点，例如测试时间、日志时间、视频时间
- 关键协议、信号、页面、模块、错误文案
- 可能的案发 LOG 候选，例如 USB log、EMMC log、裸 `.log`、`.blf`

输出给用户时保持简洁，重点说明还缺哪些证据。

### 3. 扫描并匹配相关 skill

根据基础信息中的关键词，在 skills 目录扫描相关 learned skill：
- 优先扫描 `~/.codex/skills/learned-*`
- 必要时也扫描 `~/.claude/skills/learned-*`
- 关键词来自 Jira 标题、描述、实际结果、附件名、模块名、协议名和错误文案

向用户报告候选 skill：
- `命中 skill 名称`
- `命中原因`
- `置信度：高/中/低`
- 如果没有命中，明确说明没有找到明显匹配 skill

本 skill 负责信息获取与分流；后续代码定位、根因分析和修复由命中的业务 skill 接管。

### 4. 基础信息后确认

完成基础信息、案发前后文和 skill 匹配后，必须暂停并询问用户：
- 是否需要下载 LOG、视频、图片或其他附件
- 具体下载哪几份附件，尤其确认案发 LOG 是哪份
- skill 匹配是否正确
- 是只下载/解压归档，还是下载后继续分析

### 5. 用户同意后下载附件

用户同意后，调用 `jira_download_attachments`：
- 常见格式：`.7z`、`.tar.gz`、`.zip`（压缩包内含 LOG）、`.log`（裸日志）、`.blf`、`.mp4`
- 只下载用户确认需要的附件；如果工具只能返回全部附件，写入后也只处理用户确认的文件

大附件限制：
- `jira_download_attachments` 走 inline/base64 通道，可能因 50 MB 之类的工具限制拒绝大文件
- 先尝试可自动化路径：Jira 附件直链、REST API、cookie/token authenticated download、已有本地缓存或用户已提供路径
- 人工下载/放置文件只是最后兜底；失败时说明失败附件名、大小和原因

### 6. LOG 附件类型和优先级

常见 Jira 附件分两类 LOG：

USB log：
- 通常文件名包含 `usb`，例如 `*_usb.zip`
- 是单次开机产生的当前运行日志，下电后会清空
- 解压后优先看 `*USB*.log`，常见入口包括 `USB.log`、`USB_first.log`
- 辅助文件包括 `hal_usb.log`、`kernel.log`、`snoopy.log`、`sys_version.conf`
- 如果 BUG 发生在本次开机、复现时间明确，优先用 USB log 定位案发前后文

EMMC log：
- 通常文件名包含 `emmc`，例如 `*_emmc.zip`
- 是历史持久化日志，包含多次开机/多段时间的记录
- 重点入口是 `emmc/app/*`，子目录常见格式为 `<序号>_<YYYY_MM_DD_HH_MM_SS>`
- `app/*` 下常见 `.log` 和 `.log.tar.gz`，按目录名和文件名时间选择覆盖案发时间点的片段
- 顶层还可能有 `kernel/`、`monitor/`、`pstore/`、`Log.db`，应用问题先看 `app/`，死机/重启/内核异常再看这些辅助目录
- 如果 USB log 不包含案发时刻，或者问题跨多次开机复现，再回到 EMMC log 查历史上下文

选择原则：
- 已知问题发生在当前这次复现：先 USB log，再 EMMC app 对齐时间补充
- 只知道大概日期或用户说“历史问题”：先 EMMC app，按时间目录缩小范围
- 同时有 USB 和 EMMC：先用 USB 找精确案发时间和关键字，再用 EMMC 查更长前后文

### 7. 归档和解压处理

将附件统一写入：

```text
/tmp/jira/<issue_key>/
```

目录用途：
- 作为后续 LLM、日志分析、视频关键帧分析的固定上下文路径
- 保留原始附件文件名
- 解压内容放在同目录下的独立子目录，避免覆盖同名文件

解压规则：
- 根据扩展名解压：
  - `.zip` → `unzip`
  - `.tar.gz` → `tar xzf`
  - `.7z` → `7z x`
- `.log` 文件直接写入，无需解压
- `.blf` 文件先保留原文件，除非用户要求转换
- 解压后列出文件树，向用户报告内容概览和主要日志文件候选

### 8. 附件归档后确认

完成下载、写入 `/tmp/jira/<issue_key>/`、解压和文件清单整理后，必须再次暂停并询问用户：
- 下载/解压结果是否符合预期
- 案发 LOG 是否就是当前列出的某一份，或者需要用户重新指定
- 是否继续进入 LOG/视频/图片分析
- 是否切换到断点一中命中的业务 skill 继续

本阶段只做归档、解压和清单整理；后续分析按用户确认继续。

### 9. 图片和视频处理

图片：
- 用户同意后调用 `jira_get_issue_images`
- 返回 PNG/JPEG 等截图，直接可视化查看
- 关注 UI 状态、异常画面、弹窗内容

视频：
- `.mp4` 等视频通过附件下载获得，写入 `/tmp/jira/<issue_key>/`
- 需要分析时用 ffmpeg 抽取关键帧：`ffmpeg -i video.mp4 -vf "fps=1" frame_%03d.jpg`
- 查看关键帧图片，了解 UI 行为和时序

### 10. 变更历史（可选）

调用 `jira_batch_get_changelogs`：
- 了解状态流转、是否有其他人处理过
- 只在用户要求、状态变化可疑，或需要确认处理责任时使用

## 输出归档

所有提取的信息整理为结构化摘要，写入 `/tmp/jira/<issue_key>/summary.md`：

```
## BUG 摘要: <KEY>-<NUM>
**标题:** ...
**状态:** ... | **优先级:** ... | **指派:** ...

### 复现步骤
1. ...

### 期望 vs 实际
- 期望: ...
- 实际: ...

### 附件概览
- Jira 附件清单: [列出文件名、大小、类型]
- 用户确认下载: [列出实际写入 /tmp/jira/<issue_key>/ 的文件]
- 下载/解压状态: [成功/失败/跳过，列出失败附件和原因]
- LOG 文件候选: [区分 USB log / EMMC log，列出解压后的主要日志路径]
- 案发 LOG 判断: [说明优先用哪份 LOG，以及依据的时间点/文件名]
- 截图/视频: [如已查看，描述关键画面和时间点]

### Skill 匹配
- 命中 skill: ...
- 命中原因: ...
- 用户确认: ...

### 流程状态
- 基础信息确认: [已确认下载范围/等待用户确认]
- 附件归档确认: [已确认继续分析/等待用户确认]

### 相关日志片段
[仅在用户同意继续分析后填写；否则写“未分析，等待用户确认”]
```

## 注意事项

- 附件可能很大，必须先看文件名和大小，再让用户确认是否下载
- 如果用户只问“能不能看见这个 Jira”，只验证访问并摘要基础信息，不下载附件
- 如果用户明确说“下载日志/解压附件/继续分析/看视频”，按用户指定范围直接推进
- LOG 文件 grep 关键字：`error`、`fatal`、`crash`、`exception`、相关模块名
- 如果 7z 解压失败，提示用户确认系统是否安装了 `p7zip-full`
