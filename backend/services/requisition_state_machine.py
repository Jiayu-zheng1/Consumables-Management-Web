"""请购审批状态机 — 集中管理所有状态转换规则

状态:
  pending_section  → 待课级审批
  pending_department → 待部级审批
  closed           → 已结案（审批通过，可快捷入库）
  rejected         → 已拒绝（可重新提交）
  fulfilled        → 已入库（终态）

事件:
  submit            → 员工提交请购
  section_approve   → 课级审批通过
  section_reject    → 课级审批拒绝
  department_approve → 部级审批通过
  department_reject  → 部级审批拒绝
  admin_approve     → 管理员审批通过（跨级审批）
  admin_reject      → 管理员审批拒绝
  resubmit          → 被拒后重新提交
  quick_inbound     → 快捷入库
"""

from enum import StrEnum


class ReqState(StrEnum):
    PENDING_SECTION = "pending_section"
    PENDING_DEPARTMENT = "pending_department"
    CLOSED = "closed"
    REJECTED = "rejected"
    FULFILLED = "fulfilled"


class ReqEvent(StrEnum):
    SUBMIT = "submit"
    SECTION_APPROVE = "section_approve"
    SECTION_REJECT = "section_reject"
    DEPARTMENT_APPROVE = "department_approve"
    DEPARTMENT_REJECT = "department_reject"
    ADMIN_APPROVE = "admin_approve"
    ADMIN_REJECT = "admin_reject"
    RESUBMIT = "resubmit"
    QUICK_INBOUND = "quick_inbound"


# 状态 → 事件 → 目标状态
TRANSITIONS: dict[ReqState, dict[ReqEvent, ReqState]] = {
    ReqState.PENDING_SECTION: {
        ReqEvent.SECTION_APPROVE: ReqState.PENDING_DEPARTMENT,
        ReqEvent.SECTION_REJECT: ReqState.REJECTED,
        ReqEvent.DEPARTMENT_APPROVE: ReqState.CLOSED,
        ReqEvent.DEPARTMENT_REJECT: ReqState.REJECTED,
        ReqEvent.ADMIN_APPROVE: ReqState.CLOSED,
        ReqEvent.ADMIN_REJECT: ReqState.REJECTED,
    },
    ReqState.PENDING_DEPARTMENT: {
        ReqEvent.DEPARTMENT_APPROVE: ReqState.CLOSED,
        ReqEvent.DEPARTMENT_REJECT: ReqState.REJECTED,
        ReqEvent.ADMIN_APPROVE: ReqState.CLOSED,
        ReqEvent.ADMIN_REJECT: ReqState.REJECTED,
    },
    ReqState.REJECTED: {
        ReqEvent.RESUBMIT: ReqState.PENDING_SECTION,
    },
    ReqState.CLOSED: {
        ReqEvent.QUICK_INBOUND: ReqState.FULFILLED,
    },
    ReqState.FULFILLED: {
        # 终态，无有效事件
    },
}

STATUS_LABELS: dict[ReqState, str] = {
    ReqState.PENDING_SECTION: "待课级审批",
    ReqState.PENDING_DEPARTMENT: "待部级审批",
    ReqState.CLOSED: "已结案",
    ReqState.REJECTED: "已拒绝",
    ReqState.FULFILLED: "已入库",
}


# 虚拟初态：新请购单尚未存在时的起点
_INITIAL_STATE = "_new"
_INITIAL_TRANSITIONS = {ReqEvent.SUBMIT: ReqState.PENDING_SECTION}


def transition(current: str, event: str) -> str:
    """执行状态转换，返回新状态。非法转换抛出 ValueError。

    current="_new" 时表示新建请购单（尚未持久化的虚拟初态），仅接受 submit 事件。
    """
    # 虚拟初态特殊处理
    if current == _INITIAL_STATE:
        try:
            evt = ReqEvent(event)
        except ValueError:
            raise ValueError(f"无效事件「{event}」，新建请购仅接受 submit 事件")
        next_state = _INITIAL_TRANSITIONS.get(evt)
        if next_state is None:
            raise ValueError(f"非法的状态转换: _new → {event}（新建请购仅接受 submit 事件）")
        return next_state.value

    try:
        state = ReqState(current)
        evt = ReqEvent(event)
    except ValueError:
        valid_states = [s.value for s in ReqState]
        valid_events = [e.value for e in ReqEvent]
        raise ValueError(f"无效的状态「{current}」或事件「{event}」。有效状态: {valid_states}，有效事件: {valid_events}")

    next_state = TRANSITIONS.get(state, {}).get(evt)
    if next_state is None:
        raise ValueError(f"非法的状态转换: {current} → {event}（该事件在当前状态下不允许）")
    return next_state.value


def can_transition(current: str, event: str) -> bool:
    """检查是否可以从 current 状态执行 event 事件。current="_new" 表示新建请购。"""
    try:
        transition(current, event)
        return True
    except ValueError:
        return False


def allowed_events(current: str) -> list[str]:
    """返回当前状态下允许的事件列表"""
    try:
        state = ReqState(current)
    except ValueError:
        if current == _INITIAL_STATE:
            return [e.value for e in _INITIAL_TRANSITIONS]
        return []
    return [e.value for e in TRANSITIONS.get(state, {})]
