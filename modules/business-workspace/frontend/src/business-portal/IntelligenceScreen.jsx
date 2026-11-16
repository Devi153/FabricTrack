import React from "react";
import Icon from "./Icons";
import { hasFeature } from "./tiers";
import { qty, money, date } from "./format";
export default function IntelligenceScreen({
  user,
  fabrics,
  movements,
  rolls,
  designs,
  purchases,
  suppliers,
  gate,
  purchase,
}) {
  return (
    <>
      <section className="vx-intelligence-hero">
        <Icon name="leaf" size={32} />
        <div>
          <div className="bp-kicker">MATERIALS WITH MOMENTUM</div>
          <h2>Make your next move a thoughtful one.</h2>
          <p>
            Insights calculated from your own stock, purchases and production
            plans.
          </p>
        </div>
      </section>
      <div className="vx-intelligence-grid">
        {hasFeature(user.plan, "reorder") ? (
          <section className="vx-card vx-insight">
            <h2>Reorder recommendations</h2>
            <p>
              {user.plan === "BUSINESS"
                ? "Suggested cover uses the greater of 14 days of recorded outward demand or twice your minimum stock."
                : "Basic suggestions top stock up to twice your minimum level."}
            </p>
            {low.length ? (
              low.map((f) => {
                const out = movements
                  .filter(
                    (m) =>
                      m.fabricId === f.id &&
                      m.direction === "OUT" &&
                      Date.now() - new Date(m.createdAt) < 30 * 86400000,
                  )
                  .reduce((s, m) => s + Number(m.quantityMeters), 0);
                const target =
                  user.plan === "BUSINESS"
                    ? Math.max(Number(f.minStockQuantity) * 2, (out / 30) * 14)
                    : Number(f.minStockQuantity) * 2;
                return (
                  <div className="vx-insight-row" key={f.id}>
                    <span>
                      <strong>{f.name}</strong>
                      <small>
                        {qty(f.quantityMeters)} m left ·{" "}
                        {qty(Math.max(0, target - Number(f.quantityMeters)))} m
                        suggested top-up
                      </small>
                    </span>
                    <button className="vx-link" onClick={purchase}>
                      Record receipt <Icon name="arrow" size={12} />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="vx-empty-compact">
                <p>No fabrics are below their minimum levels.</p>
              </div>
            )}
          </section>
        ) : (
          gate(
            "Keep the next run moving.",
            "Standard adds low-stock alerts and basic reorder recommendations.",
          )
        )}
        {hasFeature(user.plan, "costAnalysis") ? (
          <section className="vx-card vx-insight">
            <h2>Fabric cost composition</h2>
            <p>Current material value, calculated from on-hand quantities.</p>
            {fabrics.map((f) => (
              <div className="vx-cost-row" key={f.id}>
                <div>
                  <span>{f.name}</span>
                  <strong>{money(f.quantityMeters * f.costPerMeter)}</strong>
                </div>
                <span>
                  <i
                    style={{
                      width: `${value ? ((f.quantityMeters * f.costPerMeter) / value) * 100 : 0}%`,
                    }}
                  />
                </span>
              </div>
            ))}
            {!fabrics.length && (
              <div className="vx-empty-compact">
                <p>Add your materials to begin cost analysis.</p>
              </div>
            )}
          </section>
        ) : (
          gate(
            "Know where your investment sits.",
            "Standard includes fabric cost analysis across your material collection.",
          )
        )}
        {hasFeature(user.plan, "idleStock") ? (
          <section className="vx-card vx-insight">
            <h2>Idle material watch</h2>
            <p>
              Fabrics without a recorded outward movement in at least 30 days.
            </p>
            {fabrics
              .filter((f) => {
                const latest = movements
                  .filter((m) => m.fabricId === f.id && m.direction === "OUT")
                  .sort(
                    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
                  )[0];
                return (
                  Date.now() - new Date(latest?.createdAt || f.createdAt) >
                    30 * 86400000 && Number(f.quantityMeters) > 0
                );
              })
              .map((f) => (
                <div className="vx-insight-row" key={f.id}>
                  <span>{f.name}</span>
                  <strong>{qty(f.quantityMeters)} m</strong>
                </div>
              ))}
            <div className="vx-empty-compact">
              <p>
                New stock is given time to find its purpose. Review dates as
                your ledger grows.
              </p>
            </div>
          </section>
        ) : (
          gate(
            "Give every meter a purpose.",
            "Idle-fabric identification is available with Standard.",
          )
        )}
        {hasFeature(user.plan, "readiness") ? (
          <section className="vx-card vx-insight">
            <h2>Production readiness</h2>
            {designs
              .filter((d) => d.state === "PLANNED")
              .map((d) => {
                const stock = rolls
                  .filter((r) => r.fabricId === d.fabricId)
                  .reduce(
                    (s, r) =>
                      s + Number(r.quantityMeters) - Number(r.reservedMeters),
                    0,
                  );
                return (
                  <div className="vx-insight-row" key={d.id}>
                    <span>
                      <strong>{d.name}</strong>
                      <small>{qty(d.requiredMeters)} m required</small>
                    </span>
                    <span
                      className={
                        "vx-badge " +
                        (stock < Number(d.requiredMeters) ? "warn" : "")
                      }
                    >
                      {stock >= Number(d.requiredMeters)
                        ? "Ready to reserve"
                        : "More stock needed"}
                    </span>
                  </div>
                );
              })}
            {!designs.length && (
              <div className="vx-empty-compact">
                <p>Your saved designs will appear here.</p>
              </div>
            )}
          </section>
        ) : (
          gate(
            "Bring your next production run into view.",
            "Business compares saved production plans against unreserved roll stock.",
            "Business",
          )
        )}
        {hasFeature(user.plan, "priceHistory") ? (
          <section className="vx-card vx-insight">
            <h2>Historical price comparison</h2>
            <p>Recorded purchase prices for each fabric.</p>
            {fabrics.map((f) => {
              const history = purchases.filter((p) => p.fabricId === f.id);
              if (!history.length) return null;
              const prices = history.map((p) => Number(p.unitPrice));
              return (
                <div className="vx-insight-row" key={f.id}>
                  <span>
                    <strong>{f.name}</strong>
                    <small>{history.length} purchase records</small>
                  </span>
                  <span>
                    {money(Math.min(...prices))} – {money(Math.max(...prices))}
                  </span>
                </div>
              );
            })}
            {!purchases.length && (
              <div className="vx-empty-compact">
                <p>Purchase receipts build your historical price view.</p>
              </div>
            )}
          </section>
        ) : (
          gate(
            "Compare your material costs over time.",
            "Standard includes historical supplier price comparison.",
          )
        )}
        {hasFeature(user.plan, "supplierIntelligence") ? (
          <section className="vx-card vx-insight">
            <h2>Supplier price intelligence</h2>
            <p>
              Average recorded price for a fabric from each supplier. Compare
              matching specifications and lots before purchasing.
            </p>
            {fabrics.flatMap((f) =>
              suppliers.map((s) => {
                const history = purchases.filter(
                  (p) => p.fabricId === f.id && p.supplierId === s.id,
                );
                return history.length ? (
                  <div className="vx-insight-row" key={f.id + s.id}>
                    <span>
                      <strong>{f.name}</strong>
                      <small>
                        {s.name} · {history.length} receipts
                      </small>
                    </span>
                    <strong>
                      {money(
                        history.reduce(
                          (sum, p) => sum + Number(p.unitPrice),
                          0,
                        ) / history.length,
                      )}
                      /m
                    </strong>
                  </div>
                ) : null;
              }),
            )}
            {!purchases.length && (
              <div className="vx-empty-compact">
                <p>Your own purchase data powers these comparisons.</p>
              </div>
            )}
          </section>
        ) : (
          gate(
            "Connect the dots between suppliers.",
            "Business adds supplier price intelligence to your recorded purchase history.",
            "Business",
          )
        )}
      </div>
    </>
  );
}
