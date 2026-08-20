import React, { useState, useEffect } from 'react';
import { BrowserPanel } from './BrowserPanel';
import { RecipeBuilder } from './RecipeBuilder';
import { ResultsTable } from './ResultsTable';
import { RunHistory } from './RunHistory';
import { Recipe, Run, CapturedRow, Step } from '../types';
import { Layers, History, Database, Sparkles } from 'lucide-react';

export interface WebCapturePanelProps {
  apiBaseUrl?: string;
  initialUrl?: string;
  readOnly?: boolean;
  theme?: 'dark' | 'light';
}

export const WebCapturePanel: React.FC<WebCapturePanelProps> = ({
  apiBaseUrl = 'http://localhost:5001',
  initialUrl = 'https://news.ycombinator.com',
  readOnly = false,
  theme = 'dark'
}) => {
  const [activeTab, setActiveTab] = useState<'studio' | 'history' | 'results'>('studio');
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [currentRecipe, setCurrentRecipe] = useState<Recipe>({
    id: crypto.randomUUID(),
    name: 'New Capture Recipe',
    startUrl: initialUrl,
    steps: []
  });

  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [capturedResults, setCapturedResults] = useState<CapturedRow[]>([]);
  const [activeRunNotification, setActiveRunNotification] = useState<string | null>(null);

  // Fetch saved recipes
  const fetchRecipes = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/recipes`);
      if (res.ok) {
        const data = await res.json();
        setSavedRecipes(data);
        if (data.length > 0 && !currentRecipe.name) {
          setCurrentRecipe(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load recipes', err);
    }
  };

  // Fetch run history
  const fetchRuns = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/runs`);
      if (res.ok) {
        const data = await res.json();
        setRuns(data);
      }
    } catch (err) {
      console.error('Failed to load runs', err);
    }
  };

  // Fetch results for selected run
  const fetchRunResults = async (runId: string) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/runs/${runId}/results`);
      if (res.ok) {
        const data = await res.json();
        setCapturedResults(data);
      }
    } catch (err) {
      console.error('Failed to load results', err);
    }
  };

  useEffect(() => {
    fetchRecipes();
    fetchRuns();

    const interval = setInterval(fetchRuns, 4000);
    return () => clearInterval(interval);
  }, [apiBaseUrl]);

  useEffect(() => {
    if (selectedRunId) {
      fetchRunResults(selectedRunId);
    }
  }, [selectedRunId, apiBaseUrl]);

  const handleSaveRecipe = async (recipeToSave: Recipe) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipeToSave)
      });
      if (res.ok) {
        const saved = await res.json();
        setCurrentRecipe(saved);
        fetchRecipes();
      }
    } catch (err) {
      console.error('Failed to save recipe', err);
    }
  };

  const handleRunRecipe = async (recipeId: string) => {
    try {
      setActiveRunNotification('Initiating background headless Playwright run...');
      const res = await fetch(`${apiBaseUrl}/api/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId })
      });

      if (res.ok) {
        setTimeout(() => {
          fetchRuns();
          setActiveRunNotification('Run completed! Navigating to results view...');
          setTimeout(() => {
            setActiveRunNotification(null);
            // Select newest run
            fetchRuns().then(() => {
              if (runs.length > 0) {
                setSelectedRunId(runs[0].id);
              }
              setActiveTab('results');
            });
          }, 1500);
        }, 3500);
      }
    } catch (err) {
      setActiveRunNotification('Run failed to launch.');
      setTimeout(() => setActiveRunNotification(null), 3000);
    }
  };

  const handleAddStepFromBrowser = (stepPartial: Partial<Step>) => {
    const newStep: Step = {
      id: crypto.randomUUID(),
      type: stepPartial.type || 'extract',
      selector: stepPartial.selector || '',
      attribute: stepPartial.attribute || 'text',
      label: stepPartial.label || `Step ${currentRecipe.steps.length + 1}`,
      timeout: 5000
    };

    setCurrentRecipe(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', background: 'var(--bg-primary)', color: 'var(--text-main)', overflow: 'hidden' }}>
      {/* Top Header Bar */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: 'rgba(15, 23, 42, 0.9)', borderBottom: '1px solid var(--border-subtle)', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(99, 102, 241, 0.5)' }}>
            <Sparkles size={18} style={{ color: '#ffffff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.3px', background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              WebCapture Studio
            </h1>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Embeddable Browser Automation & Data Extraction</span>
          </div>
        </div>

        {/* Top Tab Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={async () => {
              try {
                setActiveRunNotification('Initializing demo list-maker title scraper...');
                const res = await fetch(`${apiBaseUrl}/api/runs`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ recipeId: 'demo-list-maker' })
                });
                if (res.ok) {
                  const runObj = await res.json();
                  setActiveRunNotification('Scraping tiles in background Playwright instance...');
                  setTimeout(() => {
                    fetchRuns();
                    setSelectedRunId(runObj.id);
                    setActiveRunNotification('Successfully scraped tile titles! Opening results.');
                    setTimeout(() => {
                      setActiveRunNotification(null);
                      setActiveTab('results');
                    }, 1500);
                  }, 4000);
                } else {
                  throw new Error();
                }
              } catch (_) {
                setActiveRunNotification('Demo scraper run failed. Check backend service logs.');
                setTimeout(() => setActiveRunNotification(null), 3000);
              }
            }}
            style={{ marginRight: '8px', background: 'rgba(20, 184, 166, 0.15)', borderColor: 'rgba(20, 184, 166, 0.4)', color: '#2dd4bf' }}
          >
            <Sparkles size={14} /> Run List-Maker Demo
          </button>

          <div style={{ display: 'flex', gap: '4px', background: 'rgba(30, 41, 59, 0.6)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <button 
              className={`btn btn-sm ${activeTab === 'studio' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('studio')}
            >
              <Layers size={14} /> Automation Studio
            </button>

            <button 
              className={`btn btn-sm ${activeTab === 'results' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('results')}
            >
              <Database size={14} /> Data Results ({capturedResults.length})
            </button>

            <button 
              className={`btn btn-sm ${activeTab === 'history' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('history')}
            >
              <History size={14} /> Run History ({runs.length})
            </button>
          </div>
        </div>
      </header>

      {/* Active Run Notification Toast */}
      {activeRunNotification && (
        <div className="animate-fade-in" style={{ padding: '8px 16px', background: 'var(--accent-gradient)', color: '#ffffff', fontSize: '13px', fontWeight: 500, textAlign: 'center' }}>
          {activeRunNotification}
        </div>
      )}

      {/* Main Tab Body */}
      <main style={{ flex: 1, padding: '16px', overflow: 'hidden' }}>
        {activeTab === 'studio' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', height: '100%' }}>
            <BrowserPanel
              apiBaseUrl={apiBaseUrl}
              initialUrl={currentRecipe.startUrl}
              onAddStep={handleAddStepFromBrowser}
            />
            <RecipeBuilder
              apiBaseUrl={apiBaseUrl}
              recipe={currentRecipe}
              savedRecipes={savedRecipes}
              onSelectRecipe={(r) => setCurrentRecipe(r)}
              onSaveRecipe={handleSaveRecipe}
              onRunRecipe={handleRunRecipe}
            />
          </div>
        )}

        {activeTab === 'results' && (
          <ResultsTable
            apiBaseUrl={apiBaseUrl}
            runId={selectedRunId || (runs.length > 0 ? runs[0].id : null)}
            results={capturedResults}
          />
        )}

        {activeTab === 'history' && (
          <RunHistory
            runs={runs}
            onSelectRun={(id) => {
              setSelectedRunId(id);
              setActiveTab('results');
            }}
          />
        )}
      </main>
    </div>
  );
};
