import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { store } from "./app/store";
import AppRoutes from "./routes/AppRoutes";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { MobileNotice } from "./components/MobileNotice";
import { NotificationProvider } from "./features/notifications";
import { ThemeProvider } from "./features/theme";
import { Toaster } from "react-hot-toast";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ThemeProvider>
        <NotificationProvider>
        <ErrorBoundary>
          <a href="#main-content" className="skip-to-content">Skip to content</a>
          <AppRoutes />
          <MobileNotice />
        </ErrorBoundary>
        </NotificationProvider>
        </ThemeProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
            },
          }}
        />
      </BrowserRouter>
    </Provider>
  </StrictMode>
);