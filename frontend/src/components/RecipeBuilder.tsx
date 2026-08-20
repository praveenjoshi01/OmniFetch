import React, { useState } from 'react';
import { 
  Play, Save, Download, Upload, Plus, Trash2, ChevronUp, ChevronDown, 
  CheckCircle2, AlertCircle, Loader2, Sparkles, Layers, ListOrdered
} from 'lucide-react';
import { Recipe, Step, StepType } from '../types';

interface RecipeBuilderProps {
  apiBaseUrl: string;
  recipe: Recipe;
  savedRecipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  onSaveRecipe: (recipe: Recipe) => void;
  onRunRecipe: (recipeId: string) => void;
}

export const RecipeBuilder: React.FC<RecipeBuilderProps> = ({
  apiBaseUrl,
  recipe,
  savedRecipes,
  onSelectRecipe,
  onSaveRecipe,
  onRunRecipe
}) => {
  const [currentRecipe, setCurrentRecipe] = useState<Recipe>(recipe);
  const [testingStepId, setTestingStepId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; result?: any; error?: string }>>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Sync state when parent recipe prop changes
  React.useEffect(() => {
    setCurrentRecipe(recipe);
  }, [recipe]);

  const updateRecipeField = (field: keyof Recipe, val: any) => {
    setCurrentRecipe(prev => ({ ...prev, [field]: val }));
  };

  const updateStep = (index: number, key: keyof Step, val: any) => {
    const newSteps = [...currentRecipe.steps];
    newSteps[index] = { ...newSteps[index], [key]: val };
    setCurrentRecipe(prev => ({ ...prev, steps: newSteps }));
  };

  const addManualStep = () => {
    const newStep: Step = {
      id: crypto.randomUUID(),
      type: 'extract',
      selector: '',
      label: `Step ${currentRecipe.steps.length + 1}`,
      attribute: 'text',
      timeout: 5000
    };
    setCurrentRecipe(prev => ({ ...prev, steps: [...prev.steps, newStep] }));
  };

  const removeStep = (index: number) => {
    const newSteps = currentRecipe.steps.filter((_, i) => i !== index);
    setCurrentRecipe(prev => ({ ...prev, steps: newSteps }));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === currentRecipe.steps.length - 1) return;

    const newSteps = [...currentRecipe.steps];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIdx];
    newSteps[targetIdx] = temp;
    setCurrentRecipe(prev => ({ ...prev, steps: newSteps }));
  };

  const handleSave = () => {
    onSaveRecipe(currentRecipe);
    setSaveMessage('Recipe saved successfully!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(currentRecipe, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentRecipe.name.toLowerCase().replace(/\s+/g, '-')}-recipe.json`;
    a.click();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.name && Array.isArray(imported.steps)) {
          setCurrentRecipe({
            ...imported,
            id: crypto.randomUUID()
          });
        }
      } catch (err) {
        alert('Invalid Recipe JSON format');
      }
    };
    reader.readAsText(file);
  };

  const handleTestStep = async (step: Step) => {
    setTestingStepId(step.id);
    try {
      const res = await fetch(`${apiBaseUrl}/api/engine/test-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrl: currentRecipe.startUrl,
          step
        })
      });
      const data = await res.json();
      setTestResults(prev => ({ ...prev, [step.id]: data }));
    } catch (err: any) {
      setTestResults(prev => ({ ...prev, [step.id]: { success: false, error: err.message } }));
    } finally {
      setTestingStepId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', gap: '16px', overflowY: 'auto' }}>
      {/* Header Selector & Save Controls */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Recipe Builder</h3>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              className="input-field"
              style={{ width: '180px', fontSize: '12px' }}
              value={currentRecipe.id}
              onChange={(e) => {
                const found = savedRecipes.find(r => r.id === e.target.value);
                if (found) onSelectRecipe(found);
              }}
            >
              <option value="">Load Saved Recipe...</option>
              {savedRecipes.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>

            <button className="btn btn-secondary btn-sm" onClick={handleSave}>
              <Save size={14} /> Save
            </button>
          </div>
        </div>

        {saveMessage && (
          <div style={{ fontSize: '12px', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} /> {saveMessage}
          </div>
        )}

        {/* Recipe Metadata Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Recipe Name</label>
            <input 
              type="text"
              className="input-field"
              value={currentRecipe.name}
              onChange={(e) => updateRecipeField('name', e.target.value)}
              placeholder="e.g. Price Scraper"
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Start URL</label>
            <input 
              type="text"
              className="input-field input-mono"
              value={currentRecipe.startUrl}
              onChange={(e) => updateRecipeField('startUrl', e.target.value)}
              placeholder="https://example.com"
            />
          </div>
        </div>
      </div>

      {/* Step Sequence Header & Add Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ListOrdered size={16} style={{ color: 'var(--accent-cyan)' }} />
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Automation Sequence ({currentRecipe.steps.length} Steps)</span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={addManualStep}>
          <Plus size={14} /> Add Step
        </button>
      </div>

      {/* Step Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        {currentRecipe.steps.length === 0 ? (
          <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Sparkles size={32} style={{ color: 'var(--accent-primary)', marginBottom: '12px' }} />
            <p style={{ fontSize: '14px', marginBottom: '8px' }}>No steps recorded yet</p>
            <p style={{ fontSize: '12px', color: 'var(--text-dark)' }}>Turn on <strong>Pick Mode</strong> in the Browser Panel and click any element to auto-record capture steps!</p>
          </div>
        ) : (
          currentRecipe.steps.map((step, idx) => (
            <div key={step.id || idx} className="glass-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Step Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, width: '18px' }}>#{idx + 1}</span>
                  <span className={`badge badge-${step.type}`}>{step.type}</span>
                  <input
                    type="text"
                    className="input-field"
                    style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 500, width: '180px' }}
                    value={step.label || ''}
                    onChange={(e) => updateStep(idx, 'label', e.target.value)}
                    placeholder="Step label"
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => moveStep(idx, 'up')} disabled={idx === 0}>
                    <ChevronUp size={12} />
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => moveStep(idx, 'down')} disabled={idx === currentRecipe.steps.length - 1}>
                    <ChevronDown size={12} />
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => handleTestStep(step)} 
                    disabled={testingStepId === step.id}
                    title="Run test execution for this single step"
                  >
                    {testingStepId === step.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Test
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => removeStep(idx)} style={{ color: 'var(--danger-color)' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Step Configuration Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px', gap: '8px', alignItems: 'center' }}>
                <select
                  className="input-field"
                  style={{ fontSize: '12px' }}
                  value={step.type}
                  onChange={(e) => updateStep(idx, 'type', e.target.value as StepType)}
                >
                  <option value="navigate">navigate</option>
                  <option value="click">click</option>
                  <option value="type">type</option>
                  <option value="wait">wait</option>
                  <option value="extract">extract</option>
                  <option value="scroll">scroll</option>
                </select>

                {/* Dynamic Selector / Value Field */}
                {step.type === 'extract' || step.type === 'click' || step.type === 'type' || step.type === 'wait' || step.type === 'scroll' ? (
                  <input
                    type="text"
                    className="input-field input-mono"
                    style={{ fontSize: '11px' }}
                    value={step.selector || ''}
                    onChange={(e) => updateStep(idx, 'selector', e.target.value)}
                    placeholder="CSS Selector (e.g. .product-title or h1)"
                  />
                ) : (
                  <input
                    type="text"
                    className="input-field input-mono"
                    style={{ fontSize: '11px' }}
                    value={step.value || ''}
                    onChange={(e) => updateStep(idx, 'value', e.target.value)}
                    placeholder="Target URL or value"
                  />
                )}

                {/* Additional Value or Attribute field */}
                {step.type === 'extract' ? (
                  <select
                    className="input-field"
                    style={{ fontSize: '11px' }}
                    value={step.attribute || 'text'}
                    onChange={(e) => updateStep(idx, 'attribute', e.target.value)}
                  >
                    <option value="text">text</option>
                    <option value="href">href URL</option>
                    <option value="src">src URL</option>
                    <option value="html">raw HTML</option>
                    <option value="value">input value</option>
                  </select>
                ) : step.type === 'type' ? (
                  <input
                    type="text"
                    className="input-field"
                    style={{ fontSize: '11px' }}
                    value={step.value || ''}
                    onChange={(e) => updateStep(idx, 'value', e.target.value)}
                    placeholder="Text to type"
                  />
                ) : (
                  <input
                    type="number"
                    className="input-field"
                    style={{ fontSize: '11px' }}
                    value={step.timeout || 5000}
                    onChange={(e) => updateStep(idx, 'timeout', parseInt(e.target.value, 10))}
                    placeholder="Timeout ms"
                  />
                )}
              </div>

              {/* Inline Test Results Feedback */}
              {testResults[step.id] && (
                <div style={{ 
                  marginTop: '4px', 
                  padding: '6px 10px', 
                  borderRadius: '4px', 
                  fontSize: '11px',
                  background: testResults[step.id].success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${testResults[step.id].success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  color: testResults[step.id].success ? '#34d399' : '#f87171',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {testResults[step.id].success ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={13} />
                      <span>Test passed! Sample output: {JSON.stringify(testResults[step.id].result)}</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertCircle size={13} />
                      <span>Test failed: {testResults[step.id].error}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Main Execution Action Toolbar */}
      <div className="glass-panel" style={{ padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline btn-sm" onClick={handleExportJson}>
            <Download size={13} /> Export JSON
          </button>

          <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
            <Upload size={13} /> Import JSON
            <input type="file" accept=".json" onChange={handleImportJson} style={{ display: 'none' }} />
          </label>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={() => {
            handleSave();
            onRunRecipe(currentRecipe.id);
          }}
        >
          <Play size={16} /> Run Recipe Now
        </button>
      </div>
    </div>
  );
};
