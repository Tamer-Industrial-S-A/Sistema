import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

console.log("index.tsx: Iniciando montaje de React...");

const mountApp = () => {
    const container = document.getElementById('root');
    if (!container) return;

    try {
        const root = createRoot(container);
        root.render(
            <React.StrictMode>
                <App />
            </React.StrictMode>
        );
        console.log("index.tsx: Aplicación montada correctamente.");
    } catch (err: any) {
        console.error("index.tsx: Error fatal en el arranque:", err);
        if ((window as any).showError) {
            (window as any).showError("Fallo de Renderizado", err.message);
        }
    }
};

// Iniciar inmediatamente o esperar al DOM
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    mountApp();
} else {
    window.addEventListener('DOMContentLoaded', mountApp);
}
