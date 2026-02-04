
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

console.log("DOM detectado, iniciando React Root...");

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("Error Fatal: No se encontró el elemento 'root' en el DOM.");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("Renderizado de App iniciado correctamente.");
  } catch (err: any) {
    console.error("Error durante el renderizado inicial:", err);
    rootElement.innerHTML = `
      <div style="color: white; padding: 40px; font-family: sans-serif;">
        <h2 style="color: #ef4444;">❌ Error de Renderizado</h2>
        <pre style="background: #1e293b; padding: 20px; border-radius: 10px; margin-top: 10px;">${err.message}</pre>
      </div>
    `;
  }
}
