import React, { useState, useEffect } from "react";
import Icon from "./Icons";
import { portalApi } from "./api";
import { nextScreen } from "./rules";
import { Brand, AuthShell, ErrorMessage } from "./PortalShared";
import Login from "./Login";
import OwnerSetup from "./OwnerSetup";
import OwnerWorkspace from "./OwnerWorkspace";
import "./business-portal.css";
export default function BusinessPortal({ api = portalApi, renderDashboard }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialError, setInitialError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setInitialError("");
    api
      .session(controller.signal)
      .then(setUser)
      .catch((error) => {
        if (error.name === "AbortError") return;
        if (error.status !== 401) setInitialError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [api, retry]);
  async function logout() {
    await api.logout();
    setUser(null);
  }
  const screen = nextScreen(user);
  if (loading)
    return (
      <div className="bp-root bp-loading">
        <Brand />
        <span className="bp-spinner" />
        <p>Opening your workspace…</p>
      </div>
    );
  if (screen === "login")
    return (
      <Login
        api={api}
        onVerified={setUser}
        connectivityError={initialError}
        onRetry={() => setRetry((x) => x + 1)}
      />
    );
  if (screen === "onboarding")
    return (
      <OwnerSetup
        api={api}
        user={user}
        onSaved={setUser}
        onLogout={logout}
        onExpired={() => setUser(null)}
      />
    );
  // Your existing dashboard can be supplied here; admin routes/components are never imported.
  if (renderDashboard)
    return <div className="bp-root">{renderDashboard({ user, logout })}</div>;
  return (
    <OwnerWorkspace
      api={api}
      user={user}
      onLogout={logout}
      onExpired={() => setUser(null)}
    />
  );
}
