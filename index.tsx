
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Buscamos el elemento root definido en el index.html
const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("No se encontró el elemento 'root'. Asegúrese de que existe en el index.html.");
} else {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
