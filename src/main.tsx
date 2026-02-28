import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeSettings } from "./pages/Settings";

// Apply persisted settings (theme, accent, font) before first render
initializeSettings();

createRoot(document.getElementById("root")!).render(<App />);
