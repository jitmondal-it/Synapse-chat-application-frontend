import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter } from "react-router";

import { Toaster } from "react-hot-toast";
import { ChatProvider } from "./context/ChatContext.jsx";
import AppRoutes from "./config/Routes.jsx";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3000,

        style: {
          background: "#111827",
          color: "#e0f2fe",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          borderRadius: "14px",
          padding: "14px 18px",
          boxShadow:
            "0 8px 30px rgba(0,0,0,0.35), 0 0 20px rgba(56,189,248,0.12)",
          fontSize: "14px",
          fontWeight: "600",
        },

        success: {
          iconTheme: {
            primary: "#38bdf8",
            secondary: "#082f49",
          },
        },

        error: {
          iconTheme: {
            primary: "#fb7185",
            secondary: "#450a0a",
          },
        },
      }}
    />
    <ChatProvider>
      <AppRoutes />
    </ChatProvider>
  </BrowserRouter>
);
