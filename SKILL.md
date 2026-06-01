---
name: brainstorm-environment-setup
description: Use when installing a brainstorm environment by copying `.opencode` into a target project worktree for rapid bootstrap or template mirroring.
---

# brainstorm-environment-setup

将当前仓库中的 `.opencode` 作为“脑暴环境安装包”，一键安装到目标项目工作目录，帮助快速搭好 opencode 配置、技能、代理与命令。

## 触发场景

- 用户说：安装脑暴环境、复制 `.opencode`、同步 `.opencode`、快速部署 opencode、把配置搬到另一个项目
- 需要把当前项目的 opencode 目录作为标准脑暴环境安装到另一个工作目录
- 需要给新项目快速落地相同的 opencode 脑暴能力栈

## 核心目标

1. 保留可复用的脑暴环境结构
2. 避免把临时产物一并复制过去
3. 以“安装”而不是“手工拼装”为目标，优先稳定落地
4. 同步后明确提醒重启 opencode

## 推荐流程

### 1) 确认安装源与安装目标

- 源目录：当前项目根目录下的 `.opencode`
- 目标目录：用户指定的另一个项目工作目录
- 安装目标：目标项目中的 `.opencode`

### 2) 默认同步范围

默认只同步这些内容：

- `.opencode/opencode.json`
- `.opencode/agent/` 或 `.opencode/agents/`
- `.opencode/skill/` 或 `.opencode/skills/`
- `.opencode/plugin/` 或 `.opencode/plugins/`
- `.opencode/commands/`
- 其他明确声明为配置的文件

### 3) 默认排除项

默认不要复制这些易变内容，除非用户明确要求：

- `node_modules/`
- 缓存、临时文件、日志文件
- 构建产物
- 与当前机器强绑定的本地调试文件

### 4) 处理目标已有 `.opencode`

- 如果目标不存在 `.opencode`：直接创建并同步
- 如果目标已存在 `.opencode`：
  - 先检查差异
  - 再选择覆盖、合并或仅补齐缺失项
  - 不要盲目整目录强覆盖，除非用户明确要求“完全替换”

### 5) 同步后验收

- 检查目标目录是否存在完整的 `.opencode` 结构
- 确认关键文件没有丢失
- 如有 `opencode.json` 改动，提醒用户退出并重启 opencode

## 执行原则

- 优先最小改动：只同步必要文件
- 优先可逆操作：有覆盖风险时先备份或先比较
- 优先可移植性：避免把本机环境文件带到别处
- 优先明确输出：告诉用户复制了什么、排除了什么、还需要做什么

## 参考命令思路

> 这里只描述思路，不强制绑定某个平台命令。

- 整目录复制：用于全量初始化新项目
- 增量同步：用于已有配置的项目
- 排除 `node_modules/`：避免把本机依赖目录带到目标项目
- 同步完成后立即校验目录结构

## 可执行脚本

- `scripts/copy_opencode.py`：把当前仓库的 `.opencode` 安装到目标项目的 `.opencode`
- 推荐参数：
  - `python scripts/copy_opencode.py <target-project>`：全量安装目标 `.opencode`
  - `python scripts/copy_opencode.py <target-project> --clean`：兼容参数，行为同样是全量安装

脚本默认跳过临时、缓存和依赖目录，避免把本机环境污染到目标项目。

## 交付格式

执行完后，输出三项：

1. 源目录与目标目录
2. 同步了哪些文件/目录，排除了哪些项
3. 是否需要重启 opencode

## 操作中遇到的问题

在实际安装脑暴环境时，曾遇到以下问题，后续安装时需要提前规避：

1. **目标目录可以不存在**
   - 目标项目下没有 `.opencode` 是正常情况。
   - 脚本应负责创建并安装，不需要先手工建目录。

2. **Windows + bash 混用时，长命令很容易引号出错**
   - 直接在 bash 里拼接 `python -c` 的长字符串，容易出现引号闭合错误。
   - 更稳妥的做法是直接调用脚本文件：`python scripts/copy_opencode.py <target> --source <source>`。

3. **源目录要明确指向技能里的 `.opencode`**
   - 本次源路径是 `C:\Users\Administrator\.cc-switch\skills\brainstorm-environment-setup\.opencode`。
   - 安装时要显式指定 `--source`，避免误把当前工作目录下的其它 `.opencode` 当成源。

4. **目标存在时采用全量覆盖**
   - 目标 `.opencode` 已存在时，应先删除再安装，保证结果和模板一致。
   - 这个行为要在输出里明确说明，避免用户误以为是增量合并。

5. **复制后必须重启 opencode**
   - `opencode.json`、agent、skill、plugin 这些配置文件不会热加载。
   - 复制完成后要提醒用户退出并重启 opencode。
