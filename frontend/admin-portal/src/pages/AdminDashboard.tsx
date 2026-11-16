import { useState } from "react";
import type { AdminProfile } from "../auth/types";
import { InviteAdminForm } from "../components/team/InviteAdminForm";
import styles from "../styles/AdminDashboard.module.css";
const modules = [
  [
    "01",
    "Business approvals",
    "Review the businesses joining your fabric network.",
    "Business network",
  ],
  [
    "02",
    "Factory verification",
    "Build a directory of trusted manufacturing partners.",
    "Supplier relationships",
  ],
  [
    "03",
    "Pooled buying groups",
    "Coordinate factory pricing when groups reach their minimum order.",
    "Collective purchasing",
  ],
  [
    "04",
    "Orders requiring attention",
    "Follow purchasing, dispatches and allocations in one place.",
    "Order operations",
  ],
];
export function AdminDashboard({
  admin,
  busy,
  error,
  onLogout,
}: {
  admin: AdminProfile;
  busy: boolean;
  error: string;
  onLogout: () => Promise<void>;
}) {
  const [page, setPage] = useState<"overview" | "team">("overview");
  return (
    <main className={styles.workspace}>
      <aside className={styles.sidebar}>
        <a href="/" className={styles.brand}>
          <b>V</b>
          <span>
            Voxel Fashion<small>FABRICTRACK · ADMIN</small>
          </span>
        </a>
        <p className={styles.label}>OPERATIONS WORKSPACE</p>
        <nav aria-label="Admin navigation">
          <button
            className={page === "overview" ? styles.active : styles.nav}
            aria-current={page === "overview" ? "page" : undefined}
            onClick={() => setPage("overview")}
          >
            <span aria-hidden="true">◫</span> Overview
          </button>
          {admin.canManageAdmins && (
            <button
              className={page === "team" ? styles.active : styles.nav}
              aria-current={page === "team" ? "page" : undefined}
              onClick={() => setPage("team")}
            >
              <span aria-hidden="true">◎</span> Team access
            </button>
          )}
        </nav>
        <div className={styles.sidebarNote}>
          <span>BUILT ON TRUST</span>
          <p>
            Connecting the people
            <br />
            behind every fabric.
          </p>
          <div aria-hidden="true">▥ ▥ ▥</div>
        </div>
        <div className={styles.account}>
          <small>Signed in as</small>
          <p>{admin.email}</p>
          <button disabled={busy} onClick={() => void onLogout()}>
            {busy ? "Signing out…" : "Sign out"}
            <span aria-hidden="true"> ↗</span>
          </button>
        </div>
      </aside>
      <section className={styles.content}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>VOXEL FASHION OPERATIONS</span>
            <h1>{page === "team" ? "Team access" : "Overview"}</h1>
          </div>
          <span className={styles.badge}>
            <i />
            Authorized access
          </span>
        </header>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {page === "team" && admin.canManageAdmins ? (
          <section className={styles.team}>
            <InviteAdminForm />
          </section>
        ) : (
          <>
            <section className={styles.welcome}>
              <div>
                <span className={styles.eyebrow}>
                  YOUR NETWORK, IN GOOD HANDS
                </span>
                <h2>
                  Good work starts
                  <br />
                  with strong connections.
                </h2>
                <p>
                  Welcome to your workspace. Bring your fabric community
                  together, one relationship at a time.
                </p>
                {admin.canManageAdmins && (
                  <button onClick={() => setPage("team")}>
                    Manage team access <span aria-hidden="true">↗</span>
                  </button>
                )}
              </div>
              <div className={styles.art} aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </div>
            </section>
            <div className={styles.sectionTitle}>
              <h2>Your operations</h2>
              <span>Workspace roadmap</span>
            </div>
            <section className={styles.cards}>
              {modules.map(([number, title, description, category]) => (
                <article key={title}>
                  <div className={styles.cardTop}>
                    <span className={styles.number}>{number}</span>
                    <span className={styles.moduleStatus}>PLANNED</span>
                  </div>
                  <small className={styles.category}>{category}</small>
                  <h2>{title}</h2>
                  <p>{description}</p>
                  <div className={styles.cardFoot}>
                    Operational data not connected{" "}
                    <span aria-hidden="true">↗</span>
                  </div>
                </article>
              ))}
            </section>
            <section className={styles.bottom}>
              <article className={styles.note}>
                <span className={styles.eyebrow}>READY FOR YOUR TEAM</span>
                <h2>Your admin access is ready</h2>
                <p>
                  Secure sign-in, password recovery and sign-out are available.
                  Account managers can invite colleagues through Team access.
                </p>
                {admin.canManageAdmins && (
                  <button onClick={() => setPage("team")}>
                    Invite a colleague →
                  </button>
                )}
              </article>
              <article className={styles.activity}>
                <h2>Workspace activity</h2>
                <span aria-hidden="true">◌</span>
                <strong>A fresh start for your operations</strong>
                <p>
                  Business and factory activity will appear when those modules
                  are connected.
                </p>
              </article>
            </section>
          </>
        )}
        <footer>
          FabricTrack <span>by Voxel Fashion</span>
          <small>Private operations workspace</small>
        </footer>
      </section>
    </main>
  );
}
