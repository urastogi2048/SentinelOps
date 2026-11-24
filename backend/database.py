"""
SQLite Database Layer for SentinelOps AI.
"""
import sqlite3
import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sentinelops.db")


def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        service TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT NOT NULL,
        symptoms TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS investigation_runs (
        run_id TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration_ms INTEGER,
        rca_summary TEXT,
        confidence_score REAL,
        cited_evidence TEXT,
        proposed_remediation TEXT,
        execution_trace TEXT,
        FOREIGN KEY (incident_id) REFERENCES incidents (id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        run_id TEXT,
        role TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        decision TEXT NOT NULL,
        parameters TEXT,
        reason TEXT,
        redactions_count INTEGER DEFAULT 0,
        redactions_detail TEXT,
        injection_neutralized INTEGER DEFAULT 0
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS remediation_queue (
        remediation_id TEXT PRIMARY KEY,
        run_id TEXT,
        incident_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        target_service TEXT NOT NULL,
        target_version TEXT,
        reason TEXT NOT NULL,
        blast_radius TEXT,
        status TEXT NOT NULL,
        requested_by_role TEXT NOT NULL,
        reviewed_by_role TEXT,
        created_at TEXT NOT NULL,
        decision_timestamp TEXT,
        execution_output TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS eval_runs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        total_tests INTEGER NOT NULL,
        rca_accuracy REAL NOT NULL,
        rbac_compliance_rate REAL NOT NULL,
        pii_leakage_rate REAL NOT NULL,
        injection_defense_rate REAL NOT NULL,
        avg_latency_ms REAL NOT NULL,
        results_matrix TEXT NOT NULL
    )
    """)

    conn.commit()
    conn.close()


def log_audit_event(
    role: str,
    tool_name: str,
    decision: str,
    parameters: Optional[Dict[str, Any]] = None,
    reason: str = "",
    run_id: Optional[str] = None,
    redactions_count: int = 0,
    redactions_detail: Optional[Dict[str, Any]] = None,
    injection_neutralized: bool = False,
) -> int:
    conn = get_db()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute(
        """
        INSERT INTO audit_log (
            timestamp, run_id, role, tool_name, decision, parameters,
            reason, redactions_count, redactions_detail, injection_neutralized
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            now_iso,
            run_id,
            role,
            tool_name,
            decision,
            json.dumps(parameters or {}),
            reason,
            redactions_count,
            json.dumps(redactions_detail or {}),
            1 if injection_neutralized else 0,
        ),
    )
    inserted_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return inserted_id


def get_audit_logs(limit: int = 100, role: Optional[str] = None, decision: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM audit_log WHERE 1=1"
    args = []

    if role:
        query += " AND role = ?"
        args.append(role)
    if decision:
        query += " AND decision = ?"
        args.append(decision)

    query += " ORDER BY id DESC LIMIT ?"
    args.append(limit)

    cursor.execute(query, tuple(args))
    rows = cursor.fetchall()
    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "timestamp": r["timestamp"],
            "run_id": r["run_id"],
            "role": r["role"],
            "tool_name": r["tool_name"],
            "decision": r["decision"],
            "parameters": json.loads(r["parameters"] or "{}"),
            "reason": r["reason"],
            "redactions_count": r["redactions_count"],
            "redactions_detail": json.loads(r["redactions_detail"] or "{}"),
            "injection_neutralized": bool(r["injection_neutralized"]),
        })
    conn.close()
    return results


def save_remediation_proposal(
    remediation_id: str,
    run_id: str,
    incident_id: str,
    action_type: str,
    target_service: str,
    target_version: Optional[str],
    reason: str,
    blast_radius: str,
    requested_by_role: str,
) -> Dict[str, Any]:
    conn = get_db()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute(
        """
        INSERT INTO remediation_queue (
            remediation_id, run_id, incident_id, action_type, target_service,
            target_version, reason, blast_radius, status, requested_by_role, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
        """,
        (
            remediation_id,
            run_id,
            incident_id,
            action_type,
            target_service,
            target_version,
            reason,
            blast_radius,
            requested_by_role,
            now_iso,
        ),
    )
    conn.commit()
    conn.close()
    return {
        "remediation_id": remediation_id,
        "run_id": run_id,
        "incident_id": incident_id,
        "action_type": action_type,
        "target_service": target_service,
        "target_version": target_version,
        "reason": reason,
        "blast_radius": blast_radius,
        "status": "PENDING",
        "requested_by_role": requested_by_role,
        "created_at": now_iso,
    }


def update_remediation_status(
    remediation_id: str,
    status: str,
    reviewed_by_role: str,
    execution_output: str = "",
) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute(
        """
        UPDATE remediation_queue
        SET status = ?, reviewed_by_role = ?, decision_timestamp = ?, execution_output = ?
        WHERE remediation_id = ?
        """,
        (status, reviewed_by_role, now_iso, execution_output, remediation_id),
    )
    conn.commit()
    cursor.execute("SELECT * FROM remediation_queue WHERE remediation_id = ?", (remediation_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return dict(row)


def get_remediation_queue(status: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    if status:
        cursor.execute("SELECT * FROM remediation_queue WHERE status = ? ORDER BY created_at DESC", (status,))
    else:
        cursor.execute("SELECT * FROM remediation_queue ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


init_db()
