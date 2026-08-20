import React from 'react';
import { WebCapturePanel } from './components/WebCapturePanel';

export const App: React.FC = () => {
  return (
    <WebCapturePanel 
      apiBaseUrl="" 
      initialUrl="https://news.ycombinator.com" 
    />
  );
};

export default App;
