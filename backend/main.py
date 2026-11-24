"""
FastAPI Server for SentinelOps AI.
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import os

from backend.security.rbac import Role, ROLE_METADATA
from backend.simulator.scenarios import SCENARIOS
from backend.agents.orchestrator import execute_incident_investigation, IncidentRunResult
from backend.simulator.tools import execute_remediation
from backend.database import init_db, get_audit_logs, get_remediation_queue, get_db
from backend.eval.benchmark import run_comprehensive_benchmark
from backend.agents.llm_client import get_active_llm_mode

init_db()

app = FastAPI(
    title="SentinelOps AI API",
    description="RBAC-Enforced Multi-Agent Incident Response & Log Triage Platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class InvestigateRequest(BaseModel):
    incident_id: str
    role: str = "oncall_l1"
    custom_title: Optional[str] = None
    custom_service: Optional[str] = None
    custom_description: Optional[str] = None


class RemediationReviewRequest(BaseModel):
    remediation_id: str
    action_type: str
    role: str
    decision: str = "APPROVE"


@app.get("/api/health")
def get_health():
    return {
        "status": "healthy",
        "policy_engine": "ENFORCED",
        "rbac_runtime": "CODE_DETERMINISTIC",
        "llm_mode": get_active_llm_mode(),
        "database": "SQLite (Persisted)",
    }


@app.get("/api/roles")
def get_roles():
    roles_list = []
    for role_enum in Role:
        meta = ROLE_METADATA[role_enum]
        roles_list.append({
            "role": role_enum.value,
            **meta,
        })
    return {"roles": roles_list}


@app.get("/api/scenarios")
def list_scenarios():
    items = []
    for sc_id, sc in SCENARIOS.items():
        items.append({
            "id": sc["id"],
            "title": sc["title"],
            "service": sc["service"],
            "severity": sc["severity"],
            "description": sc["description"],
            "symptoms": sc["symptoms"],
        })
    return {"scenarios": items}


@app.get("/api/scenarios/{scenario_id}")
def get_scenario_detail(scenario_id: str):
    if scenario_id not in SCENARIOS:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found.")
    return SCENARIOS[scenario_id]


@app.post("/api/investigate", response_model=IncidentRunResult)
def trigger_investigation(req: InvestigateRequest):
    custom_incident = None
    if req.custom_title:
        custom_incident = {
            "id": f"INC-CUSTOM-{req.custom_service or 'order-worker'}",
            "title": req.custom_title,
            "service": req.custom_service or "order-worker",
            "severity": "HIGH",
            "description": req.custom_description or "User-submitted production alert.",
            "symptoms": ["Anomalous metric threshold exceeded", "High error latency spike"],
        }

    run_result = execute_incident_investigation(
        incident_id=req.incident_id,
        role=req.role,
        custom_incident=custom_incident,
    )
    return run_result


@app.get("/api/remediations")
def get_remediations(status: Optional[str] = None):
    queue = get_remediation_queue(status=status)
    return {"remediations": queue}


@app.post("/api/remediations/review")
def review_remediation(req: RemediationReviewRequest):
    result = execute_remediation(
        remediation_id=req.remediation_id,
        action_type=req.action_type,
        executed_by_role=req.role,
        decision=req.decision,
    )
    if result.get("status") == "DENIED":
        raise HTTPException(status_code=403, detail=result.get("error"))
    return result


@app.get("/api/audit-logs")
def fetch_audit_logs(
    limit: int = Query(50, ge=1, le=500),
    role: Optional[str] = None,
    decision: Optional[str] = None,
):
    logs = get_audit_logs(limit=limit, role=role, decision=decision)
    return {"audit_logs": logs}


@app.post("/api/eval/run")
def run_eval():
    summary = run_comprehensive_benchmark()
    return summary


@app.get("/api/eval/latest")
def get_latest_eval():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM eval_runs ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    if not row:
        return run_comprehensive_benchmark()
    import json
    return {
        "eval_id": row["id"],
        "timestamp": row["timestamp"],
        "total_tests": row["total_tests"],
        "rca_accuracy_pct": row["rca_accuracy"],
        "rbac_compliance_pct": row["rbac_compliance_rate"],
        "pii_leakage_pct": row["pii_leakage_rate"],
        "injection_defense_pct": row["injection_defense_rate"],
        "avg_latency_ms": row["avg_latency_ms"],
        "matrix_results": json.loads(row["results_matrix"]),
    }


frontend_dist = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
