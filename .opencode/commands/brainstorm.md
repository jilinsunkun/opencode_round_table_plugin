---
description: 启动多 agent 同题头脑风暴流程。
agent: brainstorm-host
model: caozke-copy/gpt-5.4-mini
arguments:
  prompt:
    type: string
    description: 脑暴的核心议题描述
  card:
    type: string
    description: 使用的角色插卡套件，可选：academic(学术算法), business(商业化), general(通用)
    default: general
---

围绕以下问题开展多 agent 头脑风暴：$ARGUMENTS

入口约束：

- 先定题，再发散。
- 固定角色、固定 session、固定续接。
- 状态卡格式以 `.opencode/brainstorm/state-card-rules.md` 为准。
- 运行态由插件与 `.opencode/brainstorm/registry.json` 维护，不要手工跳过。

请输出结构化结果，优先给结论。
