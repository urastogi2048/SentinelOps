import React, { useState } from 'react';
import { Activity, Lock, Play, RefreshCw } from 'lucide-react';
import { runBenchmark } from '../api';

export default function AuditBenchmarkTab({
  benchmarkData,
  onBenchmarkUpdated,
  auditLogs,
  onRefreshAuditLogs,
}) {
  const [isRunningBench, setIsRunningBench] = useState(false);
  const [filterRole, setFilterRole] = useState('');
  const [filterDecision, setFilterDecision] = useState('');

  const handleRunBenchmark = async () => {
    setIsRunningBench(true);
    try {
      const res = await runBenchmark();
      onBenchmarkUpdated(res);
      onRefreshAuditLogs();
    } catch (err) {
      alert(`Benchmark execution failed: ${err.message}`);
    } finally {
      setIsRunningBench(false);
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (filterRole && log.role !== filterRole) return false;
    if (filterDecision && log.decision !== filterDecision) return false;
    return true;
  });

  const getDecisionBadge = (decision) => {
    switch (decision) {
      case 'DENY':
        return 'bg-rose-950/70 text-rose-400 border-rose-500/40';
      case 'ALLOW_MASKED':
        return 'bg-sky-950/70 text-sky-400 border-sky-500/40';
      case 'ALLOW':
        return 'bg-emerald-950/70 text-emerald-400 border-emerald-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="p-5 space-y-6 overflow-y-auto max-h-[calc(100vh-125px)]">
      <div className="bg-sentinel-900 border border-sentinel-700 rounded-xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-sentinel-800">
          <div>
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-sky-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Multi-Role Chaos & RBAC Benchmark Suite
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated validation matrix evaluating 11 test cases across 6 scenarios, measuring RBAC compliance, PII leakage, and injection defense.
            </p>
          </div>

          <button
            onClick={handleRunBenchmark}
            disabled={isRunningBench}
            className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center space-x-2 shadow-lg transition-all ${
              isRunningBench
                ? 'bg-sentinel-800 text-slate-500 border border-sentinel-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-sky-500/20 active:scale-95'
            }`}
          >
            {isRunningBench ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-sky-300 border-t-transparent rounded-full animate-spin"></div>
                <span>Executing 11-Test Benchmark Matrix...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Chaos & RBAC Benchmark</span>
              </>
            )}
          </button>
        </div>

        {benchmarkData && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl bg-sentinel-950 border border-sentinel-800 space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                RCA Accuracy
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {benchmarkData.rca_accuracy_pct}%
              </div>
              <div className="text-[10px] text-slate-500">Root-cause identification</div>
            </div>

            <div className="p-3.5 rounded-xl bg-sentinel-950 border border-sentinel-800 space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                RBAC Compliance
              </div>
              <div className="text-2xl font-bold font-mono text-sky-400">
                {benchmarkData.rbac_compliance_pct}%
              </div>
              <div className="text-[10px] text-slate-500">Deterministic code-enforced</div>
            </div>

            <div className="p-3.5 rounded-xl bg-sentinel-950 border border-sentinel-800 space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                PII Leakage Rate
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {benchmarkData.pii_leakage_pct}%
              </div>
              <div className="text-[10px] text-slate-500">Zero sensitive identifiers leaked</div>
            </div>

            <div className="p-3.5 rounded-xl bg-sentinel-950 border border-sentinel-800 space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                Injection Defense
              </div>
              <div className="text-2xl font-bold font-mono text-indigo-400">
                {benchmarkData.injection_defense_pct}%
              </div>
              <div className="text-[10px] text-slate-500">Adversarial vectors blocked</div>
            </div>

            <div className="p-3.5 rounded-xl bg-sentinel-950 border border-sentinel-800 space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                Average Latency
              </div>
              <div className="text-2xl font-bold font-mono text-amber-400">
                {benchmarkData.avg_latency_ms} ms
              </div>
              <div className="text-[10px] text-slate-500">Per-test execution time</div>
            </div>
          </div>
        )}

        {benchmarkData?.matrix_results && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              Evaluation Test Matrix ({benchmarkData.matrix_results.length} Scenarios)
            </div>
            <div className="border border-sentinel-800 rounded-xl overflow-x-auto bg-sentinel-950">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-sentinel-900 border-b border-sentinel-800 font-mono text-[11px] text-slate-400 uppercase">
                  <tr>
                    <th className="p-3">Test Case</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Result</th>
                    <th className="p-3">RBAC Block / Pass</th>
                    <th className="p-3">PII Leakage</th>
                    <th className="p-3">Injection Neutralized</th>
                    <th className="p-3">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sentinel-800/80 font-mono text-[11px]">
                  {benchmarkData.matrix_results.map((item, idx) => (
                    <tr key={idx} className="hover:bg-sentinel-900/60 transition-colors">
                      <td className="p-3 font-sans font-medium text-slate-200">
                        {item.test_name}
                      </td>
                      <td className="p-3 text-sky-400">{item.role}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.status === 'PASS' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30' : 'bg-rose-950/60 text-rose-400 border-rose-500/30'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">
                        {item.rbac_compliant ? '✓ 100% Compliant' : '✗ Failed'}
                      </td>
                      <td className="p-3 text-emerald-400">
                        {item.pii_leakage ? '✗ Leaked' : '✓ 0% Clean'}
                      </td>
                      <td className="p-3 text-slate-300">
                        {item.injection_neutralized ? '✓ Neutralized' : 'N/A'}
                      </td>
                      <td className="p-3 text-slate-400">{item.latency_ms} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="bg-sentinel-900 border border-sentinel-700 rounded-xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-sentinel-800">
          <div>
            <div className="flex items-center space-x-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Immutable Governance & Audit Trail
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Code-persisted ledger recording every tool decision, RBAC denial, PII redaction count, and HITL authorization.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-sentinel-850 border border-sentinel-700 rounded-lg px-2 py-1 text-slate-200 focus:outline-none font-mono"
            >
              <option value="">All Roles</option>
              <option value="oncall_l1">oncall_l1</option>
              <option value="sre_lead">sre_lead</option>
              <option value="db_admin">db_admin</option>
              <option value="security_auditor">security_auditor</option>
            </select>

            <select
              value={filterDecision}
              onChange={(e) => setFilterDecision(e.target.value)}
              className="bg-sentinel-850 border border-sentinel-700 rounded-lg px-2 py-1 text-slate-200 focus:outline-none font-mono"
            >
              <option value="">All Decisions</option>
              <option value="ALLOW">ALLOW</option>
              <option value="ALLOW_MASKED">ALLOW_MASKED</option>
              <option value="DENY">DENY (403)</option>
            </select>

            <button
              onClick={onRefreshAuditLogs}
              className="p-1.5 rounded-lg bg-sentinel-850 border border-sentinel-700 text-slate-400 hover:text-slate-200"
              title="Refresh Audit Logs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="border border-sentinel-800 rounded-xl overflow-x-auto bg-sentinel-950">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-sentinel-900 border-b border-sentinel-800 font-mono text-[11px] text-slate-400 uppercase">
              <tr>
                <th className="p-3">ID / Time</th>
                <th className="p-3">Run ID</th>
                <th className="p-3">Role</th>
                <th className="p-3">Tool Name</th>
                <th className="p-3">Decision</th>
                <th className="p-3">Redactions</th>
                <th className="p-3">Reason / Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sentinel-800/80 font-mono text-[11px]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500 font-sans">
                    No audit records match the current filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-sentinel-900/60 transition-colors">
                    <td className="p-3 text-slate-400 whitespace-nowrap">
                      <div>#{log.id}</div>
                      <div className="text-[10px] text-slate-500">{log.timestamp?.slice(11, 19)}Z</div>
                    </td>
                    <td className="p-3 text-sky-400 whitespace-nowrap">
                      {log.run_id || 'DIRECT'}
                    </td>
                    <td className="p-3 text-slate-200 font-semibold">{log.role}</td>
                    <td className="p-3 text-slate-300">{log.tool_name}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getDecisionBadge(log.decision)}`}>
                        {log.decision}
                      </span>
                    </td>
                    <td className="p-3 text-purple-300">
                      {log.redactions_count > 0 ? `${log.redactions_count} PII` : '0'}
                    </td>
                    <td className="p-3 text-slate-400 font-sans max-w-xs truncate" title={log.reason}>
                      {log.reason}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
