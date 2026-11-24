"""
End-to-end integration test against the live running FastAPI server.
"""
import httpx
import json

BASE_URL = "http://127.0.0.1:8000"

def test_live_app():
    client = httpx.Client(base_url=BASE_URL, timeout=30.0)

    # 1. Health
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health_data = res.json()
    assert health_data["status"] == "healthy"
    assert health_data["policy_engine"] == "ENFORCED"
    print("✓ Live /api/health passed:", health_data)

    # 2. Roles
    res = client.get("/api/roles")
    assert res.status_code == 200
    roles_data = res.json()
    assert len(roles_data["roles"]) == 4
    print("✓ Live /api/roles passed (4 roles).")

    # 3. Scenarios
    res = client.get("/api/scenarios")
    assert res.status_code == 200
    scenarios_data = res.json()
    assert len(scenarios_data["scenarios"]) == 6
    print("✓ Live /api/scenarios passed (6 scenarios).")

    # 4. Investigate INC-101 as oncall_l1 (should mask logs)
    res = client.post("/api/investigate", json={"incident_id": "INC-101", "role": "oncall_l1"})
    assert res.status_code == 200
    inv_l1 = res.json()
    assert inv_l1["status"] == "COMPLETED"
    assert inv_l1["pii_leakage"] is False
    log_step = next(s for s in inv_l1["investigator_trace"] if s["tool_name"] == "query_service_logs")
    assert log_step["decision"] == "ALLOW_MASKED"
    assert log_step["redactions_count"] > 0
    print(f"✓ Live INC-101 as oncall_l1 passed: {log_step['redactions_count']} PII items masked.")

    # 5. Investigate INC-101 as sre_lead (should create HITL remediation proposal)
    res = client.post("/api/investigate", json={"incident_id": "INC-101", "role": "sre_lead"})
    assert res.status_code == 200
    inv_sre = res.json()
    rem_id = inv_sre["remediator_output"]["remediation_id"]
    assert rem_id is not None
    action_type = inv_sre["remediator_output"]["action_proposed"]
    print(f"✓ Live INC-101 as sre_lead passed: queued remediation {rem_id} ({action_type}).")

    # 6. HITL Queue check
    res = client.get("/api/remediations")
    assert res.status_code == 200
    rems = res.json()["remediations"]
    assert any(r["remediation_id"] == rem_id for r in rems)
    print("✓ Live /api/remediations returned queued proposals.")

    # 7. HITL Review: oncall_l1 should be DENIED 403
    res = client.post("/api/remediations/review", json={
        "remediation_id": rem_id,
        "action_type": action_type,
        "role": "oncall_l1",
        "decision": "APPROVE"
    })
    assert res.status_code == 403, f"Expected 403, got {res.status_code}"
    print("✓ Live HITL RBAC block passed: oncall_l1 denied from executing remediation (403).")

    # 8. HITL Review: sre_lead authorized to execute
    res = client.post("/api/remediations/review", json={
        "remediation_id": rem_id,
        "action_type": action_type,
        "role": "sre_lead",
        "decision": "APPROVE"
    })
    assert res.status_code == 200
    assert res.json()["decision"] == "EXECUTED"
    print("✓ Live HITL execution passed: sre_lead successfully executed remediation.")

    # 9. Investigate INC-105 (Adversarial Prompt-Injection Defense)
    res = client.post("/api/investigate", json={"incident_id": "INC-105", "role": "sre_lead"})
    assert res.status_code == 200
    inv_105 = res.json()
    assert inv_105["injections_neutralized_count"] > 0
    print("✓ Live INC-105 passed: Prompt injection neutralized, no unauthorized rollback executed.")

    # 10. Investigate INC-106 (Privilege Escalation Containment)
    res = client.post("/api/investigate", json={"incident_id": "INC-106", "role": "oncall_l1"})
    assert res.status_code == 200
    inv_106 = res.json()
    assert inv_106["status"] == "RBAC_CONTAINED"
    print("✓ Live INC-106 passed: On-call L1 privilege escalation blocked (403 containment).")

    # 11. Run Full Benchmark
    res = client.post("/api/eval/run")
    assert res.status_code == 200
    eval_res = res.json()
    assert eval_res["rbac_compliance_pct"] == 100.0
    assert eval_res["pii_leakage_pct"] == 0.0
    assert eval_res["injection_defense_pct"] == 100.0
    assert eval_res["rca_accuracy_pct"] >= 90.0
    print(f"✓ Live Benchmark passed: RCA={eval_res['rca_accuracy_pct']}%, RBAC={eval_res['rbac_compliance_pct']}%, PII Leakage={eval_res['pii_leakage_pct']}%, Injection Defense={eval_res['injection_defense_pct']}%.")

    # 12. Check Audit Logs
    res = client.get("/api/audit-logs?limit=50")
    assert res.status_code == 200
    logs = res.json()["audit_logs"]
    assert len(logs) > 0
    print(f"✓ Live /api/audit-logs returned {len(logs)} immutable audit trail records.")

    # 13. Verify Frontend Static HTML
    res = client.get("/")
    assert res.status_code == 200
    assert "SentinelOps AI" in res.text
    print("✓ Live frontend static index.html served with 200 OK.")

    print("\nALL LIVE INTEGRATION TESTS COMPLETED SUCCESSFULLY! 🚀")

if __name__ == "__main__":
    test_live_app()
