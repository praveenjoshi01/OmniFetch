import React, { useState, useEffect, useRef } from 'react';
import { Globe, ArrowLeft, ArrowRight, RotateCw, MousePointerClick, Plus, Sparkles, Check } from 'lucide-react';
import { SelectedElement, Step } from '../types';

interface BrowserPanelProps {
  apiBaseUrl: string;
  initialUrl: string;
  onAddStep: (step: Partial<Step>) => void;
}

export const BrowserPanel: React.FC<BrowserPanelProps> = ({
  apiBaseUrl,
  initialUrl,
  onAddStep
}) => {
  const [urlInput, setUrlInput] = useState<string>(initialUrl);
  const [activeUrl, setActiveUrl] = useState<string>(initialUrl);
  const [history, setHistory] = useState<string[]>([initialUrl]);
  const [historyIdx, setHistoryIdx] = useState<number>(0);
  const [isPickMode, setIsPickMode] = useState<boolean>(true);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [addedNotice, setAddedNotice] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    setUrlInput(initialUrl);
    setActiveUrl(initialUrl);
  }, [initialUrl]);

  // Listen to postMessages from injected picker script in iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'WEBCAPTURE_ELEMENT_SELECTED') {
        setSelectedElement({
          selector: event.data.selector,
          text: event.data.text,
          tagName: event.data.tagName,
          attributes: event.data.attributes || {}
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Update pick mode status inside iframe
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'SET_PICK_MODE',
        enabled: isPickMode
      }, '*');
    }
  }, [isPickMode, activeUrl]);

  const handleNavigate = (targetUrl: string) => {
    let cleanUrl = targetUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    setUrlInput(cleanUrl);
    setActiveUrl(cleanUrl);
    setIsLoading(true);

    const newHistory = history.slice(0, historyIdx + 1);
    newHistory.push(cleanUrl);
    setHistory(newHistory);
    setHistoryIdx(newHistory.length - 1);
  };

  const handleBack = () => {
    if (historyIdx > 0) {
      const prevUrl = history[historyIdx - 1];
      setHistoryIdx(historyIdx - 1);
      setUrlInput(prevUrl);
      setActiveUrl(prevUrl);
    }
  };

  const handleForward = () => {
    if (historyIdx < history.length - 1) {
      const nextUrl = history[historyIdx + 1];
      setHistoryIdx(historyIdx + 1);
      setUrlInput(nextUrl);
      setActiveUrl(nextUrl);
    }
  };

  const proxySrc = `${apiBaseUrl}/api/proxy?url=${encodeURIComponent(activeUrl)}&pickMode=${isPickMode}`;

  const triggerAddStep = (type: Step['type'], attribute?: string) => {
    if (!selectedElement) return;

    let defaultLabel = '';
    if (type === 'extract') {
      defaultLabel = selectedElement.text 
        ? selectedElement.text.substring(0, 24) 
        : `${selectedElement.tagName}_data`;
    }

    onAddStep({
      type,
      selector: selectedElement.selector,
      attribute: attribute || 'text',
      label: defaultLabel || `${type}_${selectedElement.tagName}`
    });

    setAddedNotice(`Added ${type.toUpperCase()} step for ${selectedElement.selector}`);
    setTimeout(() => setAddedNotice(null), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
      {/* Top Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleBack} disabled={historyIdx <= 0} title="Back">
            <ArrowLeft size={14} />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleForward} disabled={historyIdx >= history.length - 1} title="Forward">
            <ArrowRight size={14} />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveUrl(activeUrl)} title="Reload">
            <RotateCw size={14} />
          </button>
        </div>

        {/* URL Input */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleNavigate(urlInput); }}
          style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative' }}
        >
          <Globe size={15} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
          <input 
            type="text"
            className="input-field input-mono"
            style={{ paddingLeft: '34px', paddingRight: '60px' }}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Enter target URL (e.g. https://quotes.toscrape.com)"
          />
          <button type="submit" className="btn btn-primary btn-sm" style={{ position: 'absolute', right: '4px' }}>
            Go
          </button>
        </form>

        {/* Pick Mode Toggle */}
        <button 
          className={`btn btn-pick ${isPickMode ? 'active' : ''}`}
          onClick={() => setIsPickMode(!isPickMode)}
          title="Point & click elements inside the page to capture selectors"
        >
          <MousePointerClick size={16} />
          <span>{isPickMode ? 'Pick Mode ON' : 'Pick Mode OFF'}</span>
        </button>
      </div>

      {/* Main Iframe Viewer */}
      <div style={{ flex: 1, position: 'relative', background: '#ffffff' }}>
        {isLoading && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--accent-gradient)', zIndex: 10, animation: 'pulse 1s infinite' }} />
        )}
        <iframe
          ref={iframeRef}
          src={proxySrc}
          title="WebCapture Proxy Browser"
          style={{ width: '100%', height: '100%', border: 'none' }}
          onLoad={() => setIsLoading(false)}
        />
      </div>

      {/* Selected Element Floating Inspector Card */}
      {selectedElement && (
        <div className="animate-fade-in" style={{ padding: '12px 16px', background: 'rgba(15, 23, 42, 0.95)', borderTop: '1px solid var(--border-active)', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-extract">Selected Node</span>
              <span style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                &lt;{selectedElement.tagName}&gt;
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-main)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '350px' }}>
                {selectedElement.selector}
              </span>
            </div>
            {addedNotice && (
              <span style={{ fontSize: '12px', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={14} /> {addedNotice}
              </span>
            )}
          </div>

          {selectedElement.text && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', fontStyle: 'italic', background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '4px' }}>
              "{selectedElement.text}"
            </div>
          )}

          {/* Quick Step Addition Buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={() => triggerAddStep('extract', 'text')}>
              <Sparkles size={13} /> Extract Text
            </button>

            {selectedElement.attributes['href'] && (
              <button className="btn btn-secondary btn-sm" onClick={() => triggerAddStep('extract', 'href')}>
                <Plus size={13} /> Extract Link URL (href)
              </button>
            )}

            {selectedElement.attributes['src'] && (
              <button className="btn btn-secondary btn-sm" onClick={() => triggerAddStep('extract', 'src')}>
                <Plus size={13} /> Extract Image (src)
              </button>
            )}

            <button className="btn btn-outline btn-sm" onClick={() => triggerAddStep('click')}>
              <MousePointerClick size={13} /> Add Click Step
            </button>

            <button className="btn btn-outline btn-sm" onClick={() => triggerAddStep('type')}>
              <Plus size={13} /> Add Type Input Step
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
