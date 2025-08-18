// src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { DataProvider } from './context/DataContext'; // <-- ADD THIS LINE

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DataProvider> {/* <-- ADD THIS WRAPPER */}
      <App />
    </DataProvider> {/* <-- ADD THIS WRAPPER */}
  </React.StrictMode>,
);