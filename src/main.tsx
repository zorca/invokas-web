import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { runtimeProblem } from "./lib/browser-runtime";

const root = document.getElementById("root") as HTMLElement;
const problem = runtimeProblem(location.protocol, location.hostname, import.meta.env.VITE_ALLOWED_HOSTS ?? "");
if (problem) {
  root.textContent = "Invokas работает только на сайте. Откройте оригинальную страницу приложения через HTTP/HTTPS.";
} else {
  try {
    const key = "invokas:storage-probe";
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    ReactDOM.createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
  } catch {
    root.textContent = "Браузер запретил локальное хранилище. Разрешите сохранение данных для этого сайта и обновите страницу.";
  }
}
