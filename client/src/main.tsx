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
    message.includes('loop completed with undelivered notifications')
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

createRoot(document.getElementById("root")!).render(<App />);
