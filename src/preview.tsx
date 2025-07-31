import React from 'react';
import ReactDOM from 'react-dom/client';
import PreviewHost from './PreviewHost';
import './index.css'; // Optional: for global styles if needed

// Create a root div for React to mount into
const rootElement = document.createElement('div');
rootElement.id = 'react-root';
document.body.appendChild(rootElement);

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <PreviewHost />
  </React.StrictMode>
);