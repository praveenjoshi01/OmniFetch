import React, { useState } from 'react';
import { Download, Search, Table as TableIcon, Database } from 'lucide-react';
import { CapturedRow } from '../types';

interface ResultsTableProps {
  apiBaseUrl: string;
  runId: string | null;
  results: CapturedRow[];
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  apiBaseUrl,
  runId,
  results
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!runId || results.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Database size={40} style={{ color: 'var(--accent-primary)', marginBottom: '12px' }} />
        <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>No Data Results Captured Yet</h4>
        <p style={{ fontSize: '13px' }}>Run a Recipe workflow to extract structured data rows and view them here!</p>
      </div>
    );
  }

  // Extract all column headers from data objects
  const rawRows = results.map(r => r.data);
  const columns = Array.from(new Set(rawRows.flatMap(r => Object.keys(r))));

  // Filter rows based on search query
  const filteredRows = rawRows.filter(row => {
    if (!searchQuery) return true;
    const strVal = JSON.stringify(row).toLowerCase();
    return strVal.includes(searchQuery.toLowerCase());
  });

  const handleDownloadCsv = () => {
    window.location.href = `${apiBaseUrl}/api/runs/${runId}/export?format=csv`;
  };

  const handleDownloadJson = () => {
    window.location.href = `${apiBaseUrl}/api/runs/${runId}/export?format=json`;
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', gap: '16px' }}>
      {/* Header Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TableIcon size={18} style={{ color: 'var(--accent-cyan)' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Captured Data Results</h3>
          <span className="badge badge-success" style={{ marginLeft: '6px' }}>
            {filteredRows.length} Rows Extracted
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Search Filter */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '30px', fontSize: '12px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search extracted data..."
            />
          </div>

          <button className="btn btn-primary btn-sm" onClick={handleDownloadCsv}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleDownloadJson}>
            <Download size={14} /> Export JSON
          </button>
        </div>
      </div>

      {/* Table Data View */}
      <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, zIndex: 5 }}>
              <th style={{ padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 600, width: '50px' }}>#</th>
              {columns.map(col => (
                <th key={col} style={{ padding: '10px 14px', color: 'var(--accent-cyan)', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)', background: idx % 2 === 0 ? 'rgba(30, 41, 59, 0.2)' : 'transparent' }}>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{idx + 1}</td>
                {columns.map(col => {
                  const val = row[col];
                  const isUrl = typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'));
                  return (
                    <td key={col} style={{ padding: '10px 14px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {isUrl ? (
                        <a href={val} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                          {val}
                        </a>
                      ) : (
                        val !== null && val !== undefined ? String(val) : <span style={{ color: 'var(--text-dark)' }}>null</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
