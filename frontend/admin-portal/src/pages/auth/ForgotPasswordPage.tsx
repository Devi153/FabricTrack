import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { passwordService } from "../../auth/services/passwordService";
import type { PasswordService } from "../../auth/services/passwordService";
import styles from "../../styles/auth/LoginForm.module.css";
export function ForgotPasswordPage({
  service = passwordService,
}: {
  service?: PasswordService;
}) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const email = String(new FormData(event.currentTarget).get("email"));
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await service.requestReset(email);
      setSent(true);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Please try again later.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <AuthLayout>
      <div className={styles.formWrap}>
        <span className={styles.eyebrow}>ACCOUNT RECOVERY</span>
        <h2>Forgot password?</h2>
        <p>We’ll help you get back to your workspace.</p>
        {sent ? (
          <div role="status" className={styles.success}>
            If an account exists for this email, you will receive a password
            reset link. Check your inbox and spam folder.
          </div>
        ) : (
          <form onSubmit={submit}>
            <label htmlFor="email">Work email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={busy}
            />
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <button className={styles.submit} disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
        <a className={styles.link} href="/">
          Back to sign in
        </a>
      </div>
    </AuthLayout>
  );
}
