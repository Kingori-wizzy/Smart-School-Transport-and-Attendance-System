import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './assets/styles/index.css';

// Make toast available globally
import toast from 'react-hot-toast';
window.toast = toast;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 5000,
        style: {
          background: '#363636',
          color: '#fff',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#4CAF50',
            secondary: '#fff',
          },
        },
        error: {
          duration: 4000,
          iconTheme: {
            primary: '#f44336',
            secondary: '#fff',
          },
        },
      }}
    />
    <App />
  </React.StrictMode>
);