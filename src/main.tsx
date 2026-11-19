import { createRoot } from "react-dom/client";
// Traduções: tem de carregar antes da aplicação.
import "./i18n";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
