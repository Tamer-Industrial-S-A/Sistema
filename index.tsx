

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

const startApp = () => {
  const container = document.getElementById('root');
  if (!container) return;

  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("TAMER ERP: Aplicación montada con éxito.");
  } catch (error: any) {
    console.error("Error crítico en el montaje:", error);
    // Use type assertion to any to access custom showError function injected at runtime
    if ((window as any).showError) {
      (window as any).showError("Error de Inicio", error.message, "index.tsx");
    }
  }
};

// Asegurar que el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
} 
