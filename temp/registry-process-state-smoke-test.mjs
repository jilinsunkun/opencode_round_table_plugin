import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const registryPath = resolve(rootDir, ".opencode/brainstorm/registry.json")

const now = () => new Date().toISOString()

const defaultStateCard = (currentQuestion = "") => ({
  currentQuestion,
  currentMainProposal: "",
  rejectedProposals: [],
  keyConflicts: [],
  openQuestions: [],
  nextRoundQuestions: [],
})

const defaultTopic = () => ({
  topicId: "topic_smoke_001",
  title: "registry process-state smoke test",
  status: "active",
  createdAt: now(),
  updatedAt: now(),
  round: 1,
  roles: {
    host: { roleName: "brainstorm-host", sessionId: "session-host", status: "alive", turnCount: 1, lastSeededAt: now() },
    diverger: { roleName: "brainstorm-diverger", sessionId: "session-diverger", status: "alive", turnCount: 1, lastSeededAt: now() },
    critic: { roleName: "brainstorm-critic", sessionId: "session-critic", status: "alive", turnCount: 1, lastSeededAt: now() },
    engineer: { roleName: "brainstorm-engineer", sessionId: "session-engineer", status: "alive", turnCount: 1, lastSeededAt: now() },
    researcher: { roleName: "brainstorm-researcher", sessionId: "session-researcher", status: "alive", turnCount: 1, lastSeededAt: now() },
  },
  stateCard: defaultStateCard("如何验证 registry 能维护过程态？"),
  history: [],
  compaction: { count: 0, lastCompactedAt: null },
  locks: { roleBindingLock: true, sessionBindingLock: true },
})

const validate = (registry) => {
  const errors = []
  if (registry.version !== "1.0") errors.push(`version=${registry.version}`)
  if (typeof registry.activeTopicId !== "string") errors.push("activeTopicId missing")
  const topic = registry.topics?.[registry.activeTopicId]
  if (!topic) errors.push("active topic missing")
  if (topic) {
    if (topic.round !== 2) errors.push(`round=${topic.round}`)
    if (topic.history.length !== 1) errors.push(`history.length=${topic.history.length}`)
    if (topic.compaction.count !== 1) errors.push(`compaction.count=${topic.compaction.count}`)
    if (topic.stateCard.currentQuestion !== "第二轮：怎么恢复中断后的讨论？") errors.push("currentQuestion drift")
    if (topic.history[0]?.stateCardSnapshot?.currentQuestion !== "如何验证 registry 能维护过程态？") errors.push("history snapshot not preserved")
    if (!topic.roles.host?.sessionId || !topic.roles.critic?.sessionId) errors.push("roles not preserved")
  }
  return errors
}

const main = () => {
  const hadOriginal = existsSync(registryPath)
  const original = hadOriginal ? readFileSync(registryPath, "utf8") : null

  try {
    const registry = {
      version: "1.0",
      activeTopicId: null,
      bootstrappingTopicId: null,
      topics: {},
    }

    const topic = defaultTopic()
    registry.topics[topic.topicId] = topic
    registry.activeTopicId = topic.topicId
    registry.bootstrappingTopicId = null

    // round 2: simulate a persisted process update
    topic.history.push({
      round: topic.round,
      summary: "round 1 finished; moving to recovery test",
      stateCardSnapshot: structuredClone(topic.stateCard),
    })
    topic.round += 1
    topic.updatedAt = now()
    topic.stateCard.currentQuestion = "第二轮：怎么恢复中断后的讨论？"
    topic.stateCard.currentMainProposal = "把 registry 作为运行时状态源，状态卡作为可读快照"
    topic.stateCard.openQuestions = ["中断后是否能恢复 active topic？", "role session 是否还在？", "历史摘要是否完整？"]
    topic.stateCard.nextRoundQuestions = ["先做哪一个：恢复，还是验收？"]
    topic.compaction.count += 1
    topic.compaction.lastCompactedAt = now()
    topic.stateCard.openQuestions = Array.from(new Set(topic.stateCard.openQuestions))

    writeFileSync(registryPath, JSON.stringify(registry, null, 2), "utf8")

    const reread = JSON.parse(readFileSync(registryPath, "utf8"))
    const errors = validate(reread)

    if (errors.length) {
      console.error("FAIL: registry process-state smoke test")
      console.error(errors.join("\n"))
      process.exitCode = 1
      return
    }

    console.log("PASS: registry can maintain process state")
    console.log(JSON.stringify({
      activeTopicId: reread.activeTopicId,
      topicId: reread.activeTopicId,
      round: reread.topics[reread.activeTopicId].round,
      historyLength: reread.topics[reread.activeTopicId].history.length,
      compactionCount: reread.topics[reread.activeTopicId].compaction.count,
      openQuestions: reread.topics[reread.activeTopicId].stateCard.openQuestions,
    }, null, 2))
  } finally {
    if (hadOriginal) {
      writeFileSync(registryPath, original, "utf8")
    }
  }
}

main()
