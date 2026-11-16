import React from "react";
import Icon from "./Icons";
export function Brand({ light = false }) {
  return (
    <div className={"bp-brand " + (light ? "bp-brand-light" : "")}>
      <span className="bp-brand-symbol">
        <i />
        <i />
        <i />
      </span>
      <strong>
        vox<span>.</span>
        <small>FABRIC OS</small>
      </strong>
    </div>
  );
}
export function AuthShell({ step, children }) {
  return (
    <main className="bp-root bp-auth">
      <aside className="bp-story">
        <Brand light />
        <div className="bp-story-label">
          <span />A WORKSPACE FOR WHAT YOU CREATE
        </div>
        <div className="bp-story-content">
          <div className="bp-story-caption">FROM THE FIRST THREAD</div>
          <h2>
            Good things
            <br />
            come together.
          </h2>
          <p>
            Your fabrics. Your ideas. Your business.
            <br />A thoughtful space to keep them connected.
          </p>
          <div className="bp-woven">
            <div className="bp-fold one" />
            <div className="bp-fold two" />
            <div className="bp-fold three" />
            <span>
              CONSIDERED MATERIALS.
              <br />
              ENDLESS POSSIBILITIES.
            </span>
          </div>
          <div className="bp-story-features">
            <span>
              <Icon name="fabric" size={16} />
              Every fabric, accounted for.
            </span>
            <span>
              <Icon name="leaf" size={16} />
              Less waste. More possibility.
            </span>
          </div>
        </div>
        <div className="bp-story-footer">
          <span>MADE FOR YOUR EVERYDAY</span>
          <span>v.</span>
        </div>
      </aside>
      <section className="bp-auth-main">
        <header className="bp-auth-top">
          <span>Business Portal</span>
          <span>
            <Icon name="lock" size={12} />
            Your business, securely connected
          </span>
        </header>
        <div className="bp-auth-body">
          <div className="bp-steps">
            {["Your number", "Verify", "Your business"].map((name, i) => (
              <React.Fragment key={name}>
                <span
                  className={
                    step === i + 1 ? "current" : step > i + 1 ? "done" : ""
                  }
                >
                  <i>
                    {step > i + 1 ? <Icon name="check" size={10} /> : i + 1}
                  </i>
                  {name}
                </span>
                {i < 2 && <b />}
              </React.Fragment>
            ))}
          </div>
          {children}
        </div>
        <footer className="bp-auth-footer">
          <span>© {new Date().getFullYear()} VOX Fabric OS</span>
          <span>All your threads, in one place.</span>
        </footer>
      </section>
    </main>
  );
}
export function ErrorMessage({ message }) {
  return message ? (
    <div className="bp-error" role="alert">
      <Icon name="alert" size={16} />
      <span>{message}</span>
    </div>
  ) : null;
}
