import { useState } from "react";
import type { FormEvent } from "react";
import type { Credentials } from "../../auth/types";
import styles from "../../styles/auth/LoginForm.module.css";
type Props = {
  busy: boolean;
  configured: boolean;
  error: string;
  onSubmit: (credentials: Credentials) => Promise<void>;
};
export function LoginForm({ busy, configured, error, onSubmit }: Props) {
  const [visible, setVisible] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void onSubmit({
      email: String(data.get("email")),
      password: String(data.get("password")),
    });
  }
  return (
    <div className={styles.formWrap}>
      <span className={styles.eyebrow}>WELCOME BACK</span>
      <h2>Admin workspace</h2>
      <p>Sign in to manage your fabric network.</p>
      {!configured && (
        <div role="alert" className={styles.error}>
          Sign-in is temporarily unavailable. Please contact your website
          support team.
        </div>
      )}
      <form onSubmit={submit} aria-busy={busy}>
        <label htmlFor="email">Work email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="you@your-company.com"
          required
          disabled={busy || !configured}
        />
        <label htmlFor="password">Password</label>
        <div className={styles.password}>
          <input
            id="password"
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            disabled={busy || !configured}
          />
          <button
            type="button"
            className={styles.reveal}
            onClick={() => setVisible(!visible)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
          >
            {visible ? "Hide" : "Show"}
          </button>
        </div>
        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}
        <button className={styles.submit} disabled={busy || !configured}>
          {busy ? "Signing in…" : "Sign in to admin portal →"}
        </button>
      </form>
      <a className={styles.link} href="/forgot-password">
        Forgot password?
      </a>
      <div className={styles.restricted}>
        <strong>Private workspace</strong>
        <p>
          Access is provisioned by Voxel Fashion. For account access or password
          assistance, contact your platform administrator.
        </p>
      </div>
    </div>
  );
}
