import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Запрещаем браузеру/Electron открывать файл вместо приложения при перетаскивании
window.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); }, false);
window.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); }, false);
window.addEventListener('dragenter', (e) => { e.preventDefault(); e.stopPropagation(); }, false);
window.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); }, false);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
