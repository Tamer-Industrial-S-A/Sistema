
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

// Sistema de diagnóstico para errores de carga (Pantalla en blanco)
window.onerror = function(message, source, lineno, colno, error) {
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 40px; font-family: sans-serif; color: #ef4444; background: #fee2e2; border: 2px solid #ef4444; border-radius: 12px; margin: 20px;">
        <h1 style="margin-top: 0;">⚠️ Error de Carga del Sistema</h1>
        <p><strong>Mensaje:</strong> ${message}</p>
        <p style="font-size: 12px; color: #991b1b;">Origen: ${source} (Línea: ${lineno})</p>
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
          Reintentar Carga
        </button>
      </div>
    `;
  }
  return false;
};

if (!rootElement) {
  console.error("No se encontró el elemento 'root'.");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error("Error durante el renderizado:", err);
  }
}
