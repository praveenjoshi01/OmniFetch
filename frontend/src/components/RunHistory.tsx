import React, { useState } from 'react';
import { History, CheckCircle2, XCircle, Clock, FileText, ChevronRight } from 'lucide-react';
import { Run, LogEntry } from '../types';

interface RunHistoryProps {
  runs: Run[];
  onSelectRun: (runId: string) => void;
}

export const RunHistory: React.FC<RunHistoryProps> = ({ runs, onSelectRun }) => {
  const [selectedRunLogs, setSelectedRunLogs] = useState<{ runId: string; logs: LogEntry[] } | null>(null);

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <History size={18} style={{ color: 'var(--accent-primary)' }} />
        <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Execution Run History</h3>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {runs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            No run history available yet.
          </div>
        ) : (
          runs.map(run => {
            const startedStr = new Date(run.startedAt).toLocaleTimeString();
            return (
              <div 
                key={run.id} 
                className="glass-card" 
                style={{ padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => onSelectRun(run.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {run.status === 'success' && <CheckCircle2 size={20} style={{ color: 'var(--success-color)' }} />}
                  {run.status === 'failed' && <XCircle size={20} style={{ color: 'var(--danger-color)' }} />}
                  {run.status === 'running' && <Clock size={20} className="animate-spin" style={{ color: 'var(--accent-cyan)' }} />}
                  {run.status === 'pending' && <Clock size={20} style={{ color: 'var(--text-muted)' }} />}

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                        Run #{run.id.substring(0, 8)}
                      </span>
                      <span className={`badge badge-${run.status}`}>{run.status}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Started at {startedStr} • {run.resultCount} rows extracted
                    </div>
                    {run.errorMessage && (
                      <div style={{ fontSize: '11px', color: 'var(--danger-color)', marginTop: '4px' }}>
                        Error: {run.errorMessage}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {run.logs && run.logs.length > 0 && (
                    <button 
                      className="btn btn-outline btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRunLogs({ runId: run.id, logs: run.logs || [] });
                      }}
                    >
                      <FileText size={12} /> Logs
                    </button>
                  )}
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Log Details Modal */}
      {selectedRunLogs && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '20px', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                Execution Logs: Run #{selectedRunLogs.runId.substring(0, 8)}
              </h4>
              <button className="btn btn-outline btn-sm" onClick={() => setSelectedRunLogs(null)}>Close</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', background: '#090d16', padding: '12px', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {selectedRunLogs.logs.map((log, i) => (
                <div key={i} style={{ color: log.status === 'error' ? '#f87171' : log.status === 'success' ? '#34d399' : '#94a3b8' }}>
                  [{new Date(log.timestamp).toLocaleTimeString()}] [{log.stepType}] {log.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
