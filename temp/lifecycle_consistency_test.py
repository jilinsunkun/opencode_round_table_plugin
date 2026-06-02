from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path


ROOT = Path(r"C:\Users\Administrator\.cc-switch\skills\brainstorm-environment-setup")
REGISTRY_PATH = ROOT / ".opencode" / "brainstorm" / "registry.json"
STATE_CARD_PATH = ROOT / ".opencode" / "brainstorm" / "state-card.md"


def ts(n: int) -> str:
    return f"2026-06-01T00:0{n}:00.000Z"


def default_state_card(question: str = "") -> dict:
    return {
        "currentQuestion": question,
        "currentMainProposal": "",
        "rejectedProposals": [],
        "keyConflicts": [],
        "openQuestions": [],
        "nextRoundQuestions": [],
    }


def make_registry() -> dict:
    topic_id = "topic_consistency_001"
    topic = {
        "topicId": topic_id,
        "title": "生命周期一致性测试",
        "status": "active",
        "createdAt": ts(0),
        "updatedAt": ts(0),
        "round": 1,
        "roles": {
            "host": {"roleName": "brainstorm-host", "sessionId": None, "status": "pending", "turnCount": 0, "lastSeededAt": None},
            "diverger": {"roleName": "brainstorm-diverger", "sessionId": None, "status": "pending", "turnCount": 0, "lastSeededAt": None},
            "critic": {"roleName": "brainstorm-critic", "sessionId": None, "status": "pending", "turnCount": 0, "lastSeededAt": None},
            "engineer": {"roleName": "brainstorm-engineer", "sessionId": None, "status": "pending", "turnCount": 0, "lastSeededAt": None},
            "researcher": {"roleName": "brainstorm-researcher", "sessionId": None, "status": "pending", "turnCount": 0, "lastSeededAt": None},
        },
        "stateCard": default_state_card("生命周期一致性测试：registry 是否在各阶段自洽？"),
        "history": [],
        "compaction": {"count": 0, "lastCompactedAt": None},
        "locks": {"roleBindingLock": True, "sessionBindingLock": True},
    }
    return {
        "version": "1.0",
        "activeTopicId": None,
        "bootstrappingTopicId": None,
        "topics": {topic_id: topic},
    }


def snapshot(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_registry(data: dict) -> None:
    REGISTRY_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def write_state_card(topic: dict) -> None:
    lines = [
        "# 状态卡",
        "",
        "> 由插件生成，禁止手工维护；格式受 `.opencode/brainstorm/state-card-rules.md` 约束。",
        "",
        f"> 当前议题 ID：{topic['topicId']}",
        "",
        "## 当前问题",
        topic["stateCard"]["currentQuestion"],
        "",
        "## 当前主方案",
        topic["stateCard"]["currentMainProposal"],
        "",
        "## 已否决方案",
        "-" if not topic["stateCard"]["rejectedProposals"] else "\n".join(f"- {x}" for x in topic["stateCard"]["rejectedProposals"]),
        "",
        "## 关键争议",
        "-" if not topic["stateCard"]["keyConflicts"] else "\n".join(f"- {x}" for x in topic["stateCard"]["keyConflicts"]),
        "",
        "## 仍待验证点",
        "-" if not topic["stateCard"]["openQuestions"] else "\n".join(f"- {x}" for x in topic["stateCard"]["openQuestions"]),
        "",
        "## 下一轮需要回答的问题",
        "-" if not topic["stateCard"]["nextRoundQuestions"] else "\n".join(f"- {x}" for x in topic["stateCard"]["nextRoundQuestions"]),
        "",
    ]
    STATE_CARD_PATH.write_text("\n".join(lines), encoding="utf-8")


def assert_true(cond: bool, msg: str) -> None:
    if not cond:
        raise AssertionError(msg)


def check_consistency(registry: dict, expected_topic_id: str, stage: str) -> None:
    topic = registry["topics"].get(expected_topic_id)
    assert_true(topic is not None, f"[{stage}] active topic missing")
    assert_true(registry["activeTopicId"] == expected_topic_id, f"[{stage}] activeTopicId mismatch")
    assert_true(topic["roles"]["host"]["roleName"] == "brainstorm-host", f"[{stage}] role contract broken")
    assert_true(all(topic["roles"][role]["sessionId"] for role in ["host", "diverger", "critic", "engineer", "researcher"]), f"[{stage}] sessions not seeded")
    assert_true(topic["stateCard"]["currentQuestion"].startswith("生命周期一致性测试"), f"[{stage}] currentQuestion drift")
    assert_true(topic["compaction"]["count"] >= 0, f"[{stage}] compaction count invalid")


def main() -> None:
    original_registry = REGISTRY_PATH.read_text(encoding="utf-8") if REGISTRY_PATH.exists() else None
    original_state_card = STATE_CARD_PATH.read_text(encoding="utf-8") if STATE_CARD_PATH.exists() else None

    try:
        registry = make_registry()
        topic_id = "topic_consistency_001"

        # Stage 1: bootstrap / command.execute.before-like start
        registry["bootstrappingTopicId"] = topic_id
        registry["activeTopicId"] = topic_id
        topic = registry["topics"][topic_id]
        for role in topic["roles"].values():
            role["sessionId"] = f"session-{role['roleName']}"
            role["status"] = "alive"
            role["turnCount"] = 1
            role["lastSeededAt"] = ts(1)
        topic["stateCard"]["currentMainProposal"] = "registry 负责运行态，state-card 负责可读快照"
        topic["stateCard"]["openQuestions"] = ["中断后是否可恢复？"]
        topic["stateCard"]["nextRoundQuestions"] = ["是否需要压缩？"]
        topic["updatedAt"] = ts(1)
        write_registry(registry)
        write_state_card(topic)
        stage1 = snapshot(REGISTRY_PATH)
        check_consistency(stage1, topic_id, "stage1")

        # Stage 2: session.created-like history capture
        topic = registry["topics"][topic_id]
        topic["history"].append(
            {
                "round": topic["round"],
                "summary": "session.created 触发，记录初始讨论快照",
                "stateCardSnapshot": deepcopy(topic["stateCard"]),
            }
        )
        topic["updatedAt"] = ts(2)
        write_registry(registry)
        write_state_card(topic)
        stage2 = snapshot(REGISTRY_PATH)
        assert_true(len(stage2["topics"][topic_id]["history"]) == 1, "[stage2] history should be 1")
        assert_true(stage2["topics"][topic_id]["history"][0]["stateCardSnapshot"]["currentMainProposal"] == "registry 负责运行态，state-card 负责可读快照", "[stage2] history snapshot drift")

        # Stage 3: session.compacted-like reconciliation
        topic = registry["topics"][topic_id]
        topic["compaction"]["count"] += 1
        topic["compaction"]["lastCompactedAt"] = ts(3)
        topic["stateCard"]["openQuestions"] = list(dict.fromkeys(topic["stateCard"]["openQuestions"]))
        registry["bootstrappingTopicId"] = None
        topic["updatedAt"] = ts(3)
        write_registry(registry)
        write_state_card(topic)
        stage3 = snapshot(REGISTRY_PATH)
        assert_true(stage3["bootstrappingTopicId"] is None, "[stage3] bootstrappingTopicId should clear")
        assert_true(stage3["topics"][topic_id]["compaction"]["count"] == 1, "[stage3] compaction count should be 1")

        # Stage 4: restart / recovery read
        recovered = snapshot(REGISTRY_PATH)
        check_consistency(recovered, topic_id, "stage4")
        assert_true(recovered["topics"][topic_id]["history"][0]["round"] == 1, "[stage4] history round should persist")
        assert_true(recovered["topics"][topic_id]["stateCard"]["currentMainProposal"] == "registry 负责运行态，state-card 负责可读快照", "[stage4] main proposal lost")
        assert_true("仍待验证点" in STATE_CARD_PATH.read_text(encoding="utf-8"), "[stage4] state-card artifact missing expected section")

        print("PASS: lifecycle consistency test")
        print(json.dumps(
            {
                "stages": {
                    "bootstrap": {
                        "activeTopicId": stage1["activeTopicId"],
                        "bootstrappingTopicId": stage1["bootstrappingTopicId"],
                    },
                    "history": {
                        "historyLength": len(stage2["topics"][topic_id]["history"]),
                    },
                    "compaction": {
                        "compactionCount": stage3["topics"][topic_id]["compaction"]["count"],
                        "bootstrappingTopicId": stage3["bootstrappingTopicId"],
                    },
                    "recovery": {
                        "activeTopicId": recovered["activeTopicId"],
                        "round": recovered["topics"][topic_id]["round"],
                        "historyLength": len(recovered["topics"][topic_id]["history"]),
                    },
                }
            },
            ensure_ascii=False,
            indent=2,
        ))
    finally:
        if original_registry is not None:
            REGISTRY_PATH.write_text(original_registry, encoding="utf-8")
        if original_state_card is not None:
            STATE_CARD_PATH.write_text(original_state_card, encoding="utf-8")


if __name__ == "__main__":
    main()
