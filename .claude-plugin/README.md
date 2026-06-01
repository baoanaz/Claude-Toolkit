### 插件清单注意事项

编辑 `.claude-plugin/plugin.json` 时，注意 Claude 插件校验器有一些**未文档化但严格的约束**，可能导致安装失败并报模糊错误（如 `agents: Invalid input`）。特别是：组件字段必须是数组，`agents` 不是受支持的清单字段且不能包含在 plugin.json 中，`version` 字段是可靠验证和安装所必需的。

### 自定义端点与网关

本插件不覆盖 Claude Code 的传输设置。如果 Claude Code 配置了官方 LLM 网关或兼容的自定义端点，插件仍可正常工作，因为钩子、技能和命令在 CLI 成功启动后本地执行。

使用 Claude Code 自身的环境/配置进行传输选择，例如：

```bash
export ANTHROPIC_BASE_URL=https://your-gateway.example.com
export ANTHROPIC_AUTH_TOKEN=your-token
claude
```
