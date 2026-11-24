"""
Policy-Wrapped Operational Tools for SentinelOps AI.
"""
import uuid
import time
from typing import Dict, Any, List, Optional
from backend.security.rbac import RBACPolicyEngine, ToolName
from backend.security.redactor import redact_payload
from backend.security.sanitizer import sanitize_agent_input_data
from backend.simulator.scenarios import SCENARIOS
from backend.database import log_audit_event, save_remediation_proposal, update_remediation_status


def get_logs_for_service(service_name: str) -> List[Dict[str, Any]]:
    matching_logs = []
    for sc in SCENARIOS.values():
        if sc.get("service") == service_name:
            matching_logs.extend(sc.get("logs", []))
    if not matching_logs:
        matching_logs = [
            {
                "id": f"LOG-SYN-{service_name}-1",
                "timestamp": "2026-11-24T12:00:00Z",
                "level": "INFO",
                "service": service_name,
                "message": f"Service {service_name} operational health check OK. Contact: ops@{service_name}.internal",
            }
        ]
    return matching_logs


def query_service_logs(
    service_name: str,
    query: str = "",
    limit: int = 10,
    role: str = "oncall_l1",
    run_id: Optional[str] = None,
    scenario_id: Optional[str] = None,
) -> Dict[str, Any]:
    t0 = time.time()
    params = {"service_name": service_name, "query": query, "limit": limit}

    allowed, rbac_reason, requires_masking = RBACPolicyEngine.check_tool_permission(
        role, ToolName.QUERY_SERVICE_LOGS.value, params
    )

    if not allowed:
        log_audit_event(
            role=role,
            tool_name=ToolName.QUERY_SERVICE_LOGS.value,
            decision="DENY",
            parameters=params,
            reason=rbac_reason,
            run_id=run_id,
        )
        return {
            "status": "DENIED",
            "decision": "DENY",
            "code": 403,
            "error": rbac_reason,
            "service_name": service_name,
            "logs": [],
            "latency_ms": round((time.time() - t0) * 1000, 2),
        }

    raw_logs = []
    if scenario_id and scenario_id in SCENARIOS:
        sc = SCENARIOS[scenario_id]
        if sc.get("service") == service_name:
            raw_logs = list(sc.get("logs", []))
    if not raw_logs:
        raw_logs = get_logs_for_service(service_name)

    if query:
        q_lower = query.lower()
        filtered = [l for l in raw_logs if q_lower in l.get("message", "").lower() or q_lower in l.get("level", "").lower()]
        if filtered:
            raw_logs = filtered

    raw_logs = raw_logs[:limit]

    sanitized_logs, defense_summary = sanitize_agent_input_data(raw_logs)
    redacted_logs, redaction_counts = redact_payload(sanitized_logs, requires_masking=requires_masking)
    decision = "ALLOW_MASKED" if requires_masking else "ALLOW"

    log_audit_event(
        role=role,
        tool_name=ToolName.QUERY_SERVICE_LOGS.value,
        decision=decision,
        parameters=params,
        reason=rbac_reason,
        run_id=run_id,
        redactions_count=redaction_counts.get("total", 0),
        redactions_detail=redaction_counts,
        injection_neutralized=defense_summary.get("injections_neutralized_count", 0) > 0,
    )

    return {
        "status": "ALLOWED",
        "decision": decision,
        "requires_masking": requires_masking,
        "service_name": service_name,
        "redactions": redaction_counts,
        "injection_defense": defense_summary,
        "logs": redacted_logs,
        "latency_ms": round((time.time() - t0) * 1000, 2),
    }


def query_metrics(
    service_name: str,
    metric_name: str = "",
    role: str = "oncall_l1",
    run_id: Optional[str] = None,
    scenario_id: Optional[str] = None,
) -> Dict[str, Any]:
    t0 = time.time()
    params = {"service_name": service_name, "metric_name": metric_name}

    allowed, rbac_reason, _ = RBACPolicyEngine.check_tool_permission(
        role, ToolName.QUERY_METRICS.value, params
    )

    if not allowed:
        log_audit_event(
            role=role,
            tool_name=ToolName.QUERY_METRICS.value,
            decision="DENY",
            parameters=params,
            reason=rbac_reason,
            run_id=run_id,
        )
        return {
            "status": "DENIED",
            "decision": "DENY",
            "code": 403,
            "error": rbac_reason,
            "service_name": service_name,
            "metrics": {},
            "latency_ms": round((time.time() - t0) * 1000, 2),
        }

    metrics_data = {}
    if scenario_id and scenario_id in SCENARIOS:
        sc = SCENARIOS[scenario_id]
        if sc.get("service") == service_name:
            metrics_data = sc.get("metrics", {})
    if not metrics_data:
        metrics_data = {
            "cpu_utilization_pct": 45.2,
            "memory_usage_pct": 52.8,
            "p95_latency_ms": 120,
            "requests_per_sec": 850,
        }

    log_audit_event(
        role=role,
        tool_name=ToolName.QUERY_METRICS.value,
        decision="ALLOW",
        parameters=params,
        reason=rbac_reason,
        run_id=run_id,
    )

    return {
        "status": "ALLOWED",
        "decision": "ALLOW",
        "service_name": service_name,
        "metrics": metrics_data,
        "latency_ms": round((time.time() - t0) * 1000, 2),
    }


def get_recent_deployments(
    service_name: str,
    role: str = "oncall_l1",
    run_id: Optional[str] = None,
    scenario_id: Optional[str] = None,
) -> Dict[str, Any]:
    t0 = time.time()
    params = {"service_name": service_name}

    allowed, rbac_reason, _ = RBACPolicyEngine.check_tool_permission(
        role, ToolName.GET_RECENT_DEPLOYMENTS.value, params
    )

    if not allowed:
        log_audit_event(
            role=role,
            tool_name=ToolName.GET_RECENT_DEPLOYMENTS.value,
            decision="DENY",
            parameters=params,
            reason=rbac_reason,
            run_id=run_id,
        )
        return {
            "status": "DENIED",
            "decision": "DENY",
            "code": 403,
            "error": rbac_reason,
            "deployments": [],
            "latency_ms": round((time.time() - t0) * 1000, 2),
        }

    deploys = []
    if scenario_id and scenario_id in SCENARIOS:
        sc = SCENARIOS[scenario_id]
        if sc.get("service") == service_name:
            deploys = sc.get("deployments", [])
    if not deploys:
        deploys = [
            {
                "deploy_id": f"DEP-BASE-{service_name}",
                "service": service_name,
                "version": "v1.0.0",
                "deployed_at": "2026-11-20T00:00:00Z",
                "deployed_by": "system",
                "changelog": "Baseline deployment",
            }
        ]

    log_audit_event(
        role=role,
        tool_name=ToolName.GET_RECENT_DEPLOYMENTS.value,
        decision="ALLOW",
        parameters=params,
        reason=rbac_reason,
        run_id=run_id,
    )

    return {
        "status": "ALLOWED",
        "decision": "ALLOW",
        "service_name": service_name,
        "deployments": deploys,
        "latency_ms": round((time.time() - t0) * 1000, 2),
    }


def search_runbooks(
    query: str,
    service_name: str = "",
    role: str = "oncall_l1",
    run_id: Optional[str] = None,
    scenario_id: Optional[str] = None,
) -> Dict[str, Any]:
    t0 = time.time()
    params = {"query": query, "service_name": service_name}

    allowed, rbac_reason, _ = RBACPolicyEngine.check_tool_permission(
        role, ToolName.SEARCH_RUNBOOKS.value, params
    )

    if not allowed:
        log_audit_event(
            role=role,
            tool_name=ToolName.SEARCH_RUNBOOKS.value,
            decision="DENY",
            parameters=params,
            reason=rbac_reason,
            run_id=run_id,
        )
        return {
            "status": "DENIED",
            "decision": "DENY",
            "code": 403,
            "error": rbac_reason,
            "runbooks": [],
            "latency_ms": round((time.time() - t0) * 1000, 2),
        }

    runbooks = []
    if scenario_id and scenario_id in SCENARIOS:
        sc = SCENARIOS[scenario_id]
        runbooks.extend(sc.get("runbooks", []))
    else:
        for sc in SCENARIOS.values():
            if not service_name or sc.get("service") == service_name:
                runbooks.extend(sc.get("runbooks", []))

    log_audit_event(
        role=role,
        tool_name=ToolName.SEARCH_RUNBOOKS.value,
        decision="ALLOW",
        parameters=params,
        reason=rbac_reason,
        run_id=run_id,
    )

    return {
        "status": "ALLOWED",
        "decision": "ALLOW",
        "query": query,
        "runbooks": runbooks,
        "latency_ms": round((time.time() - t0) * 1000, 2),
    }


def propose_remediation(
    action_type: str,
    target_service: str,
    target_version: Optional[str],
    reason: str,
    blast_radius: str,
    role: str = "oncall_l1",
    run_id: Optional[str] = None,
    incident_id: str = "INC-UNKNOWN",
) -> Dict[str, Any]:
    t0 = time.time()
    params = {
        "action_type": action_type,
        "target_service": target_service,
        "target_version": target_version,
        "reason": reason,
        "blast_radius": blast_radius,
    }

    allowed, rbac_reason, _ = RBACPolicyEngine.check_tool_permission(
        role, ToolName.PROPOSE_REMEDIATION.value, params
    )

    if not allowed:
        log_audit_event(
            role=role,
            tool_name=ToolName.PROPOSE_REMEDIATION.value,
            decision="DENY",
            parameters=params,
            reason=rbac_reason,
            run_id=run_id,
        )
        return {
            "status": "DENIED",
            "decision": "DENY",
            "code": 403,
            "error": rbac_reason,
            "remediation": None,
            "latency_ms": round((time.time() - t0) * 1000, 2),
        }

    rem_id = f"REM-{uuid.uuid4().hex[:8].upper()}"
    proposal = save_remediation_proposal(
        remediation_id=rem_id,
        run_id=run_id or "RUN-DIRECT",
        incident_id=incident_id,
        action_type=action_type,
        target_service=target_service,
        target_version=target_version,
        reason=reason,
        blast_radius=blast_radius,
        requested_by_role=role,
    )

    log_audit_event(
        role=role,
        tool_name=ToolName.PROPOSE_REMEDIATION.value,
        decision="ALLOW",
        parameters=params,
        reason="Remediation proposal queued for Human-in-the-Loop review",
        run_id=run_id,
    )

    return {
        "status": "ALLOWED",
        "decision": "ALLOW",
        "remediation_id": rem_id,
        "proposal": proposal,
        "latency_ms": round((time.time() - t0) * 1000, 2),
    }


def execute_remediation(
    remediation_id: str,
    action_type: str,
    executed_by_role: str,
    decision: str = "APPROVE",
) -> Dict[str, Any]:
    t0 = time.time()
    params = {"remediation_id": remediation_id, "action_type": action_type, "decision": decision}

    if decision.upper() == "REJECT":
        updated = update_remediation_status(
            remediation_id=remediation_id,
            status="REJECTED",
            reviewed_by_role=executed_by_role,
            execution_output=f"Rejected by Human Operator under role '{executed_by_role}'.",
        )
        log_audit_event(
            role=executed_by_role,
            tool_name=ToolName.EXECUTE_REMEDIATION.value,
            decision="ALLOW",
            parameters=params,
            reason="Remediation proposal rejected by operator.",
        )
        return {
            "status": "SUCCESS",
            "decision": "REJECTED",
            "remediation": updated,
            "message": f"Remediation {remediation_id} rejected.",
            "latency_ms": round((time.time() - t0) * 1000, 2),
        }

    allowed, rbac_reason = RBACPolicyEngine.can_approve_remediation(executed_by_role, action_type)
    if not allowed:
        log_audit_event(
            role=executed_by_role,
            tool_name=ToolName.EXECUTE_REMEDIATION.value,
            decision="DENY",
            parameters=params,
            reason=rbac_reason,
        )
        return {
            "status": "DENIED",
            "decision": "DENY",
            "code": 403,
            "error": rbac_reason,
            "remediation_id": remediation_id,
            "latency_ms": round((time.time() - t0) * 1000, 2),
        }

    exec_output = f"Remediation '{action_type}' successfully applied by {executed_by_role}. Production state reconciled."
    updated = update_remediation_status(
        remediation_id=remediation_id,
        status="EXECUTED",
        reviewed_by_role=executed_by_role,
        execution_output=exec_output,
    )

    log_audit_event(
        role=executed_by_role,
        tool_name=ToolName.EXECUTE_REMEDIATION.value,
        decision="ALLOW",
        parameters=params,
        reason=f"Authorized production execution: {rbac_reason}",
    )

    return {
        "status": "SUCCESS",
        "decision": "EXECUTED",
        "remediation": updated,
        "execution_output": exec_output,
        "latency_ms": round((time.time() - t0) * 1000, 2),
    }
