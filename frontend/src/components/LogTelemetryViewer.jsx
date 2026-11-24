import React, { useState } from 'react';
import { Shield, ShieldAlert, Lock, FileText, Activity, GitCommit, BookOpen, Search } from 'lucide-react';

export default function LogTelemetryViewer({ runResult, activeRole, scenarioDetail }) {
  const [activeSubTab, setActiveSubTab] = useState('logs');
  const [logFilter, setLogFilter] = useState('');

  let displayLogs = [];
  let isRbacBlocked = false;
  let blockedReason = '';
  let injectionDetected = false;
  let redactionTotal = 0;

  if (runResult) {
    const logStep = runResult.investigator_trace?.find((t) => t.tool_name === 'query_service_logs');
    if (logStep) {
      if (logStep.status === 'DENIED') {
        isRbacBlocked = true;
        blockedReason = logStep.error_message || 'Access Denied by RBAC Policy';
      } else {
        displayLogs = logStep.raw_result?.logs || [];
        redactionTotal = logStep.redactions_count || 0;
        injectionDetected = logStep.injection_neutralized || false;
      }
    }
  } else if (scenarioDetail) {
    displayLogs = scenarioDetail.logs || [];
  }

  const renderLogMessage = (msg) => {
    if (!msg) return null;
    const parts = msg.split(/(\[REDACTED_[A-Z]+\]|\[INJECTION_ATTEMPT_NEUTRALIZED:[^\]]+\]|<untrusted_log_data[^>]*>|<\/untrusted_log_data>)/g);

    return parts.map((part, i) => {
      if (part.startsWith('[REDACTED_EMAIL]')) {
        return (
          <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950/80 text-purple-300 border border-purple-500/40">
            {part}
          </span>
        );
      }
      if (part.startsWith('[REDACTED_TOKEN]')) {
        return (
          <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950/80 text-sky-300 border border-sky-500/40">
            {part}
          </span>
        );
      }
      if (part.startsWith('[REDACTED_API_KEY]')) {
        return (
          <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40">
            {part}
          </span>
        );
      }
      if (part.startsWith('[REDACTED_ID]')) {
        return (
          <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
            {part}
          </span>
        );
      }
      if (part.includes('INJECTION_ATTEMPT_NEUTRALIZED')) {
        return (
          <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950 text-red-300 border border-red-500 animate-pulse">
            {part}
          </span>
        );
      }
      if (part.startsWith('<untrusted_log_data') || part === '</untrusted_log_data>') {
        return (
          <span key={i} className="text-slate-500 font-mono text-[10px]">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const filteredLogs = displayLogs.filter((l) => {
    if (!logFilter) return true;
    const q = logFilter.toLowerCase();
    return (
      l.message?.toLowerCase().includes(q) ||
      l.service?.toLowerCase().includes(q) ||
      l.level?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(100vh-125px)]">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-sentinel-850 border border-sentinel-700 rounded-xl text-xs">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-mono text-slate-300">
            <Shield className="w-4 h-4 text-sky-400" />
            <span>Viewer Clearance:</span>
            <strong className="text-sky-300">{activeRole}</strong>
          </div>

          <span className="text-slate-600">|</span>

          <div className="flex items-center space-x-1.5 text-slate-300">
            <span>PII Redactor:</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${activeRole === 'sre_lead' ? 'bg-slate-800 text-slate-300' : 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/30'}`}>
              {activeRole === 'sre_lead' ? 'Unmasked (Audited)' : 'Masking Active (Role-Scoped)'}
            </span>
          </div>
        </div>

        {redactionTotal > 0 && (
          <div className="px-2.5 py-1 rounded bg-purple-950/40 border border-purple-500/30 text-purple-300 font-mono text-xs">
            {redactionTotal} PII & Secret Redactions Applied
          </div>
        )}
      </div>

      {injectionDetected && (
        <div className="p-3.5 bg-red-950/60 border border-red-500/60 rounded-xl flex items-start space-x-3 text-xs shadow-lg shadow-red-500/10">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <div className="font-semibold text-red-200 uppercase tracking-wide flex items-center space-x-2">
              <span>Security Event: Indirect Prompt Injection Neutralized</span>
              <span className="text-[10px] bg-red-900 px-1.5 py-0.2 rounded font-mono">ENFORCED</span>
            </div>
            <p className="text-red-300 leading-relaxed text-[11px]">
              SentinelOps indirect prompt sanitizer detected an adversarial directive injected into the incoming payload.
              The payload has been isolated inside strict safety tags (<code className="text-red-200 font-mono">&lt;untrusted_log_data&gt;</code>) and stripped of unauthorized execution directives.
            </p>
          </div>
        </div>
      )}

      {isRbacBlocked && (
        <div className="p-4 bg-rose-950/40 border-2 border-rose-500/60 rounded-xl space-y-2 text-xs">
          <div className="flex items-center space-x-2 text-rose-300 font-bold text-sm">
            <Lock className="w-4 h-4 text-rose-400" />
            <span>403 RBAC POLICY ACCESS RESTRICTION</span>
          </div>
          <p className="text-rose-200 leading-relaxed font-mono">
            {blockedReason}
          </p>
          <div className="text-[11px] text-rose-300/80 pt-1 border-t border-rose-500/30">
            Deterministic Policy Engine Rule: Role <strong>'{activeRole}'</strong> is prohibited from querying raw telemetry from restricted production tiers.
          </div>
        </div>
      )}

      <div className="border-b border-sentinel-700/80 flex items-center space-x-4 text-xs font-medium">
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`pb-2 flex items-center space-x-1.5 transition-colors border-b-2 ${
            activeSubTab === 'logs'
              ? 'border-sky-400 text-sky-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Service Log Stream ({filteredLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('metrics')}
          className={`pb-2 flex items-center space-x-1.5 transition-colors border-b-2 ${
            activeSubTab === 'metrics'
              ? 'border-sky-400 text-sky-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Telemetry Metrics</span>
        </button>

        <button
          onClick={() => setActiveSubTab('deployments')}
          className={`pb-2 flex items-center space-x-1.5 transition-colors border-b-2 ${
            activeSubTab === 'deployments'
              ? 'border-sky-400 text-sky-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitCommit className="w-3.5 h-3.5" />
          <span>Deployments</span>
        </button>

        <button
          onClick={() => setActiveSubTab('runbooks')}
          className={`pb-2 flex items-center space-x-1.5 transition-colors border-b-2 ${
            activeSubTab === 'runbooks'
              ? 'border-sky-400 text-sky-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Runbooks Catalog</span>
        </button>
      </div>

      {activeSubTab === 'logs' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter logs by message, service, level..."
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="w-full bg-sentinel-900 border border-sentinel-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          <div className="bg-sentinel-950 rounded-xl border border-sentinel-800 p-3 space-y-2 font-mono text-xs overflow-x-auto min-h-64">
            {filteredLogs.length === 0 ? (
              <div className="text-slate-500 text-center py-12">
                {isRbacBlocked ? 'No logs available due to active RBAC block.' : 'No log lines retrieved.'}
              </div>
            ) : (
              filteredLogs.map((log, idx) => (
                <div
                  key={log.id || idx}
                  className="p-2.5 rounded bg-sentinel-900/60 border border-sentinel-800/80 hover:bg-sentinel-900 space-y-1"
                >
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sky-400 font-semibold">{log.id}</span>
                      <span>•</span>
                      <span className="text-slate-400">{log.timestamp}</span>
                      <span>•</span>
                      <span className="text-slate-300 font-medium">{log.service}</span>
                    </div>

                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                        log.level === 'FATAL' || log.level === 'ERROR'
                          ? 'bg-rose-950 text-rose-400 border border-rose-500/40'
                          : log.level === 'WARN'
                          ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {log.level}
                    </span>
                  </div>

                  <div className="text-slate-200 text-xs break-words leading-relaxed whitespace-pre-wrap">
                    {renderLogMessage(log.message)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'metrics' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {scenarioDetail?.metrics ? (
            Object.entries(scenarioDetail.metrics).map(([k, v]) => (
              <div key={k} className="p-3.5 rounded-xl bg-sentinel-900 border border-sentinel-700 space-y-1">
                <div className="text-slate-400 text-xs uppercase tracking-wider font-mono truncate">
                  {k.replace(/_/g, ' ')}
                </div>
                <div className="text-lg font-bold text-sky-400 font-mono">
                  {String(v)}
                </div>
              </div>
            ))
          ) : (
            <div className="text-slate-500 col-span-3 text-center py-10 text-xs">
              Metrics telemetry will populate when an incident investigation is triggered.
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'deployments' && (
        <div className="space-y-3">
          {(scenarioDetail?.deployments || []).map((dep) => (
            <div key={dep.deploy_id} className="p-3.5 rounded-xl bg-sentinel-900 border border-sentinel-700 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sky-400 font-semibold">{dep.deploy_id}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 font-mono font-bold text-[11px] border border-emerald-500/30">
                    {dep.version}
                  </span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">{dep.deployed_at}</span>
              </div>
              <p className="text-slate-300 leading-relaxed">{dep.changelog}</p>
              <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-3 pt-1 border-t border-sentinel-800">
                <span>By: <strong className="text-slate-200">{dep.deployed_by}</strong></span>
                <span>Commit: <strong className="text-sky-300">{dep.commit_hash}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'runbooks' && (
        <div className="space-y-3">
          {(scenarioDetail?.runbooks || []).map((rb) => (
            <div key={rb.runbook_id} className="p-4 rounded-xl bg-sentinel-900 border border-sentinel-700 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-sky-400" />
                  <span className="font-semibold text-slate-200 text-sm">{rb.title}</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-sentinel-800 text-sky-300 font-mono text-[11px] border border-sentinel-700">
                  {rb.runbook_id}
                </span>
              </div>
              <div className="p-3 rounded bg-sentinel-950 border border-sentinel-800 text-slate-300 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                {rb.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
