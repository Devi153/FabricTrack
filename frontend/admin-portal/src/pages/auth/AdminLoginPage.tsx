import { AuthLayout } from "../../components/auth/AuthLayout";
import { LoginForm } from "../../components/auth/LoginForm";
import { AdminDashboard } from "../AdminDashboard";
import { useAdminAuth } from "../../auth/hooks/useAdminAuth";
import styles from "../../styles/auth/LoginForm.module.css";
export function AdminLoginPage() {
  const auth = useAdminAuth();
  if (auth.admin && !auth.checking)
    return (
      <AdminDashboard
        admin={auth.admin}
        busy={auth.busy}
        error={auth.error}
        onLogout={auth.logout}
      />
    );
  return (
    <AuthLayout>
      {auth.checking ? (
        <div className={styles.formWrap} role="status">
          <h2>Verifying your session…</h2>
          <p>Please wait while we check admin access.</p>
        </div>
      ) : (
        <LoginForm
          busy={auth.busy}
          configured={auth.configured}
          error={auth.error}
          onSubmit={auth.login}
        />
      )}
    </AuthLayout>
  );
}
