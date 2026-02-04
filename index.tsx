
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

console.log("index.tsx: Iniciando montaje de React en #root...");

const mountApp = () => {
    const container = document.getElementById('root');
    if (!container) {
        console.error("index.tsx: Error Fatal - No se encontró el contenedor principal del DOM.");
        return;
    }

    try {
        const root = createRoot(container);
        root.render(
            <React.StrictMode>
                <App />
            </React.StrictMode>
        );
        console.log("index.tsx: App enviada al renderizador con éxito.");
    } catch (err: any) {
        console.error("index.tsx: Fallo durante la inicialización de React:", err);
        // Fallback visual directo si React falla al iniciar
        container.innerHTML = `
            <div style="color: white; background: #1e293b; padding: 20px; border-radius: 10px; font-family: sans-serif;">
                <h2 style="color: #ef4444;">❌ Error de Renderizado</h2>
                <p>${err.message}</p>
            </div>
        `;
    }
};

// Ejecución inmediata si el navegador ya procesó el DOM
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    mountApp();
} else {
    window.addEventListener('DOMContentLoaded', mountApp);
}
