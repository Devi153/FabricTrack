import React, { useState } from "react";
import Icon from "./Icons";
import { AuthShell, ErrorMessage } from "./PortalShared";
export default function OwnerSetup({
  api,
  user,
  onSaved,
  onLogout,
  onExpired,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      onSaved(await api.saveProfile(values));
    } catch (error) {
      if (error.status === 401) {
        onExpired();
        return;
      }
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await onLogout();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <AuthShell step={3}>
      <div className="bp-form-header">
        <span className="bp-form-icon">
          <Icon name="fabric" size={23} />
        </span>
        <div className="bp-kicker">A SPACE THAT’S TRULY YOURS</div>
        <h1>Let’s make it your business.</h1>
        <p>
          Your number <strong>{user.phone}</strong> is verified.
          <br />
          Add a few details to open your personal workspace.
        </p>
      </div>
      <form onSubmit={save} className="bp-setup-form">
        <div className="bp-form-grid">
          <label>
            Your name
            <input
              name="ownerName"
              autoComplete="name"
              placeholder="Your full name"
              maxLength={100}
              defaultValue={user.ownerName || ""}
              required
            />
          </label>
          <label>
            Business name
            <input
              name="businessName"
              autoComplete="organization"
              placeholder="Your studio or company"
              maxLength={120}
              defaultValue={user.businessName || ""}
              required
            />
          </label>
          <label>
            Email address <span className="bp-optional">optional</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@yourbusiness.com"
              maxLength={254}
              defaultValue={user.email || ""}
            />
          </label>
          <label>
            City <span className="bp-optional">optional</span>
            <input
              name="city"
              autoComplete="address-level2"
              placeholder="Where you create"
              maxLength={100}
              defaultValue={user.city || ""}
            />
          </label>
        </div>
        <div className="bp-start-plan">
          <span className="bp-start-plan-icon">
            <Icon name="leaf" size={20} />
          </span>
          <div>
            <strong>Start with Free</strong>
            <p>₹0 forever · 5 fabrics · 1 team member</p>
          </div>
          <span>No card needed</span>
        </div>
        <ErrorMessage message={error} />
        <button className="bp-button" disabled={busy}>
          {busy ? "Saving your details…" : "Open my workspace"}
          <Icon name="arrow" size={17} />
        </button>
        <p className="bp-consent">
          Your inventory starts empty. Add your own fabrics
          <br />
          after your workspace is ready.
        </p>
      </form>
      <button className="bp-back" disabled={busy} onClick={logout}>
        <Icon name="back" size={14} />
        Use a different account
      </button>
    </AuthShell>
  );
}
