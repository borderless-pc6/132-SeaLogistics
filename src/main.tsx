import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigMissing } from "./components/config-missing/config-missing";
import "./index.css";

const REQUIRED_ENV = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_APP_ID",
] as const;

const missing = REQUIRED_ENV.filter((key) => !import.meta.env[key]);

const root = createRoot(document.getElementById("root")!);

if (missing.length > 0) {
  root.render(
    <StrictMode>
      <ConfigMissing missing={[...missing]} />
    </StrictMode>
  );
} else {
  import("./routes/App.tsx").then(({ App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
}
