// In src/preview.jsx

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Change this line to be more explicit:
import PreviewPlayer from './components/PreviewPlayer.jsx' 
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PreviewPlayer />
  </StrictMode>,
)