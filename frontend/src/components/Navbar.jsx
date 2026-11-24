import React, { useState } from 'react';
import { Shield, ShieldAlert, Cpu, Lock, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export default function Navbar({ activeRole, onSelectRole, roles, health, roleMeta }) {
  const [showRoleInfo, setShowRoleInfo] = useState(false);

  const getRoleBadge = (roleKey) => {
    switch (roleKey) {
      case 'oncall_l1':
        return { label: 'On-Call L1', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
      case 'sre_lead':
        return { label: 'SRE Lead', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
      case 'db_admin':
        return { label: 'DB Admin', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
      case 'security_auditor':
        return { label: 'Security Auditor', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
      default:
        return { label: roleKey, bg: 'bg-slate-500/10 text-slate-400 border-slate-500/30' };
    }
  };

  const currentBadge = getRoleBadge(activeRole);
  const currentMeta = roleMeta[activeRole] || {};

  return (
    <header className="bg-sentinel-900 border-b border-sentinel-700/80 px-5 py-3 sticky top-0 z-50 flex items-center justify-between shadow-xl backdrop-blur-md">
      <div className="flex items-center space-x-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 via-sky-600/10 to-indigo-950 border border-sky-500/40 shadow-lg shadow-sky-500/10">
          <Shield className="w-5 h-5 text-sky-400" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-sky-300 via-sky-100 to-indigo-200 bg-clip-text text-transparent">
              SentinelOps AI
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-sentinel-800 border border-sentinel-700 text-sky-400">
              v1.0 RBAC
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            RBAC-Enforced Multi-Agent Incident Response & Log Triage Platform
          </p>
        </div>
      </div>

      <div className="hidden md:flex items-center space-x-3">
        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-md bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Policy Engine: <strong className="font-semibold">ENFORCED</strong></span>
        </div>

        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-md bg-sentinel-800 border border-sentinel-700 text-slate-300 text-xs font-mono">
          <Cpu className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-slate-400">Engine:</span>
          <span className="text-sky-300 font-medium">
            {health?.llm_mode?.mode || 'Deterministic Built-in'}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="text-right hidden lg:block">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Active Security Role</div>
          <div className="text-xs text-slate-300 font-mono">{currentMeta.title || activeRole}</div>
        </div>

        <div className="relative">
          <div className="flex bg-sentinel-850 p-1 rounded-lg border border-sentinel-700">
            {roles.map((r) => {
              const isSelected = r.role === activeRole;
              const badge = getRoleBadge(r.role);
              return (
                <button
                  key={r.role}
                  onClick={() => onSelectRole(r.role)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 flex items-center space-x-1.5 ${
                    isSelected
                      ? `${badge.bg} border shadow-sm font-semibold`
                      : 'text-slate-400 hover:text-slate-200 hover:bg-sentinel-800'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-current animate-pulse' : 'bg-slate-600'}`}></span>
                  <span>{badge.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => setShowRoleInfo(!showRoleInfo)}
          title="Inspect Role Permissions"
          className="p-2 rounded-lg bg-sentinel-850 border border-sentinel-700 text-slate-400 hover:text-sky-400 hover:bg-sentinel-800 transition-colors"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {showRoleInfo && (
        <div className="absolute right-5 top-16 w-96 bg-sentinel-900 border border-sentinel-700 rounded-xl p-4 shadow-2xl z-50 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-sentinel-700 mb-3">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-sky-400" />
              <span className="font-semibold text-slate-200">Deterministic RBAC Clearance</span>
            </div>
            <button
              onClick={() => setShowRoleInfo(false)}
              className="text-slate-400 hover:text-slate-200 font-mono"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2.5">
            <div>
              <div className="text-slate-400">Current Role:</div>
              <div className="font-semibold text-sky-300 font-mono text-sm">{currentMeta.title} ({activeRole})</div>
              <p className="text-slate-300 mt-0.5 leading-relaxed">{currentMeta.description}</p>
            </div>

            <div className="pt-2 border-t border-sentinel-800">
              <span className="text-slate-400">Authorized Log Scopes:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {(currentMeta.allowed_log_services || []).map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 font-mono text-[11px]">
                    ✓ {s}
                  </span>
                ))}
              </div>
            </div>

            {currentMeta.restricted_log_services?.length > 0 && (
              <div>
                <span className="text-slate-400">Restricted Services (403 Policy Block):</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {currentMeta.restricted_log_services.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded bg-rose-950/40 text-rose-400 border border-rose-500/30 font-mono text-[11px]">
                      ✗ {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-sentinel-800 flex justify-between items-center">
              <span className="text-slate-400">PII / Token Masking:</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${currentMeta.requires_masking ? 'bg-amber-950/40 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-300'}`}>
                {currentMeta.requires_masking ? 'ENFORCED (Masked)' : 'BYPASS (Unmasked)'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Write / Remediation Authorization:</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${currentMeta.can_execute_remediation ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950/40 text-rose-300 border border-rose-500/30'}`}>
                {currentMeta.can_execute_remediation ? 'PERMITTED' : 'DENIED (Read-Only)'}
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
