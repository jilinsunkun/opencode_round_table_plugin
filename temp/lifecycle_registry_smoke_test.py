from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(r"C:\Users\Administrator\.cc-switch\skills\brainstorm-environment-setup")
REGISTRY_PATH = ROOT / ".opencode" / "brainstorm" / "registry.json"


def now_text(i: int) -> str:
    return f"2026-06-01T00:0{i}:00.000Z"


def default_state_card(question: str = "") -> dict:
    return {
        "currentQuestion": question,
        "currentMainProposal": "",
        "rejectedProposals": [],
        "keyConflicts": [],
        "openQuestions": [],
        "nextRoundQuestions": [],
    }


def make_topic() -> dict:
    return {
        "topicId": "topic_lifecycle_001",
        "title": "模拟启动路径：生命周期更新 registry",
        "status": "active",
        "createdAt": now_text(0),
        "updatedAt": now_text(0),
        "round": 1,
        "roles": {
            "host": {"roleName": "brainstorm-host", "sessionId": None, "status": "pending", "turnCount": 0, "lastSeededAt": None},
            "diverger": {"roleName": "brainstorm-diverger", "sessionId": None, "status": "pending", "turnCount": 0, "lastSeededAt": None},
            "critic": {"roleName": "brainstorm-critic", "sessionId": None, "status": "pending", "turnCount": 0, "lastSeededAt": None},
            "engineer": {"roleName": "brainstorm-engineer", "sessionId": None, "status": "pending", "turnCount": 0, "lastSeededAt": None},
            "researcher": {"roleName": "brainstorm-researcher", "sessionId": None, "status": "pending", "turnCount": 0, "lastSeededAt": None},
        },
        "stateCard": default_state_card("模拟启动路径：生命周期更新 registry"),
        "history": [],
        "compaction": {"count": 0, "lastCompactedAt": None},
        "locks": {"roleBindingLock": True, "sessionBindingLock": True},
    }


def read_registry() -> dict:
    return json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))


def write_registry(data: dict) -> None:
    REGISTRY_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> None:
    original = REGISTRY_PATH.read_text(encoding="utf-8") if REGISTRY_PATH.exists() else None

    try:
        registry = {
            "version": "1.0",
            "activeTopicId": None,
            "bootstrappingTopicId": None,
            "topics": {},
        }
        topic_id = "topic_lifecycle_001"
        topic = make_topic()
        registry["bootstrappingTopicId"] = topic_id
        registry["topics"][topic_id] = topic
        write_registry(registry)

        # command.execute.before: seed roles + update prompt payload state
        topic["roles"]["host"]["sessionId"] = "session-host"
        topic["roles"]["diverger"]["sessionId"] = "session-diverger"
        topic["roles"]["critic"]["sessionId"] = "session-critic"
        topic["roles"]["engineer"]["sessionId"] = "session-engineer"
        topic["roles"]["researcher"]["sessionId"] = "session-researcher"
        topic["roles"]["host"]["status"] = "alive"
        topic["roles"]["diverger"]["status"] = "alive"
        topic["roles"]["critic"]["status"] = "alive"
        topic["roles"]["engineer"]["status"] = "alive"
        topic["roles"]["researcher"]["status"] = "alive"
        topic["roles"]["host"]["turnCount"] = 1
        topic["roles"]["diverger"]["turnCount"] = 1
        topic["roles"]["critic"]["turnCount"] = 1
        topic["roles"]["engineer"]["turnCount"] = 1
        topic["roles"]["researcher"]["turnCount"] = 1
        topic["roles"]["host"]["lastSeededAt"] = now_text(1)
        topic["roles"]["diverger"]["lastSeededAt"] = now_text(1)
        topic["roles"]["critic"]["lastSeededAt"] = now_text(1)
        topic["roles"]["engineer"]["lastSeededAt"] = now_text(1)
        topic["roles"]["researcher"]["lastSeededAt"] = now_text(1)
        topic["stateCard"]["currentMainProposal"] = "把 registry 作为运行时状态源"
        topic["stateCard"]["openQuestions"] = ["恢复能力是否可验证？"]
        topic["stateCard"]["nextRoundQuestions"] = ["下一轮是否需要压缩？"]
        topic["updatedAt"] = now_text(1)
        registry["activeTopicId"] = topic_id
        registry["bootstrappingTopicId"] = topic_id
        write_registry(registry)

        after_command = read_registry()

        # session.created: write history snapshot
        topic = registry["topics"][topic_id]
        topic["history"].append(
            {
                "round": topic["round"],
                "summary": "session.created 触发，准备进入固定角色圆桌",
                "stateCardSnapshot": topic["stateCard"].copy(),
            }
        )
        topic["updatedAt"] = now_text(2)
        write_registry(registry)
        after_session_created = read_registry()

        # session.compacted: compact and clean
        topic = registry["topics"][topic_id]
        topic["compaction"]["count"] += 1
        topic["compaction"]["lastCompactedAt"] = now_text(3)
        topic["stateCard"]["openQuestions"] = list(dict.fromkeys(topic["stateCard"]["openQuestions"]))
        topic["updatedAt"] = now_text(3)
        registry["bootstrappingTopicId"] = None
        write_registry(registry)
        after_compaction = read_registry()

        checks = {
            "activeTopicId_set": after_compaction["activeTopicId"] == topic_id,
            "bootstrapping_cleared": after_compaction["bootstrappingTopicId"] is None,
            "history_written": len(after_session_created["topics"][topic_id]["history"]) == 1,
            "roles_seeded": all(after_command["topics"][topic_id]["roles"][role]["sessionId"] for role in ["host", "diverger", "critic", "engineer", "researcher"]),
            "compaction_incremented": after_compaction["topics"][topic_id]["compaction"]["count"] == 1,
            "statecard_updated": after_command["topics"][topic_id]["stateCard"]["currentMainProposal"] == "把 registry 作为运行时状态源",
        }

        assert_true(all(checks.values()), f"checks failed: {checks}")

        print("PASS: lifecycle simulation updated registry")
        print(json.dumps(
            {
                "checks": checks,
                "final": {
                    "activeTopicId": after_compaction["activeTopicId"],
                    "bootstrappingTopicId": after_compaction["bootstrappingTopicId"],
                    "round": after_compaction["topics"][topic_id]["round"],
                    "historyLength": len(after_compaction["topics"][topic_id]["history"]),
                    "compactionCount": after_compaction["topics"][topic_id]["compaction"]["count"],
                    "openQuestions": after_compaction["topics"][topic_id]["stateCard"]["openQuestions"],
                },
            },
            ensure_ascii=False,
            indent=2,
        ))
    finally:
        if original is not None:
            REGISTRY_PATH.write_text(original, encoding="utf-8")


if __name__ == "__main__":
    main()
