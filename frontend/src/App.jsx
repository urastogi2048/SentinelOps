import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import PipelineTrace from './components/PipelineTrace';
import LogTelemetryViewer from './components/LogTelemetryViewer';
import RemediationQueue from './components/RemediationQueue';
import AuditBenchmarkTab from './components/AuditBenchmarkTab';

import {
  fetchHealth,
  fetchRoles,
  fetchScenarios,
  fetchScenarioDetail,
  runInvestigation,
  fetchRemediations,
  fetchAuditLogs,
  fetchLatestBenchmark,
} from './api';

import { GitPullRequest, FileText, Wrench, Shield } from 'lucide-react';

export default function App() {
  const [activeRole, setActiveRole] = useState('oncall_l1');
  const [roles, setRoles] = useState([]);
  const [health, setHealth] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('INC-101');
  const [selectedScenarioDetail, setSelectedScenarioDetail] = useState(null);

  const [activeTab, setActiveTab] = useState('pipeline');
  const [currentRunResult, setCurrentRunResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const [remediations, setRemediations] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [benchmarkData, setBenchmarkData] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedScenarioId && selectedScenarioId !== 'INC-CUSTOM') {
      fetchScenarioDetail(selectedScenarioId)
        .then(setSelectedScenarioDetail)
        .catch((err) => console.error('Error fetching scenario detail:', err));
    }
  }, [selectedScenarioId]);

  const loadInitialData = async () => {
    try {
      const [h, r, s, rem, logs, bench] = await Promise.all([
        fetchHealth().catch(() => null),
        fetchRoles().catch(() => ({ roles: [] })),
        fetchScenarios().catch(() => ({ scenarios: [] })),
        fetchRemediations().catch(() => ({ remediations: [] })),
        fetchAuditLogs(100).catch(() => ({ audit_logs: [] })),
        fetchLatestBenchmark().catch(() => null),
      ]);

      if (h) setHealth(h);
      if (r?.roles) setRoles(r.roles);
      if (s?.scenarios) {
        setScenarios(s.scenarios);
        if (s.scenarios.length > 0) {
          setSelectedScenarioId(s.scenarios[0].id);
        }
      }
      if (rem?.remediations) setRemediations(rem.remediations);
      if (logs?.audit_logs) setAuditLogs(logs.audit_logs);
      if (bench) setBenchmarkData(bench);
    } catch (err) {
      console.error('Failed to initialize application:', err);
    }
  };

  const roleMetaMap = roles.reduce((acc, r) => {
    acc[r.role] = r;
    return acc;
  }, {});

  const handleRunInvestigation = async (scenarioId, custom = null) => {
    setIsRunning(true);
    setActiveTab('pipeline');
    try {
      const result = await runInvestigation(scenarioId, activeRole, custom);
      setCurrentRunResult(result);

      const [rem, logs] = await Promise.all([
        fetchRemediations().catch(() => ({ remediations: [] })),
        fetchAuditLogs(100).catch(() => ({ audit_logs: [] })),
      ]);
      if (rem?.remediations) setRemediations(rem.remediations);
      if (logs?.audit_logs) setAuditLogs(logs.audit_logs);
    } catch (err) {
      alert(`Investigation failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const pendingRemediationsCount = remediations.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-sentinel-950 text-slate-100 font-sans">
      <Navbar
        activeRole={activeRole}
        onSelectRole={setActiveRole}
        roles={roles}
        health={health}
        roleMeta={roleMetaMap}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          scenarios={scenarios}
          selectedScenarioId={selectedScenarioId}
          onSelectScenario={setSelectedScenarioId}
          onRunInvestigation={handleRunInvestigation}
          isRunning={isRunning}
          activeRole={activeRole}
        />

        <main className="flex-1 flex flex-col overflow-hidden bg-[#070b12]">
          <div className="bg-sentinel-900/90 border-b border-sentinel-700/80 px-5 pt-3 flex items-center justify-between shrink-0 select-none backdrop-blur-md">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button
                onClick={() => setActiveTab('pipeline')}
                className={`px-3.5 py-2.5 rounded-t-xl text-xs font-semibold flex items-center space-x-2 transition-all border-b-2 ${
                  activeTab === 'pipeline'
                    ? 'bg-sentinel-850 text-sky-400 border-sky-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-sentinel-850/50 border-transparent'
                }`}
              >
                <GitPullRequest className="w-3.5 h-3.5" />
                <span>Agent Pipeline & Trace</span>
              </button>

              <button
                onClick={() => setActiveTab('telemetry')}
                className={`px-3.5 py-2.5 rounded-t-xl text-xs font-semibold flex items-center space-x-2 transition-all border-b-2 ${
                  activeTab === 'telemetry'
                    ? 'bg-sentinel-850 text-sky-400 border-sky-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-sentinel-850/50 border-transparent'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Telemetry & Logs</span>
              </button>

              <button
                onClick={() => setActiveTab('remediation')}
                className={`px-3.5 py-2.5 rounded-t-xl text-xs font-semibold flex items-center space-x-2 transition-all border-b-2 ${
                  activeTab === 'remediation'
                    ? 'bg-sentinel-850 text-sky-400 border-sky-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-sentinel-850/50 border-transparent'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>HITL Remediation Queue</span>
                {pendingRemediationsCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center font-mono">
                    {pendingRemediationsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`px-3.5 py-2.5 rounded-t-xl text-xs font-semibold flex items-center space-x-2 transition-all border-b-2 ${
                  activeTab === 'audit'
                    ? 'bg-sentinel-850 text-sky-400 border-sky-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-sentinel-850/50 border-transparent'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Eval Benchmark & Audit Log</span>
              </button>
            </div>

            <div className="hidden xl:flex items-center space-x-2 text-xs font-mono text-slate-400 pb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Guardrails: RBAC Deterministic</span>
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative">
            {activeTab === 'pipeline' && (
              <PipelineTrace
                runResult={currentRunResult}
                isRunning={isRunning}
                onNavigateToHITL={() => setActiveTab('remediation')}
              />
            )}

            {activeTab === 'telemetry' && (
              <LogTelemetryViewer
                runResult={currentRunResult}
                activeRole={activeRole}
                scenarioDetail={selectedScenarioDetail}
              />
            )}

            {activeTab === 'remediation' && (
              <RemediationQueue
                remediations={remediations}
                activeRole={activeRole}
                onRefresh={() => fetchRemediations().then((res) => setRemediations(res.remediations || []))}
                roleMeta={roleMetaMap}
              />
            )}

            {activeTab === 'audit' && (
              <AuditBenchmarkTab
                benchmarkData={benchmarkData}
                onBenchmarkUpdated={setBenchmarkData}
                auditLogs={auditLogs}
                onRefreshAuditLogs={() => fetchAuditLogs(100).then((res) => setAuditLogs(res.audit_logs || []))}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
