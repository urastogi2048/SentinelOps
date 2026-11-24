import React, { useState } from 'react';
import { Compass, Search, Wrench, Shield, CheckCircle2, XCircle, ShieldCheck, ChevronDown, ChevronUp, Link as LinkIcon, Layers } from 'lucide-react';

export default function PipelineTrace({ runResult, isRunning, onNavigateToHITL }) {
  const [expandedStep, setExpandedStep] = useState(null);

  if (isRunning) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-sky-500/20 border-t-sky-400 rounded-full animate-spin"></div>
          <Shield className="w-6 h-6 text-sky-400 absolute animate-pulse" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-200">
            Multi-Agent Triage Pipeline Executing...
          </h3>
          <p className="text-xs text-slate-400 max-w-md">
            Planner formulating bounded hypothesis → Investigator evaluating RBAC policies & redacting PII → Remediator synthesizing RCA.
          </p>
        </div>
      </div>
    );
  }

  if (!runResult) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500 space-y-3">
        <Layers className="w-12 h-12 text-slate-700 stroke-[1.5]" />
        <div>
          <h4 className="text-sm font-medium text-slate-400">No Active Investigation Trace</h4>
          <p className="text-xs text-slate-500 mt-1">Select an incident from the left sidebar and click "Run Investigation".</p>
        </div>
      </div>
    );
  }

  const { planner_output, investigator_trace, remediator_output, role, duration_ms, status } = runResult;

  const getDecisionBadge = (decision, status) => {
    if (status === 'DENIED' || decision === 'DENY') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950/70 text-rose-400 border border-rose-500/40 flex items-center space-x-1">
          <XCircle className="w-3 h-3" />
          <span>403 RBAC DENIED</span>
        </span>
      );
    }
    if (decision === 'ALLOW_MASKED') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-950/70 text-sky-400 border border-sky-500/40 flex items-center space-x-1">
          <ShieldCheck className="w-3 h-3" />
          <span>ALLOW (MASKED)</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/70 text-emerald-400 border border-emerald-500/40 flex items-center space-x-1">
        <CheckCircle2 className="w-3 h-3" />
        <span>ALLOW (UNMASKED)</span>
      </span>
    );
  };

  return (
    <div className="p-5 space-y-6 overflow-y-auto max-h-[calc(100vh-125px)]">
      <div className="bg-sentinel-850 border border-sentinel-700/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs text-sky-400 font-semibold">{runResult.run_id}</span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-300 font-medium">Incident: {runResult.incident_id}</span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-400 font-mono">Role: <strong className="text-slate-200">{role}</strong></span>
          </div>
          <div className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
            <span>Status:</span>
            <span className={`px-2 py-0.5 rounded text-xs font-mono uppercase ${status === 'COMPLETED' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/30' : 'bg-amber-950/50 text-amber-400 border border-amber-500/30'}`}>
              {status}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
          <div>Latency: <strong className="text-slate-200">{duration_ms} ms</strong></div>
          <div>Citations: <strong className="text-sky-300">{runResult.citations?.length || 0}</strong></div>
          <div>PII Leakage: <strong className="text-emerald-400">0% (Enforced)</strong></div>
        </div>
      </div>

      {/* STAGE 1 */}
      <div className="bg-sentinel-900 border border-sentinel-700/80 rounded-xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between pb-2 border-b border-sentinel-800">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Stage 1: Planner Agent</h4>
              <p className="text-[11px] text-slate-400">Bounded triage formulation and step-by-step hypothesis</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sentinel-800 text-slate-400 border border-sentinel-700">
            max_steps=5
          </span>
        </div>

        <div className="bg-sentinel-950/80 rounded-lg p-3 border border-sentinel-800 space-y-2 text-xs">
          <div>
            <span className="text-slate-400 font-medium">Primary Hypothesis:</span>
            <p className="text-slate-200 font-mono mt-0.5 text-[11px] bg-sentinel-900/60 p-2 rounded border border-sentinel-800">
              {planner_output.primary_hypothesis}
            </p>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Planned Verification Steps ({planner_output.planned_steps.length}):</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
              {planner_output.planned_steps.map((step) => (
                <div key={step.step_number} className="p-2 rounded bg-sentinel-900 border border-sentinel-800 text-[11px]">
                  <div className="font-mono text-sky-400 font-medium flex items-center justify-between">
                    <span>Step {step.step_number}: {step.tool_name}</span>
                    <span className="text-slate-500 text-[10px]">{step.target_service}</span>
                  </div>
                  <div className="text-slate-300 mt-0.5 text-[10px] truncate">{step.objective}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* STAGE 2 */}
      <div className="bg-sentinel-900 border border-sentinel-700/80 rounded-xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between pb-2 border-b border-sentinel-800">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Stage 2: Investigator Agent</h4>
              <p className="text-[11px] text-slate-400">Policy-governed tool execution, PII masking, and adversarial log scanning</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sentinel-800 text-slate-400 border border-sentinel-700">
            {investigator_trace.length} Tool Executions
          </span>
        </div>

        <div className="space-y-2.5">
          {investigator_trace.map((step) => {
            const isExpanded = expandedStep === step.step_number;
            return (
              <div
                key={step.step_number}
                className={`rounded-lg border transition-all duration-150 ${
                  step.status === 'DENIED'
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : 'bg-sentinel-850/60 border-sentinel-700/80 hover:border-sentinel-600'
                }`}
              >
                <div
                  onClick={() => setExpandedStep(isExpanded ? null : step.step_number)}
                  className="p-3 flex flex-wrap items-center justify-between gap-2 cursor-pointer select-none"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-sentinel-800 border border-sentinel-700 text-slate-300 flex items-center justify-center font-mono text-xs font-semibold shrink-0">
                      {step.step_number}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-200">
                      {step.tool_name}
                    </span>
                    <span className="text-xs text-slate-400 hidden sm:inline">
                      ({step.parameters?.service_name || step.parameters?.target_service || 'global'})
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {getDecisionBadge(step.decision, step.status)}

                    {step.redactions_count > 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-950/50 text-purple-300 border border-purple-500/30">
                        {step.redactions_count} PII Redactions
                      </span>
                    )}

                    {step.injection_neutralized && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-950/70 text-red-300 border border-red-500/40 animate-pulse font-bold">
                        Injection Blocked
                      </span>
                    )}

                    <span className="text-[11px] font-mono text-slate-400">
                      {step.latency_ms} ms
                    </span>

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                <div className="px-3 pb-2 text-[11px] text-slate-300 flex items-center justify-between">
                  <span>{step.output_summary}</span>
                  {step.citations_collected?.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <LinkIcon className="w-3 h-3 text-sky-400" />
                      <span className="font-mono text-[10px] text-sky-300">
                        {step.citations_collected.join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="p-3 bg-sentinel-950/90 border-t border-sentinel-800 rounded-b-lg space-y-2 text-xs">
                    <div>
                      <div className="text-slate-400 font-mono text-[11px] mb-1">Parameters:</div>
                      <pre className="p-2 rounded bg-sentinel-900 border border-sentinel-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                        {JSON.stringify(step.parameters, null, 2)}
                      </pre>
                    </div>

                    {step.error_message && (
                      <div className="p-2 rounded bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px] font-mono">
                        {step.error_message}
                      </div>
                    )}

                    {step.raw_result && (
                      <div>
                        <div className="text-slate-400 font-mono text-[11px] mb-1">Raw Output Payload:</div>
                        <pre className="p-2 rounded bg-sentinel-900 border border-sentinel-800 text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto">
                          {JSON.stringify(step.raw_result, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* STAGE 3 */}
      <div className="bg-sentinel-900 border border-sentinel-700/80 rounded-xl p-4 space-y-4 shadow-md">
        <div className="flex items-center justify-between pb-2 border-b border-sentinel-800">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Stage 3: Remediator Agent (RCA & Proposal)</h4>
              <p className="text-[11px] text-slate-400">Root-cause synthesis, evidence citations, and blast-radius evaluation</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-mono">Confidence:</span>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-950/50 text-emerald-300 border border-emerald-500/40">
              {Math.round(remediator_output.confidence_score * 100)}%
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-sentinel-850 border border-sky-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-400 font-mono">
              Root Cause Analysis (RCA)
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Target: <strong className="text-slate-200">{remediator_output.target_service}</strong>
            </span>
          </div>
          <p className="text-slate-200 text-xs leading-relaxed font-sans">
            {remediator_output.root_cause}
          </p>

          {remediator_output.cited_evidence?.length > 0 && (
            <div className="pt-2 border-t border-sentinel-700/60 flex items-center space-x-2">
              <span className="text-[11px] text-slate-400">Cited Evidence:</span>
              <div className="flex flex-wrap gap-1">
                {remediator_output.cited_evidence.map((cit) => (
                  <span key={cit} className="px-2 py-0.5 rounded bg-sky-950/40 text-sky-300 border border-sky-500/30 font-mono text-[10px]">
                    {cit}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-sentinel-950 border border-sentinel-800 space-y-1">
            <span className="text-slate-400 font-medium">Proposed Remediation Action:</span>
            <div className="font-mono text-emerald-400 font-semibold text-sm">
              {remediator_output.action_proposed || 'None (Privilege Boundary Intercepted)'}
            </div>
            {remediator_output.target_version && (
              <div className="text-[11px] text-slate-400 font-mono">
                Target Version: <span className="text-slate-200">{remediator_output.target_version}</span>
              </div>
            )}
            <div className="text-[11px] text-slate-400 mt-1">
              Status: <span className="font-mono text-sky-300 font-medium">{remediator_output.status}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-sentinel-950 border border-sentinel-800 space-y-1">
            <span className="text-slate-400 font-medium">Blast-Radius Assessment:</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {remediator_output.blast_radius}
            </p>
            {remediator_output.remediation_id && (
              <div className="pt-2">
                <button
                  onClick={onNavigateToHITL}
                  className="text-[11px] text-sky-400 hover:text-sky-300 font-medium underline flex items-center space-x-1"
                >
                  <span>View in HITL Remediation Queue ({remediator_output.remediation_id}) →</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
