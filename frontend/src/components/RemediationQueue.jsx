import React, { useState } from 'react';
import { Wrench, CheckCircle, Shield, UserCheck, RefreshCw } from 'lucide-react';
import { reviewRemediation } from '../api';

export default function RemediationQueue({
  remediations,
  activeRole,
  onRefresh,
  roleMeta,
}) {
  const [processingId, setProcessingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const canRoleApprove = (actionType) => {
    const meta = roleMeta[activeRole];
    if (!meta || !meta.can_execute_remediation) return false;
    const allowed = meta.allowed_remediation_types || [];
    return allowed.includes(actionType);
  };

  const handleAction = async (rem, decision) => {
    setProcessingId(rem.remediation_id);
    setFeedback(null);
    try {
      await reviewRemediation(rem.remediation_id, rem.action_type, activeRole, decision);
      setFeedback({
        type: 'success',
        message: decision === 'APPROVE'
          ? `Successfully approved and executed remediation ${rem.remediation_id} under role '${activeRole}'.`
          : `Remediation ${rem.remediation_id} rejected.`,
      });
      onRefresh();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Operation failed due to RBAC policy.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'EXECUTED':
        return 'bg-emerald-950/70 text-emerald-400 border-emerald-500/40';
      case 'PENDING':
        return 'bg-amber-950/70 text-amber-300 border-amber-500/40 animate-pulse';
      case 'REJECTED':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      case 'DENIED':
        return 'bg-rose-950/70 text-rose-400 border-rose-500/40';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-125px)]">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-sentinel-850 border border-sentinel-700 rounded-xl">
        <div>
          <div className="flex items-center space-x-2">
            <Wrench className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Human-in-the-Loop (HITL) Remediation Queue
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Production write actions require Human Operator authorization subject to deterministic RBAC policies.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-3 py-1.5 rounded-lg bg-sentinel-800 hover:bg-sentinel-700 border border-sentinel-600 text-xs text-slate-300 flex items-center space-x-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="font-mono text-slate-400 hover:text-slate-200">✕</button>
        </div>
      )}

      {remediations.length === 0 ? (
        <div className="text-center py-16 bg-sentinel-900 border border-sentinel-800 rounded-xl space-y-2">
          <Wrench className="w-8 h-8 text-slate-600 mx-auto" />
          <h4 className="text-sm font-medium text-slate-400">Remediation Queue Empty</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            When an agent investigation finishes with a recommended fix, the proposal is queued here for Human review.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {remediations.map((rem) => {
            const isAuthorized = canRoleApprove(rem.action_type);
            const isPending = rem.status === 'PENDING';
            const isProcessing = processingId === rem.remediation_id;

            return (
              <div
                key={rem.remediation_id}
                className="bg-sentinel-900 border border-sentinel-700 rounded-xl p-4 space-y-3 shadow-md"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-sentinel-800">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-semibold text-sky-400">
                      {rem.remediation_id}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="font-mono text-xs font-bold text-slate-200 uppercase">
                      {rem.action_type}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-xs text-slate-300">Target: <strong>{rem.target_service}</strong></span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getStatusBadge(rem.status)}`}>
                      {rem.status}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {rem.created_at}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="text-slate-400">Root Cause / Justification:</div>
                    <p className="text-slate-200 bg-sentinel-950 p-2.5 rounded border border-sentinel-800 leading-relaxed text-[11px]">
                      {rem.reason}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-slate-400">Blast Radius & Target Version:</div>
                    <div className="bg-sentinel-950 p-2.5 rounded border border-sentinel-800 space-y-1 text-[11px]">
                      <div>Target Version: <span className="font-mono text-emerald-400">{rem.target_version || 'N/A'}</span></div>
                      <p className="text-slate-300 leading-relaxed">{rem.blast_radius}</p>
                    </div>
                  </div>
                </div>

                {rem.execution_output && (
                  <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/30 rounded-lg text-xs font-mono text-emerald-300">
                    <div className="text-[10px] uppercase text-emerald-400 font-semibold mb-0.5">Execution Result:</div>
                    {rem.execution_output}
                  </div>
                )}

                {isPending && (
                  <div className="pt-2 border-t border-sentinel-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs">
                      {isAuthorized ? (
                        <span className="text-emerald-400 flex items-center space-x-1.5">
                          <CheckCircle className="w-4 h-4" />
                          <span>Active Role <strong>'{activeRole}'</strong> is authorized to execute this action.</span>
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center space-x-1.5 font-mono text-[11px]">
                          <Shield className="w-4 h-4" />
                          <span>RBAC 403: Role <strong>'{activeRole}'</strong> is NOT authorized to execute '{rem.action_type}'. Switch role to SRE Lead or DB Admin.</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleAction(rem, 'REJECT')}
                        disabled={isProcessing}
                        className="px-3 py-1.5 rounded-lg bg-sentinel-800 hover:bg-rose-950 hover:text-rose-300 hover:border-rose-500/40 border border-sentinel-700 text-xs text-slate-300 font-medium transition-colors"
                      >
                        Reject
                      </button>

                      <button
                        onClick={() => handleAction(rem, 'APPROVE')}
                        disabled={!isAuthorized || isProcessing}
                        className={`px-4 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all shadow-md ${
                          isAuthorized && !isProcessing
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20 active:scale-95'
                            : 'bg-sentinel-800 text-slate-500 border border-sentinel-700 cursor-not-allowed'
                        }`}
                      >
                        {isProcessing ? (
                          <span>Executing...</span>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Approve & Execute ({activeRole})</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
