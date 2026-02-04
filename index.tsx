
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');

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
    rootElement.innerHTML = `<div style="color: white; padding: 20px;">Error al iniciar React: ${err.message}</div>`;
  }
}
