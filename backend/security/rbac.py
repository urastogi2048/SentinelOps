"""
Deterministic RBAC Engine for SentinelOps AI.
Enforces role-based permissions strictly in code before any tool execution.
"""
from typing import Dict, Any, Tuple, List, Optional
from enum import Enum


class Role(str, Enum):
    ONCALL_L1 = "oncall_l1"
    SRE_LEAD = "sre_lead"
    DB_ADMIN = "db_admin"
    SECURITY_AUDITOR = "security_auditor"


class ToolName(str, Enum):
    QUERY_SERVICE_LOGS = "query_service_logs"
    QUERY_METRICS = "query_metrics"
    GET_RECENT_DEPLOYMENTS = "get_recent_deployments"
    SEARCH_RUNBOOKS = "search_runbooks"
    PROPOSE_REMEDIATION = "propose_remediation"
    EXECUTE_REMEDIATION = "execute_remediation"


class RemediationAction(str, Enum):
    ROLLBACK_DEPLOYMENT = "rollback_deployment"
    RESTART_SERVICE = "restart_service"
    SCALE_DB_POOL = "scale_db_pool"


ROLE_METADATA = {
    Role.ONCALL_L1: {
        "title": "On-Call L1 Engineer",
        "description": "First-line responder. Masked logs for order-worker only; restricted from auth & payment; cannot execute remediations.",
        "allowed_log_services": ["order-worker"],
        "restricted_log_services": ["auth-service", "payment-gateway", "postgres-primary"],
        "can_execute_remediation": False,
        "requires_masking": True,
        "allowed_remediation_types": [],
        "badge_color": "blue",
    },
    Role.SRE_LEAD: {
        "title": "Site Reliability Lead",
        "description": "Full access to all service logs unmasked, metrics, runbooks; can approve and execute rollback and restart remediations.",
        "allowed_log_services": ["order-worker", "auth-service", "payment-gateway", "postgres-primary", "notification-service"],
        "restricted_log_services": [],
        "can_execute_remediation": True,
        "requires_masking": False,
        "allowed_remediation_types": [RemediationAction.ROLLBACK_DEPLOYMENT, RemediationAction.RESTART_SERVICE],
        "badge_color": "emerald",
    },
    Role.DB_ADMIN: {
        "title": "Database Administrator",
        "description": "Full access to database metrics and postgres logs; masked access to app logs; can approve and execute scale_db_pool.",
        "allowed_log_services": ["postgres-primary", "order-worker"],
        "restricted_log_services": ["auth-service", "payment-gateway"],
        "can_execute_remediation": True,
        "requires_masking": True,
        "allowed_remediation_types": [RemediationAction.SCALE_DB_POOL],
        "badge_color": "purple",
    },
    Role.SECURITY_AUDITOR: {
        "title": "Security & Compliance Auditor",
        "description": "Read-only access to masked logs across all services and full audit trail; strictly prohibited from executing write/remediations.",
        "allowed_log_services": ["order-worker", "auth-service", "payment-gateway", "postgres-primary", "notification-service"],
        "restricted_log_services": [],
        "can_execute_remediation": False,
        "requires_masking": True,
        "allowed_remediation_types": [],
        "badge_color": "amber",
    },
}


class RBACPolicyEngine:
    @staticmethod
    def get_role_info(role: str) -> Dict[str, Any]:
        try:
            r = Role(role)
            return ROLE_METADATA[r]
        except ValueError:
            return {
                "title": "Unknown Role",
                "description": "Unrecognized system role",
                "allowed_log_services": [],
                "restricted_log_services": ["*"],
                "can_execute_remediation": False,
                "requires_masking": True,
                "allowed_remediation_types": [],
                "badge_color": "gray",
            }

    @staticmethod
    def check_tool_permission(
        role: str, tool_name: str, params: Optional[Dict[str, Any]] = None
    ) -> Tuple[bool, str, bool]:
        params = params or {}
        try:
            r = Role(role)
        except ValueError:
            return False, f"RBAC DENIAL: Unrecognized role '{role}'", True

        role_info = ROLE_METADATA[r]

        if tool_name == ToolName.QUERY_SERVICE_LOGS.value:
            target_service = params.get("service_name", "").strip().lower()
            if not target_service:
                return False, "RBAC DENIAL: 'service_name' parameter is required for log queries", True

            if r == Role.ONCALL_L1:
                if target_service != "order-worker":
                    return (
                        False,
                        f"RBAC POLICY 403: Role 'oncall_l1' is forbidden from accessing restricted service logs for '{target_service}'. Allowed: ['order-worker'].",
                        True,
                    )
                return True, "RBAC ALLOW: Log access granted (masking enforced)", True

            if r == Role.DB_ADMIN:
                if target_service in ["auth-service", "payment-gateway"]:
                    return (
                        False,
                        f"RBAC POLICY 403: Role 'db_admin' lacks security clearance for customer authentication and payment logs ('{target_service}').",
                        True,
                    )
                requires_masking = target_service != "postgres-primary"
                return (
                    True,
                    f"RBAC ALLOW: Log query permitted for '{target_service}' (masking={'yes' if requires_masking else 'no'})",
                    requires_masking,
                )

            if r == Role.SECURITY_AUDITOR:
                return True, f"RBAC ALLOW: Security Auditor audit-read permitted for '{target_service}' (masked)", True

            if r == Role.SRE_LEAD:
                return True, f"RBAC ALLOW: Full unmasked log access granted for '{target_service}'", False

        if tool_name == ToolName.QUERY_METRICS.value:
            target_service = params.get("service_name", "").strip().lower()
            if r == Role.ONCALL_L1 and target_service == "payment-gateway":
                return (
                    False,
                    "RBAC POLICY 403: Role 'oncall_l1' cannot query restricted payment telemetry metrics.",
                    False,
                )
            return True, f"RBAC ALLOW: Metrics telemetry read permitted for '{target_service}'", False

        if tool_name == ToolName.GET_RECENT_DEPLOYMENTS.value:
            return True, "RBAC ALLOW: Deployment history read permitted", False

        if tool_name == ToolName.SEARCH_RUNBOOKS.value:
            return True, "RBAC ALLOW: Runbook catalog read permitted", False

        if tool_name == ToolName.PROPOSE_REMEDIATION.value:
            if r == Role.SECURITY_AUDITOR:
                return (
                    False,
                    "RBAC POLICY 403: Security Auditor role is strictly non-operational / read-only and cannot propose remediation plans.",
                    True,
                )
            return True, "RBAC ALLOW: Remediation proposal submitted for Human-in-the-Loop review", False

        if tool_name == ToolName.EXECUTE_REMEDIATION.value:
            action_type = params.get("action_type", "")
            return RBACPolicyEngine.can_approve_remediation(role, action_type)

        return False, f"RBAC DENIAL: Unknown tool '{tool_name}'", True

    @staticmethod
    def can_approve_remediation(role: str, action_type: str) -> Tuple[bool, str]:
        try:
            r = Role(role)
        except ValueError:
            return False, f"RBAC DENIAL: Unknown role '{role}'"

        role_info = ROLE_METADATA[r]

        if not role_info["can_execute_remediation"]:
            return (
                False,
                f"RBAC POLICY 403: Role '{role}' does NOT have write / execution privileges in production. Remediations require SRE Lead or DB Admin authorization.",
            )

        allowed_actions = [a.value for a in role_info["allowed_remediation_types"]]
        if action_type not in allowed_actions:
            return (
                False,
                f"RBAC POLICY 403: Role '{role}' is not authorized to execute '{action_type}'. Authorized actions: {allowed_actions}.",
            )

        return True, f"RBAC APPROVAL GRANTED: Role '{role}' authorized to execute '{action_type}'."
