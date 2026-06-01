# 脑暴项目文件职责重构清单 v3

## 目标

把重复定义收敛成单一事实源（SSOT），并把 **规则 / 入口 / 角色 / 执行 / 配置 / 产物 / 状态** 分开，防止维护漂移。

## 总原则

- 规则正文只允许有一个权威源：`state-card-rules.md`。
- 其他文件只允许保留最小必要上下文，不得复写规则正文。
- 新增或修改规则时，只能先改 SSOT，其他文件只能做短引用或最小约束同步。
- 文档定义规则，代码执行规则，入口触发流程，配置只做装配，产物只反映结果，状态只保存运行时信息。

---

## 1. `.opencode/brainstorm/state-card-rules.md`

### 定位
唯一规则源（SSOT）+ 契约源。

### 保留什么
- 规则边界与适用范围
- 结构契约：字段、字段语义、必保字段、字段顺序
- 映射契约：中文字段 ↔ 代码字段
- 行为契约：更新规则、压缩规则、版本兼容
- 输出格式
- 纪律与边界
- 版本说明 / 兼容性说明

### 删除什么
- 入口说明
- 角色口吻
- 执行细节叙述
- 历史背景和迁移理由

### 改成什么引用
- 其他文件只保留短引用，例如：`规则见 .opencode/brainstorm/state-card-rules.md`
- 不在其他文件复写规则正文。

---

## 2. `.opencode/agents/brainstorm-host.md`

### 定位
角色壳 / 行为边界层。

### 保留什么
- 身份
- 职责边界
- 禁止越权的最简约束
- 对 SSOT 的短引用

### 删除什么
- 完整流程
- 状态卡字段清单
- 收敛规则全文
- 轮次协议全文

### 改成什么引用
- 开头保留一句：`主持与收敛规则以 .opencode/brainstorm/state-card-rules.md 为准`

### 额外约束
- 角色文件最多保留一页，不允许变成迷你规则集。

---

## 3. `.opencode/commands/brainstorm.md`

### 定位
入口层 / 最小使用说明。

### 保留什么
- 命令用途
- 触发方式
- 最小启动说明
- 一句 SSOT 引用

### 删除什么
- 详细流程正文
- 状态卡字段正文
- 多轮策略正文
- 角色分工正文

### 改成什么引用
- 保留一句入口提示：`完整流程与状态规则见 .opencode/brainstorm/state-card-rules.md`

### 额外约束
- 使用示例最多 1-2 个。
- 入口层只负责“怎么进来”，不负责“怎么跑完”。

---

## 4. `.opencode/plugin/brainstorm-orchestrator.ts`

### 定位
执行层 / 守门层 / 校验层。

### 保留什么
- 主题初始化
- 固定角色会话创建
- registry 读写
- state-card 同步
- 生命周期处理
- 运行时校验
- 字段默认值补全
- 写入与落盘

### 删除什么
- 第二份规则正文
- 策略说明
- 规则解释性叙述

### 改成什么引用
- 执行以 `.opencode/brainstorm/state-card-rules.md` 为准
- 插件只消费结构化契约，不解释规则正文

### 额外约束
- 插件是守门员，不是规则编译器，也不是规则解释器。
- 允许少量字段常量，不允许复制整套策略。

---

## 5. `.opencode/opencode.json`

### 定位
注册层 / 装配层 / 配置层。

### 保留什么
- 默认 agent
- skills 路径
- plugin 挂载
- agent 注册
- command 注册
- 权限配置

### 删除什么
- 流程正文
- 规则正文
- 说明性长文

### 改成什么引用
- 只保留组件注册关系，不承载业务规则。

### 额外约束
- 只能写机器配置，不写业务知识。

---

## 6. `.opencode/brainstorm/state-card.md`

### 定位
生成产物 / 人可读运行态视图。

### 保留什么
- 当前议题 ID
- 当前问题
- 当前主方案
- 已否决方案
- 关键争议
- 仍待验证点
- 下一轮需要回答的问题

### 删除什么
- 规则正文
- 流程正文
- 角色说明

### 改成什么引用
- 声明其为插件生成产物，由 `state-card-rules.md` 约束格式。

### 额外约束
- 禁止手工把它改成规范源。
- 由插件写，人和主持人读。

---

## 7. `.opencode/brainstorm/registry.json`

### 定位
运行时状态存储 / 机器可读状态。

### 保留什么
- `version`
- `activeTopicId`
- `bootstrappingTopicId`
- `topics`
- 主题状态、角色状态、历史摘要、压缩记录、锁状态

### 删除什么
- 业务规则说明
- 职责说明
- 入口说明

### 改成什么引用
- 声明其为运行时状态，不是规则源，也不是职责说明文件。

### 额外约束
- 由插件写，机器读写；字段必须与 `state-card-rules.md` 契约一致。

---

## 建议的职责分层

### A. 规则层
`state-card-rules.md`

### B. 角色层
`agents/brainstorm-host.md`

### C. 入口层
`commands/brainstorm.md`

### D. 执行层
`plugin/brainstorm-orchestrator.ts`

### E. 注册层
`opencode.json`

### F. 生成产物
`state-card.md`

### G. 运行时存储
`registry.json`

---

## 推荐迁移顺序

1. 先把 `state-card-rules.md` 定成唯一规则正文，并补契约区、字段映射表、版本说明。
2. 再收缩 `commands/brainstorm.md`，只保留最小入口说明 + 短引用。
3. 再收缩 `agents/brainstorm-host.md`，只保留角色边界 + 短引用。
4. 再薄化 `plugin/brainstorm-orchestrator.ts`，只保留执行、校验、落盘。
5. 再确认 `state-card.md` 和 `registry.json` 只作为产物 / 运行态存在。
6. 最后检查 `opencode.json`，只保留注册与装配。

---

## 验证清单

- 是否只有 `state-card-rules.md` 存在规则正文？
- 其他文件是否只保留最小上下文和短引用？
- `plugin/brainstorm-orchestrator.ts` 是否只做执行与校验，不承载策略正文？
- `state-card.md` 是否只作为插件生成产物存在？
- `registry.json` 是否只保存运行时状态，不混入职责说明？
- 新增或修改规则时，是否只需首发改 `state-card-rules.md`？
- 是否存在字段名 / 字段顺序 / 字段语义在不同层轻微漂移？
- 规则改动后，是否能通过最小校验发现不一致？

---

## 结论

**最小可行方案：SSOT 定义规则，插件执行与校验，命令负责入口，配置负责装配，state-card 负责视图，registry 负责状态。**

这能把重复定义和执行漂移压到最低。
