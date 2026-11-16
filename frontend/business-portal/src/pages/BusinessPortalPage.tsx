import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api/client";
import type { Account, Challenge, Login } from "../api/client";

const sections = [
  "Overview",
  "Inventory",
  "Group Buying",
  "Orders",
  "Subscription",
  "Settings",
];
export default function App() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("fabrictrack.business.session") || "",
  );
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(!!token);
  const [mode, setMode] = useState<"register" | "login">("register");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+91");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [wait, setWait] = useState(0);
  const [expires, setExpires] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [dev, setDev] = useState(false);
  const [section, setSection] = useState("Overview");
  const clearSession = () => {
    sessionStorage.removeItem("fabrictrack.business.session");
    setToken("");
    setAccount(null);
    setChallenge(null);
    setCode("");
  };
  useEffect(() => {
    api<{ development: boolean }>("/auth/config")
      .then((v) => setDev(v.development))
      .catch(() =>
        setError(
          "Business service is not ready. Start the backend with business enabled.",
        ),
      );
  }, []);
  useEffect(() => {
    if (!token) return;
    let active = true;
    api<{ account: Account }>("/dashboard", undefined, token)
      .then((v) => {
        if (active) {
          setAccount(v.account);
          setError("");
        }
      })
      .catch((e) => {
        if (active) {
          if (e instanceof ApiError && e.status === 401) clearSession();
          setError(e.message || "Could not load your dashboard.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);
  useEffect(() => {
    if (!token) return;
    // Re-check expiry while the dashboard is open, including after returning to the tab.
    let active = true;
    const check = () =>
      api<Account>("/me", undefined, token)
        .then((value) => {
          if (active) setAccount(value);
        })
        .catch((e) => {
          if (active && e instanceof ApiError && e.status === 401) {
            clearSession();
            setError("Your session expired. Please sign in again.");
          }
        });
    const timer = window.setInterval(check, 60000);
    window.addEventListener("focus", check);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", check);
    };
  }, [token]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setWait((v) => Math.max(0, v - 1));
      setExpires((v) => Math.max(0, v - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  async function perform(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function send(e?: FormEvent) {
    e?.preventDefault();
    await perform(async () => {
      const c = await api<Challenge>("/auth/start", {
        phone,
        name,
        purpose: mode,
      });
      setChallenge(c);
      setDev(c.development);
      setWait(c.resendAfter);
      setExpires(c.expiresIn);
      setCode("");
    });
  }
  async function verify(e: FormEvent) {
    e.preventDefault();
    await perform(async () => {
      const result = await api<Login>("/auth/verify", {
        challengeId: challenge?.challengeId,
        code,
      });
      sessionStorage.setItem("fabrictrack.business.session", result.token);
      setToken(result.token);
      setAccount(result.account);
      setChallenge(null);
      setCode("");
      setSection("Overview");
    });
  }
  async function logout() {
    await perform(async () => {
      await api("/auth/logout", {}, token);
      clearSession();
    });
  }
  if (loading) return <div className="loading">Opening your workspace…</div>;
  if (token && !account)
    return (
      <main className="recovery">
        <h1>Workspace unavailable</h1>
        <p role="alert">{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
        <button className="secondary" onClick={clearSession}>
          Back to sign in
        </button>
      </main>
    );
  if (account)
    return (
      <div className="workspace">
        <aside>
          <a className="brand" href="/">
            ▧{" "}
            <span>
              FabricTrack<small>BUSINESS WORKSPACE</small>
            </span>
          </a>
          <div className="workspace-label">YOUR WORKSPACE</div>
          <nav aria-label="Main navigation">
            {sections.map((s, i) => (
              <button
                key={s}
                className={section === s ? "selected" : ""}
                onClick={() => setSection(s)}
              >
                <span>{["◫", "▤", "◎", "▣", "◇", "⚙"][i]}</span>
                {s}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <span className="avatar">
              {account.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{account.name}</strong>
              <small>{account.phone}</small>
            </div>
          </div>
        </aside>
        <main className="dashboard">
          <header>
            <div>
              <span className="eyebrow">BUSINESS PORTAL</span>
              <h2>{section}</h2>
            </div>
            <div className="header-actions">
              <span className="plan">
                {account.plan === "STANDARD" ? "Standard" : "Free"} plan
              </span>
              <button className="secondary" disabled={busy} onClick={logout}>
                Sign out
              </button>
            </div>
          </header>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {dev && (
            <div className="notice">
              Local development · OTP codes are delivered to the backend
              terminal.
            </div>
          )}
          {section === "Overview" ? (
            <>
              <section className="welcome">
                <div>
                  <span className="eyebrow">A FRESH START</span>
                  <h1>Welcome, {account.name.split(" ")[0]}.</h1>
                  <p>
                    Your number is verified. Your fabric business starts here.
                  </p>
                  <button onClick={() => setSection("Settings")}>
                    View your account <span>↗</span>
                  </button>
                </div>
                <div className="woven-art" aria-hidden="true">
                  <div />
                  <div />
                  <div />
                </div>
              </section>
              <div className="section-title">
                <h3>Business at a glance</h3>
                <span>Getting your workspace ready</span>
              </div>
              <section className="metrics">
                {[
                  ["Inventory", "Fabric in stock", "meters"],
                  ["Low stock", "Items needing attention", "items"],
                  ["Group buying", "Active buying groups", "groups"],
                  ["Orders", "Pending orders", "orders"],
                ].map(([title, label, unit]) => (
                  <article key={title}>
                    <span>{title}</span>
                    <strong>
                      — <small>{unit}</small>
                    </strong>
                    <p>{label}</p>
                    <em>Module planned</em>
                  </article>
                ))}
              </section>
              <section className="bottom-grid">
                <article className="panel">
                  <h3>Your next steps</h3>
                  <div className="step">
                    <b>✓</b>
                    <div>
                      <strong>Verify your mobile number</strong>
                      <p>Completed. Your account is ready.</p>
                    </div>
                  </div>
                  <div className="step">
                    <b>2</b>
                    <div>
                      <strong>Review your account</strong>
                      <p>Your profile and Free plan are available now.</p>
                      <button
                        className="text-button"
                        onClick={() => setSection("Settings")}
                      >
                        Open account →
                      </button>
                    </div>
                  </div>
                </article>
                <article className="panel">
                  <h3>Recent activity</h3>
                  <div className="empty">
                    <span>▧</span>
                    <strong>A clean slate for your business</strong>
                    <p>
                      Inventory and order activity will appear here when those
                      modules are available.
                    </p>
                  </div>
                </article>
              </section>
            </>
          ) : section === "Settings" ? (
            <section className="panel profile">
              <h1>Your account</h1>
              <p>Your mobile number has been verified.</p>
              <dl>
                <dt>Name</dt>
                <dd>{account.name}</dd>
                <dt>Mobile number</dt>
                <dd>{account.phone}</dd>
                <dt>Subscription</dt>
                <dd>{account.plan}</dd>
              </dl>
              <p className="muted">
                Profile editing will be added with business onboarding.
              </p>
            </section>
          ) : section === "Subscription" ? (
            <section className="panel profile">
              <span className="plan">{account.plan}</span>
              <h1>Your business plan</h1>
              <p>
                New accounts start on Free. Standard upgrades will become
                available after payment verification is implemented.
              </p>
              <p className="muted">
                There is no payment or upgrade action in this version.
              </p>
            </section>
          ) : (
            <section className="panel module-empty">
              <div className="empty">
                <span>▤</span>
                <h1>{section} is next</h1>
                <p>
                  Registration, verification, login and your account are ready.
                  This operational module has not been implemented yet.
                </p>
                <button onClick={() => setSection("Overview")}>
                  Back to overview
                </button>
              </div>
            </section>
          )}
          <footer>FabricTrack · Built for the fabric community</footer>
        </main>
      </div>
    );
  return (
    <main className="auth-shell">
      <section className="story">
        <a href="/" className="brand">
          ▧{" "}
          <span>
            FabricTrack<small>BUSINESS PORTAL</small>
          </span>
        </a>
        <div className="story-body">
          <span className="eyebrow">YOUR BUSINESS. CONNECTED.</span>
          <h1>
            Every thread.
            <br />
            One workspace.
          </h1>
          <p>
            A home for your fabric inventory, purchases and business
            relationships.
          </p>
          <div className="fabric-art" aria-hidden="true">
            <div />
            <div />
            <div />
            <div />
          </div>
          <div className="story-tags">
            <span>Inventory</span>
            <span>Group buying</span>
            <span>Orders</span>
          </div>
        </div>
        <small>Made for the people who make things.</small>
      </section>
      <section className="auth-right">
        <div className="auth-card">
          <span className="eyebrow">WELCOME TO FABRICTRACK</span>
          {challenge ? (
            <>
              <h1>Check your phone</h1>
              <p>
                Enter the four-digit code for <strong>{phone}</strong>.
              </p>
              {dev && (
                <div className="notice">
                  Local test mode: read the OTP in your Spring Boot terminal. No
                  SMS is sent.
                </div>
              )}
              <form onSubmit={verify}>
                <label htmlFor="otp">Verification code</label>
                <input
                  id="otp"
                  className="otp"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  autoFocus
                  required
                  placeholder="0000"
                />
                <div className="code-meta">
                  <span>
                    {expires
                      ? "Expires in " +
                        Math.floor(expires / 60) +
                        ":" +
                        String(expires % 60).padStart(2, "0")
                      : "Code expired"}
                  </span>
                  <button
                    type="button"
                    className="text-button"
                    disabled={busy || wait > 0}
                    onClick={() => send()}
                  >
                    {wait ? "Resend in " + wait + "s" : "Resend code"}
                  </button>
                </div>
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
                <button
                  className="primary"
                  disabled={busy || code.length !== 4 || expires === 0}
                >
                  {busy ? "Verifying…" : "Verify & continue →"}
                </button>
              </form>
              <button
                className="text-button back"
                disabled={busy}
                onClick={() => {
                  setChallenge(null);
                  setError("");
                  setCode("");
                }}
              >
                ← Change mobile number
              </button>
            </>
          ) : (
            <>
              <h1>
                {mode === "register" ? "Start your workspace" : "Welcome back"}
              </h1>
              <p>
                {mode === "register"
                  ? "Create your business account with your name and mobile number."
                  : "Sign in with a code sent to your mobile number."}
              </p>
              <div className="tabs">
                <button
                  className={mode === "register" ? "active" : ""}
                  disabled={busy}
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                >
                  Create account
                </button>
                <button
                  className={mode === "login" ? "active" : ""}
                  disabled={busy}
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                >
                  Sign in
                </button>
              </div>
              <form onSubmit={send}>
                {mode === "register" && (
                  <>
                    <label htmlFor="name">Your name</label>
                    <input
                      id="name"
                      autoComplete="name"
                      placeholder="e.g. Devi Ganesan"
                      minLength={2}
                      maxLength={80}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={busy}
                    />
                  </>
                )}
                <label htmlFor="phone">Mobile number</label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={24}
                  required
                  disabled={busy}
                />
                <small className="hint">
                  Include your country code. We'll send a four-digit OTP.
                </small>
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
                <button className="primary" disabled={busy}>
                  {busy ? "Sending code…" : "Send verification code →"}
                </button>
              </form>
              {dev && (
                <div className="notice">
                  Local test mode · OTP appears in the backend terminal.
                </div>
              )}
              <p className="auth-note">
                No password to remember. Your account opens only after mobile
                verification.
              </p>
            </>
          )}
        </div>
        <footer>Voxel Fashion · FabricTrack</footer>
      </section>
    </main>
  );
}
