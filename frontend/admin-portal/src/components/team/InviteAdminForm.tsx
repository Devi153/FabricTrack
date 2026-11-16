import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { inviteAdmin } from "../../api/teamService";
import styles from "../../styles/auth/LoginForm.module.css";
export function InviteAdminForm({
  invite = inviteAdmin,
}: {
  invite?: (email: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const pending = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const email = String(new FormData(event.currentTarget).get("email"));
    pending.current = true;
    setBusy(true);
    setError("");
    setSent(false);
    try {
      await invite(email);
      setSent(true);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to confirm invitation.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className={styles.formWrap}>
      <h2>Invite a colleague</h2>
      <p>
        Give a Voxel Fashion staff member access to the admin workspace. Only
        account managers can send invitations.
      </p>
      <form onSubmit={submit}>
        <label htmlFor="invite-email">Work email</label>
        <input
          id="invite-email"
          name="email"
          type="email"
          autoComplete="off"
          required
          maxLength={254}
          disabled={busy}
        />
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {sent && (
          <p role="status" className={styles.success}>
            Invitation sent. Your colleague can set their password using the
            email link.
          </p>
        )}
        <button className={styles.submit} disabled={busy}>
          {busy ? "Sending invitation…" : "Send invitation"}
        </button>
      </form>
    </div>
  );
}
