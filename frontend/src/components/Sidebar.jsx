import React, { useState } from 'react';
import { AlertCircle, Flame, Bug, Key, CreditCard, ShieldAlert, Zap, Play, Terminal, ChevronRight, PlusCircle } from 'lucide-react';

export default function Sidebar({
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  onRunInvestigation,
  isRunning,
  activeRole,
}) {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customService, setCustomService] = useState('order-worker');
  const [customDescription, setCustomDescription] = useState('');

  const getScenarioIcon = (id) => {
    switch (id) {
      case 'INC-101':
        return <Flame className="w-4 h-4 text-rose-400" />;
      case 'INC-102':
        return <Bug className="w-4 h-4 text-purple-400" />;
      case 'INC-103':
        return <Key className="w-4 h-4 text-amber-400" />;
      case 'INC-104':
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      case 'INC-105':
        return <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />;
      case 'INC-106':
        return <Zap className="w-4 h-4 text-orange-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-sky-400" />;
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-950/60 text-rose-400 border-rose-500/40';
      case 'ADVERSARIAL':
        return 'bg-red-950/90 text-red-300 border-red-500 animate-pulse-subtle font-bold';
      case 'HIGH':
        return 'bg-orange-950/60 text-orange-400 border-orange-500/40';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const handleLaunch = () => {
    if (isCustomMode) {
      if (!customTitle.trim()) return;
      onRunInvestigation('INC-CUSTOM', {
        title: customTitle,
        service: customService,
        description: customDescription,
      });
    } else {
      onRunInvestigation(selectedScenarioId);
    }
  };

  return (
    <aside className="w-80 lg:w-96 bg-sentinel-900 border-r border-sentinel-700/80 flex flex-col h-[calc(100vh-61px)] shrink-0 select-none">
      <div className="p-4 border-b border-sentinel-700/80 bg-sentinel-850/50">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-sky-400" />
            <span className="font-semibold text-sm text-slate-200 tracking-wide uppercase">
              Incident Launcher
            </span>
          </div>
          <button
            onClick={() => setIsCustomMode(!isCustomMode)}
            className="text-xs text-sky-400 hover:text-sky-300 flex items-center space-x-1"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{isCustomMode ? 'Scenarios Catalog' : 'Custom Alert'}</span>
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Select a production chaos failure or inject an adversarial telemetry probe.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {!isCustomMode ? (
          scenarios.map((sc) => {
            const isSelected = sc.id === selectedScenarioId;
            return (
              <div
                key={sc.id}
                onClick={() => onSelectScenario(sc.id)}
                className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-sentinel-800/90 border-sky-500/60 shadow-lg shadow-sky-500/5 ring-1 ring-sky-500/30'
                    : 'bg-sentinel-850/40 border-sentinel-700/60 hover:bg-sentinel-800/50 hover:border-sentinel-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center space-x-2 min-w-0">
                    <div className="p-1.5 rounded-lg bg-sentinel-900 border border-sentinel-700 shrink-0">
                      {getScenarioIcon(sc.id)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-semibold text-sky-300 tracking-tight flex items-center space-x-1.5">
                        <span>{sc.id}</span>
                        <span className="text-[10px] text-slate-400 font-sans font-normal">
                          • {sc.service}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-slate-200 truncate" title={sc.title}>
                        {sc.title}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-mono shrink-0 ${getSeverityBadge(sc.severity)}`}>
                    {sc.severity}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mt-1">
                  {sc.description}
                </p>

                {isSelected && (
                  <div className="mt-2 pt-2 border-t border-sentinel-700/60 flex items-center justify-between text-[11px] text-sky-400 font-medium">
                    <span>Active Target Selected</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-3 bg-sentinel-850 rounded-xl border border-sentinel-700 space-y-3 text-xs">
            <div className="font-semibold text-slate-200 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Custom Alert Simulation</span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Incident Title / Alert</label>
              <input
                type="text"
                placeholder="e.g. Memory spike & 502 Bad Gateway"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full bg-sentinel-900 border border-sentinel-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Target Service</label>
              <select
                value={customService}
                onChange={(e) => setCustomService(e.target.value)}
                className="w-full bg-sentinel-900 border border-sentinel-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="order-worker">order-worker (Unrestricted for L1)</option>
                <option value="auth-service">auth-service (Restricted)</option>
                <option value="payment-gateway">payment-gateway (Restricted)</option>
                <option value="postgres-primary">postgres-primary (DB Admin)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Description / Symptoms</label>
              <textarea
                rows={3}
                placeholder="Describe error patterns, logs, or adversarial payload..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                className="w-full bg-sentinel-900 border border-sentinel-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-sentinel-700/80 bg-sentinel-900">
        <div className="text-[11px] text-slate-400 mb-2 flex items-center justify-between">
          <span>Active Role Enforcement:</span>
          <span className="font-mono text-sky-400 font-semibold">{activeRole}</span>
        </div>

        <button
          onClick={handleLaunch}
          disabled={isRunning || (isCustomMode && !customTitle.trim())}
          className={`w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center space-x-2 shadow-lg transition-all duration-200 ${
            isRunning
              ? 'bg-sentinel-800 text-slate-500 cursor-not-allowed border border-sentinel-700'
              : 'bg-gradient-to-r from-sky-500 via-sky-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-sky-500/20 active:scale-[0.98]'
          }`}
        >
          {isRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Multi-Agent Triage Running...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Run Investigation ({activeRole})</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
