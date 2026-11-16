import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { passwordService } from "../../auth/services/passwordService";
import type { PasswordService } from "../../auth/services/passwordService";
import styles from "../../styles/auth/LoginForm.module.css";
export function SetPasswordPage({
  service = passwordService,
}: {
  service?: PasswordService;
}) {
  const [valid, setValid] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    void service
      .hasSession()
      .then((value) => {
        if (active) setValid(value);
      })
      .catch(() => {
        if (active) setValid(false);
      });
    return () => {
      active = false;
    };
  }, [service]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password"));
    if (password !== data.get("confirm")) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 12) {
      setError("Use at least 12 characters.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await service.updatePassword(password);
      setDone(true);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to save your password.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <AuthLayout>
      <div className={styles.formWrap}>
        <span className={styles.eyebrow}>SECURE YOUR ACCOUNT</span>
        <h2>Set your password</h2>
        {done ? (
          <div role="status" className={styles.success}>
            Your password is saved. Sign in to open your workspace.
          </div>
        ) : valid === null ? (
          <p role="status">Checking your link…</p>
        ) : !valid ? (
          <p role="alert" className={styles.error}>
            This link is invalid or expired. Request a new reset link, or
            contact the administrator who invited you.
          </p>
        ) : (
          <>
            <p>Choose a password with at least 12 characters.</p>
            <form onSubmit={submit}>
              <label htmlFor="password">New password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
                disabled={busy}
              />
              <label htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
                disabled={busy}
              />
              {error && (
                <p role="alert" className={styles.error}>
                  {error}
                </p>
              )}
              <button disabled={busy} className={styles.submit}>
                {busy ? "Saving…" : "Save password"}
              </button>
            </form>
          </>
        )}
        <a className={styles.link} href="/">
          Back to sign in
        </a>
        <a className={styles.link} href="/forgot-password">
          Request a new reset link
        </a>
      </div>
    </AuthLayout>
  );
}
