import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress ResizeObserver and Dialog warnings globally
const originalError = window.console.error;
const originalWarn = window.console.warn;

window.console.error = (...args: any[]) => {
  const message = args[0];
  if (typeof message === 'string' && (
    message.includes('ResizeObserver') ||
    message.includes('loop completed with undelivered notifications') ||
    message.includes('unknown runtime error')
  )) {
    return;
  }
  originalError(...args);
};

window.console.warn = (...args: any[]) => {
  const message = args[0];
  if (typeof message === 'string' && (
    message.includes('Missing `Description`') ||
    message.includes('aria-describedby')
  )) {
    return;
  }
  originalWarn(...args);
};

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  if (event.message && (
    event.message.includes('ResizeObserver') ||
    event.message.includes('unknown runtime error')
  )) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && (
    event.reason.message.includes('ResizeObserver') ||
    event.reason.message.includes('unknown runtime error')
  )) {
    event.preventDefault();
    return false;
  }
});

createRoot(document.getElementById("root")!).render(<App />);
