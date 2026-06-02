# opencode round table plugin

一个面向 opencode 的多 agent 脑暴插件模板，提供一套可直接复用的“主持人 + 发散者 + 挑刺者 + 工程评估者 + 研究者”协作流程。

## 项目目标

- 把同题讨论标准化为可复用的多 agent 流程
- 用状态卡压缩讨论结果，便于下一轮继续推进
- 让角色分工、会话绑定、收敛机制保持一致

## 核心能力

- `brainstorm-host`：主持、定题、控场、收敛结论
- `brainstorm-diverger`：提供不同方案和替代路径
- `brainstorm-critic`：批判性审查漏洞与边界条件
- `brainstorm-engineer`：评估落地成本、复杂度与验证难度
- `brainstorm-researcher`：补充事实、案例和最佳实践

## 目录结构

```text
.opencode/
├── agents/                  # 各角色子代理定义
├── brainstorm/              # 状态卡、注册表、角色卡片
├── commands/                # 脑暴命令入口
├── plugin/                  # 脑暴编排插件
├── skills/                  # 可复用技能
├── opencode.json            # opencode 配置
└── package.json             # 依赖声明
```

## 使用方式

### 1. 安装到目标项目

将本仓库的 `.opencode` 目录复制到目标项目根目录。

### 2. 启动 opencode

在目标项目中重启 opencode，使配置、命令、代理和插件生效。

### 3. 发起脑暴

使用项目里的脑暴命令，输入你的问题或主题，让多 agent 按角色协作讨论。

## 状态卡说明

状态卡是脑暴流程的单一事实源，用来记录：

- 当前问题
- 当前主方案
- 已否决方案
- 关键争议
- 仍待验证点
- 下一轮需要回答的问题

相关更新规则以：`.opencode/brainstorm/state-card-rules.md` 为准。

## 设计原则

- 先定题，再发散
- 固定角色、固定 session、固定续接
- 状态卡只保留下一轮决策所需的最小信息
- 所有编排和约束优先由插件维护，不手工绕过运行态

## 依赖

- `@opencode-ai/plugin`

## 备注

本仓库更像是一个可安装的脑暴环境模板，而不是普通业务应用。
