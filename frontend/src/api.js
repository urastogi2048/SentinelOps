const API_BASE = "/api";

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("Failed to fetch system health");
  return res.json();
}

export async function fetchRoles() {
  const res = await fetch(`${API_BASE}/roles`);
  if (!res.ok) throw new Error("Failed to fetch roles");
  return res.json();
}

export async function fetchScenarios() {
  const res = await fetch(`${API_BASE}/scenarios`);
  if (!res.ok) throw new Error("Failed to fetch scenarios");
  return res.json();
}

export async function fetchScenarioDetail(scenarioId) {
  const res = await fetch(`${API_BASE}/scenarios/${scenarioId}`);
  if (!res.ok) throw new Error(`Failed to fetch scenario ${scenarioId}`);
  return res.json();
}

export async function runInvestigation(incidentId, role, custom = null) {
  const payload = {
    incident_id: incidentId,
    role: role,
    custom_title: custom?.title || null,
    custom_service: custom?.service || null,
    custom_description: custom?.description || null,
  };
  const res = await fetch(`${API_BASE}/investigate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Investigation failed with status ${res.status}`);
  }
  return res.json();
}

export async function fetchRemediations(status = null) {
  const url = status ? `${API_BASE}/remediations?status=${encodeURIComponent(status)}` : `${API_BASE}/remediations`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch remediations");
  return res.json();
}

export async function reviewRemediation(remediationId, actionType, role, decision = "APPROVE") {
  const res = await fetch(`${API_BASE}/remediations/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      remediation_id: remediationId,
      action_type: actionType,
      role: role,
      decision: decision,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Remediation review failed (${res.status})`);
  }
  return res.json();
}

export async function fetchAuditLogs(limit = 100, role = null, decision = null) {
  let query = `?limit=${limit}`;
  if (role) query += `&role=${encodeURIComponent(role)}`;
  if (decision) query += `&decision=${encodeURIComponent(decision)}`;
  const res = await fetch(`${API_BASE}/audit-logs${query}`);
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  return res.json();
}

export async function runBenchmark() {
  const res = await fetch(`${API_BASE}/eval/run`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to run benchmark");
  return res.json();
}

export async function fetchLatestBenchmark() {
  const res = await fetch(`${API_BASE}/eval/latest`);
  if (!res.ok) throw new Error("Failed to fetch latest benchmark");
  return res.json();
}
