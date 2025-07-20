import React from 'react';
import ReactDOM from 'react-dom/client';
import PreviewPlayer from './components/PreviewPlayer'; // Corrected import path
import './index.css';

// The '!' tells TypeScript we are certain that the element exists.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PreviewPlayer />
  </React.StrictMode>,
);
