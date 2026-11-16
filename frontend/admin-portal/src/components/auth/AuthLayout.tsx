import type { ReactNode } from "react";
import styles from "../../styles/auth/AuthLayout.module.css";
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className={styles.shell}>
      <section className={styles.story}>
        <a className={styles.brand} href="/" aria-label="Voxel Fashion home">
          <span className={styles.mark}>V</span>
          <span>
            VOXEL FASHION<small>FABRICTRACK OPERATIONS</small>
          </span>
        </a>
        <div className={styles.editorial}>
          <span className={styles.eyebrow}>THE PEOPLE BEHIND THE FABRIC</span>
          <h1>
            A stronger network.
            <br />
            Woven together.
          </h1>
          <p>
            One private workspace for the team connecting businesses, factories
            and possibilities.
          </p>
          <div className={styles.weave} aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className={styles.tags}>
            <span>Trusted relationships</span>
            <span>Thoughtful operations</span>
          </div>
        </div>
        <p className={styles.signature}>
          FabricTrack <span>by Voxel Fashion</span>
        </p>
      </section>
      <section className={styles.formSide}>
        <div className={styles.access}>
          <span /> STAFF ACCESS ONLY
        </div>
        <section className={styles.card}>{children}</section>
        <footer className={styles.footer}>
          Private access for authorized Voxel Fashion staff.
          <br />© {new Date().getFullYear()} Voxel Fashion
        </footer>
      </section>
    </main>
  );
}
