import type { Plugin } from "@opencode-ai/plugin"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

type StateCard = {
  currentQuestion: string
  currentMainProposal: string
  rejectedProposals: string[]
  keyConflicts: string[]
  openQuestions: string[]
  nextRoundQuestions: string[]
}

type RoleStatus = "pending" | "alive" | "needs_compaction" | "blocked" | "error"

type TopicRole = {
  roleName: string
  sessionId: string | null
  status: RoleStatus
  turnCount: number
  lastSeededAt: string | null
}

type TopicRecord = {
  topicId: string
  title: string
  status: "active" | "paused" | "closed"
  createdAt: string
  updatedAt: string
  round: number
  roles: {
    host: TopicRole
    diverger: TopicRole
    critic: TopicRole
    engineer: TopicRole
    researcher: TopicRole
  }
  stateCard: StateCard
  history: Array<{
    round: number
    summary: string
    stateCardSnapshot: StateCard
  }>
  compaction: {
    count: number
    lastCompactedAt: string | null
  }
  locks: {
    roleBindingLock: boolean
    sessionBindingLock: boolean
  }
}

type Registry = {
  version: string
  activeTopicId: string | null
  bootstrappingTopicId: string | null
  topics: Record<string, TopicRecord>
}

const roleOrder = ["host", "diverger", "critic", "engineer", "researcher"] as const

const roleMeta: Record<(typeof roleOrder)[number], { roleName: string; title: string; seed: string }> = {
  host: {
    roleName: "brainstorm-host",
    title: "主持人",
    seed: "你是主持 Agent，负责定题、控场、汇总与裁决。",
  },
  diverger: {
    roleName: "brainstorm-diverger",
    title: "发散者",
    seed: "你是发散型 Agent，负责围绕同一问题给出不同方案和视角。",
  },
  critic: {
    roleName: "brainstorm-critic",
    title: "挑刺者",
    seed: "你是挑刺型 Agent，负责批判性审查漏洞、边界条件与失败场景。",
  },
  engineer: {
    roleName: "brainstorm-engineer",
    title: "工程评估者",
    seed: "你是工程可行性 Agent，负责评估落地性、成本和验证路径。",
  },
  researcher: {
    roleName: "brainstorm-researcher",
    title: "研究者",
    seed: "你是研究型 Agent，负责补充事实、资料和最佳实践。",
  },
}

const defaultStateCard = (currentQuestion = ""): StateCard => ({
  currentQuestion,
  currentMainProposal: "",
  rejectedProposals: [],
  keyConflicts: [],
  openQuestions: [],
  nextRoundQuestions: [],
})

const defaultRegistry = (): Registry => ({
  version: "1.0",
  activeTopicId: null,
  bootstrappingTopicId: null,
  topics: {},
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []

const normalizeRole = (value: unknown, roleName: string): TopicRole => {
  const raw = isRecord(value) ? value : {}
  const status = raw.status
  return {
    roleName,
    sessionId: typeof raw.sessionId === "string" ? raw.sessionId : null,
    status:
      status === "alive" || status === "needs_compaction" || status === "blocked" || status === "error"
        ? status
        : "pending",
    turnCount: Number.isFinite(Number(raw.turnCount)) ? Number(raw.turnCount) : 0,
    lastSeededAt: typeof raw.lastSeededAt === "string" ? raw.lastSeededAt : null,
  }
}

const normalizeTopic = (value: unknown, topicIdFallback = ""): TopicRecord | null => {
  if (!isRecord(value)) return null

  const topicId = typeof value.topicId === "string" ? value.topicId : topicIdFallback
  if (!topicId) return null

  const title = typeof value.title === "string" && value.title.trim() ? value.title : "未命名脑暴议题"
  const createdAt = typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString()
  const updatedAt = typeof value.updatedAt === "string" ? value.updatedAt : createdAt
  const round = Number.isFinite(Number(value.round)) && Number(value.round) > 0 ? Number(value.round) : 1
  const roles = isRecord(value.roles) ? value.roles : {}
  const stateCardRaw = isRecord(value.stateCard) ? value.stateCard : {}
  const history = Array.isArray(value.history)
    ? value.history.filter(isRecord).map((item) => ({
        round: Number.isFinite(Number(item.round)) ? Number(item.round) : 1,
        summary: typeof item.summary === "string" ? item.summary : "",
        stateCardSnapshot: isRecord(item.stateCardSnapshot)
          ? {
              currentQuestion: typeof item.stateCardSnapshot.currentQuestion === "string" ? item.stateCardSnapshot.currentQuestion : "",
              currentMainProposal:
                typeof item.stateCardSnapshot.currentMainProposal === "string" ? item.stateCardSnapshot.currentMainProposal : "",
              rejectedProposals: stringArray(item.stateCardSnapshot.rejectedProposals),
              keyConflicts: stringArray(item.stateCardSnapshot.keyConflicts),
              openQuestions: stringArray(item.stateCardSnapshot.openQuestions),
              nextRoundQuestions: stringArray(item.stateCardSnapshot.nextRoundQuestions),
            }
          : defaultStateCard(),
      }))
    : []
  const compactionRaw = isRecord(value.compaction) ? value.compaction : {}
  const locksRaw = isRecord(value.locks) ? value.locks : {}

  return {
    topicId,
    title,
    status: value.status === "paused" || value.status === "closed" ? value.status : "active",
    createdAt,
    updatedAt,
    round,
    roles: {
      host: normalizeRole(roles.host, roleMeta.host.roleName),
      diverger: normalizeRole(roles.diverger, roleMeta.diverger.roleName),
      critic: normalizeRole(roles.critic, roleMeta.critic.roleName),
      engineer: normalizeRole(roles.engineer, roleMeta.engineer.roleName),
      researcher: normalizeRole(roles.researcher, roleMeta.researcher.roleName),
    },
    stateCard: {
      currentQuestion: typeof stateCardRaw.currentQuestion === "string" ? stateCardRaw.currentQuestion : "",
      currentMainProposal:
        typeof stateCardRaw.currentMainProposal === "string" ? stateCardRaw.currentMainProposal : "",
      rejectedProposals: stringArray(stateCardRaw.rejectedProposals),
      keyConflicts: stringArray(stateCardRaw.keyConflicts),
      openQuestions: stringArray(stateCardRaw.openQuestions),
      nextRoundQuestions: stringArray(stateCardRaw.nextRoundQuestions),
    },
    history,
    compaction: {
      count: Number.isFinite(Number(compactionRaw.count)) ? Number(compactionRaw.count) : 0,
      lastCompactedAt: typeof compactionRaw.lastCompactedAt === "string" ? compactionRaw.lastCompactedAt : null,
    },
    locks: {
      roleBindingLock: locksRaw.roleBindingLock !== false,
      sessionBindingLock: locksRaw.sessionBindingLock !== false,
    },
  }
}

const validateRegistry = (registry: unknown): Registry => {
  const raw = isRecord(registry) ? registry : {}
  const next = defaultRegistry()
  next.version = typeof raw.version === "string" ? raw.version : next.version
  next.activeTopicId = typeof raw.activeTopicId === "string" ? raw.activeTopicId : null
  next.bootstrappingTopicId = typeof raw.bootstrappingTopicId === "string" ? raw.bootstrappingTopicId : null

  const topics = isRecord(raw.topics) ? raw.topics : {}
  for (const [topicId, value] of Object.entries(topics)) {
    const normalized = normalizeTopic(value, topicId)
    if (normalized) next.topics[topicId] = normalized
  }

  if (next.activeTopicId && !next.topics[next.activeTopicId]) next.activeTopicId = null
  if (next.bootstrappingTopicId && !next.topics[next.bootstrappingTopicId]) next.bootstrappingTopicId = null
  return next
}

export default (async ({ client }) => {
  const pluginDir = dirname(fileURLToPath(import.meta.url))
  const registryPath = join(pluginDir, "..", "brainstorm", "registry.json")

  const readRegistry = (): Registry => {
    if (!existsSync(registryPath)) return defaultRegistry()

    try {
      return validateRegistry(JSON.parse(readFileSync(registryPath, "utf8")))
    } catch {
      return defaultRegistry()
    }
  }

  const writeRegistry = (registry: Registry) => {
    writeFileSync(registryPath, JSON.stringify(registry, null, 2), "utf8")
  }

  const syncRegistryArtifact = async (registry: Registry) => {
    const topic = registry.activeTopicId ? registry.topics[registry.activeTopicId] : null
    if (!topic) return

    const stateCardPath = join(pluginDir, "..", "brainstorm", "state-card.md")
    writeFileSync(stateCardPath, stateCardMarkdown(topic), "utf8")

    await client.app.log({
      body: {
        service: "brainstorm-orchestrator",
        level: "info",
        message: "brainstorm registry/state-card synchronized",
        extra: {
          topicId: topic.topicId,
          round: topic.round,
          registryPath,
          stateCardPath,
        },
      },
    })
  }

  const assertBrainstormReady = (prompt: string) => {
    if (!prompt.trim()) throw new Error("brainstorm command requires a concrete topic/question")
  }

  const stateCardMarkdown = (topic: TopicRecord) => `# 状态卡

> 当前议题 ID：${topic.topicId}

## 当前问题
${topic.stateCard.currentQuestion || ""}

## 当前主方案
${topic.stateCard.currentMainProposal || ""}

## 已否决方案
${topic.stateCard.rejectedProposals.length ? topic.stateCard.rejectedProposals.map((item) => `- ${item}`).join("\n") : "-"}

## 关键争议
${topic.stateCard.keyConflicts.length ? topic.stateCard.keyConflicts.map((item) => `- ${item}`).join("\n") : "-"}

## 仍待验证点
${topic.stateCard.openQuestions.length ? topic.stateCard.openQuestions.map((item) => `- ${item}`).join("\n") : "-"}

## 下一轮需要回答的问题
${topic.stateCard.nextRoundQuestions.length ? topic.stateCard.nextRoundQuestions.map((item) => `- ${item}`).join("\n") : "-"}
`

  const topicHeader = (topic: TopicRecord) => [
    `当前议题 ID：${topic.topicId}`,
    `当前轮次：${topic.round}`,
    `固定角色会话：`,
    ...roleOrder.map((roleKey) => {
      const role = topic.roles[roleKey]
      return `- ${roleMeta[roleKey].title} (${role.roleName}) => ${role.sessionId ?? "未初始化"}`
    }),
  ].join("\n")

  const seedRoleSession = async (topic: TopicRecord, roleKey: (typeof roleOrder)[number]) => {
    const role = topic.roles[roleKey]
    const meta = roleMeta[roleKey]
    const title = `${meta.title} · ${topic.topicId}`

    if (role.sessionId) {
      try {
        await client.session.get({ path: { id: role.sessionId } })
      } catch {
        role.sessionId = null
      }
    }

    if (!role.sessionId) {
      const created = await client.session.create({ body: { title } })
      role.sessionId = created.id
    }

    try {
      await client.session.update({ path: { id: role.sessionId }, body: { title } })
    } catch {
      // title update is best-effort
    }

    await client.session.prompt({
      path: { id: role.sessionId },
      body: {
        noReply: true,
        parts: [
          {
            type: "text",
            text: [
              meta.seed,
              "",
              topicHeader(topic),
              "",
              stateCardMarkdown(topic),
            ].join("\n"),
          },
        ],
      },
    })

    role.status = "alive"
    role.turnCount += 1
    role.lastSeededAt = new Date().toISOString()
  }

  const prepareTopic = (prompt: string, registry: Registry): TopicRecord => {
    const active = registry.activeTopicId ? registry.topics[registry.activeTopicId] : null

    if (active && active.status === "active") {
      active.round += 1
      active.updatedAt = new Date().toISOString()
      active.history.push({
        round: active.round - 1,
        summary: `继续圆桌：${prompt.slice(0, 120)}`,
        stateCardSnapshot: { ...active.stateCard },
      })
      active.stateCard.currentQuestion = prompt
      active.stateCard.nextRoundQuestions = []
      registry.activeTopicId = active.topicId
      return active
    }

    const topicId = `topic_${Date.now()}`
    const topic: TopicRecord = {
      topicId,
      title: prompt.slice(0, 80) || "未命名脑暴议题",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      round: 1,
      roles: {
        host: { roleName: roleMeta.host.roleName, sessionId: null, status: "pending", turnCount: 0, lastSeededAt: null },
        diverger: { roleName: roleMeta.diverger.roleName, sessionId: null, status: "pending", turnCount: 0, lastSeededAt: null },
        critic: { roleName: roleMeta.critic.roleName, sessionId: null, status: "pending", turnCount: 0, lastSeededAt: null },
        engineer: { roleName: roleMeta.engineer.roleName, sessionId: null, status: "pending", turnCount: 0, lastSeededAt: null },
        researcher: { roleName: roleMeta.researcher.roleName, sessionId: null, status: "pending", turnCount: 0, lastSeededAt: null },
      },
      stateCard: defaultStateCard(prompt),
      history: [],
      compaction: { count: 0, lastCompactedAt: null },
      locks: { roleBindingLock: true, sessionBindingLock: true },
    }

    registry.topics[topicId] = topic
    registry.activeTopicId = topicId
    return topic
  }

  const isBrainstormCommand = (output: any) => String(output?.command ?? output?.name ?? "") === "brainstorm"

  return {
    config: (cfg) => {
      cfg.default_agent = cfg.default_agent || "brainstorm-host"

      cfg.skills ??= {}
      cfg.skills.paths = Array.from(new Set([...(cfg.skills.paths ?? []), ".opencode/skills"]))

      cfg.agent ??= {}
      cfg.agent["brainstorm-host"] = {
        ...(cfg.agent["brainstorm-host"] ?? {}),
        mode: "primary",
        description: "主持多 agent 同题头脑风暴，负责定题、控场、收敛结论。",
        permission: {
          ...(cfg.agent["brainstorm-host"]?.permission ?? {}),
          task: {
            "": "deny",
            "brainstorm-diverger": "allow",
            "brainstorm-critic": "allow",
            "brainstorm-engineer": "allow",
            "brainstorm-researcher": "allow",
          },
        },
      }
      cfg.agent["brainstorm-diverger"] = {
        ...(cfg.agent["brainstorm-diverger"] ?? {}),
        mode: "subagent",
        description: "多 agent 头脑风暴中的发散角色，负责同题提出不同方案。",
        permission: {
          ...(cfg.agent["brainstorm-diverger"]?.permission ?? {}),
          task: "deny",
        },
      }
      cfg.agent["brainstorm-critic"] = {
        ...(cfg.agent["brainstorm-critic"] ?? {}),
        mode: "subagent",
        description: "多 agent 头脑风暴中的挑刺角色，负责批判性审查方案漏洞与边界条件。",
        permission: {
          ...(cfg.agent["brainstorm-critic"]?.permission ?? {}),
          task: "deny",
        },
      }
      cfg.agent["brainstorm-engineer"] = {
        ...(cfg.agent["brainstorm-engineer"] ?? {}),
        mode: "subagent",
        description: "多 agent 头脑风暴中的工程评估角色，负责可落地性、成本和验证难度判断。",
        permission: {
          ...(cfg.agent["brainstorm-engineer"]?.permission ?? {}),
          task: "deny",
        },
      }
      cfg.agent["brainstorm-researcher"] = {
        ...(cfg.agent["brainstorm-researcher"] ?? {}),
        mode: "subagent",
        description: "多 agent 头脑风暴中的研究角色，负责补充事实、资料和最佳实践。",
        permission: {
          ...(cfg.agent["brainstorm-researcher"]?.permission ?? {}),
          task: "deny",
        },
      }

      cfg.command ??= {}
      cfg.command.brainstorm = {
        ...(cfg.command.brainstorm ?? {}),
        description: "启动多 agent 同题头脑风暴流程。",
        agent: "brainstorm-host",
        subtask: false,
      }
    },

    "session.created": async (event) => {
      const registry = readRegistry()
      const topicId = registry.activeTopicId
      if (!topicId || registry.bootstrappingTopicId === topicId || !registry.topics[topicId]) return event

      const topic = registry.topics[topicId]
      topic.updatedAt = new Date().toISOString()
      topic.history.push({
        round: topic.round,
        summary: "session.created 触发，准备进入固定角色圆桌",
        stateCardSnapshot: { ...topic.stateCard },
      })
      writeRegistry(registry)
      await syncRegistryArtifact(registry)
      return event
    },

    "session.compacted": async (event) => {
      const registry = readRegistry()
      const topicId = registry.activeTopicId
      if (!topicId || !registry.topics[topicId]) return event

      const topic = registry.topics[topicId]
      topic.updatedAt = new Date().toISOString()
      topic.compaction.count += 1
      topic.compaction.lastCompactedAt = new Date().toISOString()
      topic.stateCard.openQuestions = Array.from(new Set(topic.stateCard.openQuestions))
      writeRegistry(registry)
      await syncRegistryArtifact(registry)
      return event
    },

    "command.execute.before": async (_input, output) => {
      if (!isBrainstormCommand(output)) return

      const prompt = String(output?.args?.prompt ?? "").trim()
      assertBrainstormReady(prompt)

      const registry = readRegistry()
      registry.bootstrappingTopicId = null
      const topic = prepareTopic(prompt, registry)
      registry.bootstrappingTopicId = topic.topicId
      writeRegistry(registry)

      try {
        for (const roleKey of roleOrder) {
          await seedRoleSession(topic, roleKey)
        }
        topic.updatedAt = new Date().toISOString()
      } catch (error) {
        topic.status = "paused"
        topic.updatedAt = new Date().toISOString()
        topic.history.push({
          round: topic.round,
          summary: `固定 session 初始化失败：${error instanceof Error ? error.message : String(error)}`,
          stateCardSnapshot: { ...topic.stateCard },
        })
        topic.locks.roleBindingLock = true
        topic.locks.sessionBindingLock = true
        writeRegistry(registry)
        throw error
      } finally {
        registry.bootstrappingTopicId = null
        writeRegistry(registry)
      }

      const sessionLines = roleOrder.map((roleKey) => {
        const role = topic.roles[roleKey]
        return `- ${roleMeta[roleKey].title}: ${role.sessionId ?? "未初始化"}`
      })

      output.args = output.args ?? {}
      output.args.prompt = [
        prompt,
        "",
        "执行要求：",
        "1. 主持 agent 先定题，再发散。",
        "2. 并行让发散、挑刺、工程、研究角色围绕同一问题讨论。",
        "3. 每轮开始前生成状态卡，发给所有固定角色。",
        "4. 角色固定、子代理固定、会话固定；上下文满了先压缩状态卡，再继续同一圆桌。",
        "5. 最后由主持 agent 收敛成主方案、备选方案和风险清单。",
        `6. 当前议题 ID：${topic.topicId}`,
        `7. 当前轮次：${topic.round}`,
        "8. 固定角色会话：",
        ...sessionLines,
        "",
        stateCardMarkdown(topic),
      ].join("\n")

      registry.topics[topic.topicId] = topic
      writeRegistry(registry)
      await syncRegistryArtifact(registry)
    },
  }
}) satisfies Plugin
