import React from "react";
import Icon from "./Icons";
import { hasFeature } from "./tiers";
import { qty, money, date } from "./format";
export default function OverviewScreen({
  fabrics,
  plan,
  user,
  total,
  value,
  rolls,
  low,
  period,
  setPeriod,
  chartDays,
  maxChart,
  fabricTable,
  go,
  gate,
  passport,
  fabricName,
  movements,
}) {
  return (
    <>
      <div className="vx-overview-meta">
        <span>
          <i />
          LIVE WORKSPACE OVERVIEW
        </span>
        <select
          aria-label="Movement period"
          value={period}
          onChange={(e) => setPeriod(Number(e.target.value))}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>
      <section className="vx-metrics">
        {[
          {
            label: "Total fabric stock",
            value: qty(total),
            unit: "meters",
            note: "Across your fabric library",
            icon: "fabric",
          },
          {
            label: "Inventory value",
            value: money(value),
            note: "Current stock × cost per meter",
            icon: "grid",
          },
          {
            label: "Physical fabric rolls",
            value: qty(
              rolls.filter((r) => Number(r.quantityMeters) > 0).length,
            ),
            unit: "active rolls",
            note: "Individually tracked and accounted for",
            icon: "fabric",
          },
          {
            label: hasFeature(user.plan, "lowStock")
              ? "Low-stock fabrics"
              : "Your fabric collection",
            value: hasFeature(user.plan, "lowStock")
              ? qty(low.length)
              : `${fabrics.length} / ${plan.fabricLimit ?? "∞"}`,
            unit: hasFeature(user.plan, "lowStock") ? "to review" : "records",
            note: hasFeature(user.plan, "lowStock")
              ? "A timely reorder keeps ideas moving"
              : "Every collection starts somewhere",
            icon: "leaf",
          },
        ].map((m, i) => (
          <article className={"vx-metric color-" + i} key={m.label}>
            <div>
              {m.label}
              <Icon name={m.icon} size={18} />
            </div>
            <strong>
              {m.value}
              <small>{m.unit}</small>
            </strong>
            <p>
              <Icon name="check" size={10} />
              {m.note}
            </p>
          </article>
        ))}
      </section>
      <div className="vx-overview-grid">
        <div>
          <section className="vx-card vx-motion">
            <div className="vx-card-heading">
              <div>
                <h2>Stock in motion</h2>
                <p>Real movements from your inventory ledger.</p>
              </div>
              <div className="vx-legend">
                <span>
                  <i />
                  Stock inward
                </span>
                <span>
                  <i />
                  Stock outward
                </span>
              </div>
            </div>
            {movements.length ? (
              <div className="vx-real-chart">
                {chartDays.map((d) => (
                  <div className="vx-bar-group" key={d.label}>
                    <div>
                      <i
                        style={{
                          height: `${(d.in / maxChart) * 130}px`,
                        }}
                        title={`${d.label}: ${qty(d.in)} m inward`}
                      />
                      <i
                        style={{
                          height: `${(d.out / maxChart) * 130}px`,
                        }}
                        title={`${d.label}: ${qty(d.out)} m outward`}
                      />
                    </div>
                    <small>{d.label}</small>
                  </div>
                ))}
              </div>
            ) : (
              <div className="vx-chart-empty">
                <div className="vx-chart-grid" />
                <Icon name="leaf" size={24} />
                <strong>Your fabric flow starts here.</strong>
                <p>Your chart will take shape as you record stock movements.</p>
              </div>
            )}
          </section>
          <section className="vx-card vx-library">
            <div className="vx-card-heading">
              <div>
                <h2>
                  Your fabric library{" "}
                  <span className="vx-count">{fabrics.length}</span>
                </h2>
                <p>A few of the materials making things happen.</p>
              </div>
              <button className="vx-link" onClick={() => go("Fabric library")}>
                View all <Icon name="arrow" size={13} />
              </button>
            </div>
            {fabricTable(true)}
          </section>
        </div>
        <aside>
          <section className="vx-editorial">
            <div className="bp-kicker">MADE FOR THE WAY YOU WORK</div>
            <div className="vx-editorial-fold one" />
            <div className="vx-editorial-fold two" />
            <div className="vx-editorial-copy">
              <h2>
                From the first thread
                <br />
                to the final stitch.
              </h2>
              <p>A little order. Endless possibilities.</p>
              <button onClick={() => go("Design & consumption")}>
                Plan your next creation <Icon name="arrow" size={14} />
              </button>
            </div>
            <span>v.</span>
          </section>
          {hasFeature(user.plan, "lowStock") ? (
            <section className="vx-card vx-alert">
              <div className="vx-card-heading">
                <h2>A little heads-up</h2>
                <span className="vx-count">{low.length}</span>
              </div>
              {low.length ? (
                low.slice(0, 3).map((f) => (
                  <button
                    className="vx-low-row"
                    key={f.id}
                    onClick={() => passport(f)}
                  >
                    <Icon name="fabric" size={19} />
                    <span>
                      <strong>{f.name}</strong>
                      <small>
                        {qty(f.quantityMeters)} m left · Min.{" "}
                        {qty(f.minStockQuantity)} m
                      </small>
                    </span>
                    <Icon name="arrow" size={12} />
                  </button>
                ))
              ) : (
                <p className="vx-quiet-note">
                  No fabrics are below their minimum stock levels.
                </p>
              )}
              <button
                className="vx-alert-link"
                onClick={() => go("Fabric intelligence")}
              >
                Review your material outlook <Icon name="arrow" size={12} />
              </button>
            </section>
          ) : (
            gate(
              "Your next move, considered.",
              "Standard adds low-stock alerts, material cost analysis and reorder suggestions.",
            )
          )}
          <section className="vx-card vx-threads">
            <div className="vx-card-heading">
              <h2>Latest threads</h2>
              <button className="vx-link" onClick={() => go("Stock movements")}>
                View all
              </button>
            </div>
            {movements.length ? (
              movements.slice(0, 3).map((m) => (
                <div className="vx-thread" key={m.id}>
                  <span>
                    <Icon name="arrow" size={13} />
                  </span>
                  <div>
                    <strong>
                      {fabricName(m.fabricId)} ·{" "}
                      {m.direction.toLowerCase().replace("_", " ")}
                    </strong>
                    <small>
                      {qty(m.quantityMeters)} m · {date(m.createdAt)}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <p className="vx-quiet-note">
                Your inventory activity will appear here after your first fabric
                is added.
              </p>
            )}
          </section>
        </aside>
      </div>
      <div className="vx-bottom-thought">
        <Icon name="spark" size={17} />
        Less time tracking. More time creating.
        <span>Crafted for the fabric of your business.</span>
      </div>
    </>
  );
}
