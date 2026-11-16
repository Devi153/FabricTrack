import React from "react";
import { PLAN_CATALOG } from "./rules";
import { FEATURE_GROUPS, tierName } from "./tiers";
import Icon from "./Icons";
export default function Plans({ current = "FREE", onClose }) {
  return (
    <section className="vx-plans">
      <div className="vx-plans-heading">
        <div className="bp-kicker">A SIMPLE PLAN FOR EVERY STAGE</div>
        <h2>A little room to grow.</h2>
        <p>Start with your first fabric. Find your next possibility.</p>
        {onClose && (
          <button
            className="bp-icon-button vx-plan-close"
            onClick={onClose}
            aria-label="Close plan comparison"
          >
            <Icon name="close" />
          </button>
        )}
      </div>
      <div className="vx-pricing">
        {PLAN_CATALOG.map((p) => (
          <article
            key={p.code}
            className={p.code === "STARTER" ? "highlighted" : ""}
          >
            {p.code === "STARTER" && (
              <span className="vx-popular">FOR A GROWING COLLECTION</span>
            )}
            <h3>{tierName(p.code)}</h3>
            <p>
              {p.code === "FREE"
                ? "For your first few threads."
                : p.code === "STARTER"
                  ? "For a studio finding its rhythm."
                  : "For a business in full flow."}
            </p>
            <div className="vx-price">
              ₹{p.price}
              <small>/{p.code === "FREE" ? "forever" : "month"}</small>
            </div>
            <div className="vx-plan-state">
              {current === p.code ? (
                <>
                  <Icon name="check" size={14} />
                  Your current plan
                </>
              ) : (
                "Available through your billing account"
              )}
            </div>
            <ul>
              {[
                `${p.fabricLimit ?? "Unlimited"} fabric records`,
                "1 photograph per fabric",
                `${p.supplierLimit ?? "Unlimited"} suppliers`,
                `${p.designsPerGarment ?? "Unlimited"} design records per garment`,
                `${p.teamMembers} team ${p.teamMembers === 1 ? "member" : "members"}`,
                "Roll tracking & quality passports",
                "CSV import and export",
              ].map((x) => (
                <li key={x}>
                  <Icon name="check" size={13} />
                  {x}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <p className="vx-plan-note">
        Standard uses the PDF’s Starter limits. Prices are the project’s
        proposed monthly prices. Paid activation uses your verified billing
        workflow.
      </p>
      <div className="vx-feature-table">
        <table>
          <thead>
            <tr>
              <th>Everything, thoughtfully considered</th>
              <th>Free</th>
              <th>Standard</th>
              <th>Business</th>
            </tr>
          </thead>
          <tbody>
            {FEATURE_GROUPS.map(([group, rows]) => (
              <React.Fragment key={group}>
                <tr className="vx-feature-group">
                  <th colSpan={4}>{group}</th>
                </tr>
                {rows.map(([name, ...cells]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    {cells.map((cell, i) => (
                      <td key={i}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
