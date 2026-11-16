import React, { useState } from "react";
import Icon from "./Icons";
import { hasFeature } from "./tiers";
const qty = (n) =>
  Number(n).toLocaleString("en-IN", { maximumFractionDigits: 1 });
export default function DesignCalculator({
  fabrics,
  designs,
  plan,
  onSave,
  onReserve,
  onComplete,
  busy,
  onPlans,
}) {
  const [rows, setRows] = useState([
    { size: plan === "FREE" ? "All sizes" : "", meters: "", units: 1 },
  ]);
  const [sets, setSets] = useState(1);
  const [waste, setWaste] = useState(0);
  const [fabricId, setFabricId] = useState("");
  const required =
    rows.reduce((s, r) => s + Number(r.meters) * Number(r.units), 0) *
    sets *
    (1 + waste / 100);
  const selected = fabrics.find((f) => f.id === fabricId);
  function save(e) {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget));
    onSave({
      garmentName: v.garmentName,
      name: v.name,
      fabricId,
      productionSets: Number(sets),
      wastagePercent: Number(waste),
      measurements: rows.map((r) => ({
        ...r,
        meters: Number(r.meters),
        units: Number(r.units),
      })),
    });
  }
  return (
    <>
      <div className="vx-design-layout">
        <section className="vx-card vx-calculator">
          <div className="vx-card-heading">
            <div>
              <h2>From design to production</h2>
              <p>Every garment has its own material story.</p>
            </div>
            <Icon name="fabric" size={20} />
          </div>
          <form onSubmit={save}>
            <div className="bp-form-grid">
              <label>
                Garment name
                <input
                  name="garmentName"
                  placeholder="e.g. Everyday shirt"
                  required
                  maxLength={120}
                />
              </label>
              <label>
                Design / version name
                <input
                  name="name"
                  placeholder="Your design reference"
                  required
                  maxLength={120}
                />
              </label>
              <label className="vx-span-two">
                Linked fabric
                <select
                  required
                  value={fabricId}
                  onChange={(e) => setFabricId(e.target.value)}
                >
                  <option value="">Select a fabric</option>
                  {fabrics.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} · {qty(f.quantityMeters)} m on hand
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="vx-size-header">
              <span>SIZE</span>
              <span>METERS / GARMENT</span>
              <span>SIZE RATIO</span>
            </div>
            {rows.map((r, i) => (
              <div className="vx-size-row" key={i}>
                <input
                  aria-label={`Size label ${i + 1}`}
                  required
                  maxLength={20}
                  value={r.size}
                  placeholder="Size"
                  onChange={(e) =>
                    setRows(
                      rows.map((x, j) =>
                        j === i ? { ...x, size: e.target.value } : x,
                      ),
                    )
                  }
                />
                <input
                  aria-label={`Meters for size ${i + 1}`}
                  required
                  type="number"
                  min="0.1"
                  max="1000"
                  step="0.1"
                  value={r.meters}
                  onChange={(e) =>
                    setRows(
                      rows.map((x, j) =>
                        j === i ? { ...x, meters: e.target.value } : x,
                      ),
                    )
                  }
                />
                <input
                  aria-label={`Ratio for size ${i + 1}`}
                  required
                  type="number"
                  min="1"
                  max="1000"
                  value={r.units}
                  onChange={(e) =>
                    setRows(
                      rows.map((x, j) =>
                        j === i ? { ...x, units: e.target.value } : x,
                      ),
                    )
                  }
                />
              </div>
            ))}
            {hasFeature(plan, "sizeBreakdown") ? (
              <div className="vx-size-actions">
                <button
                  type="button"
                  disabled={rows.length >= 20}
                  onClick={() =>
                    setRows([...rows, { size: "", meters: "", units: 1 }])
                  }
                >
                  + Add size
                </button>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setRows(rows.slice(0, -1))}
                  >
                    Remove last size
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="vx-link vx-size-actions"
                onClick={onPlans}
              >
                Size breakdowns are included in Standard{" "}
                <Icon name="arrow" size={12} />
              </button>
            )}
            <div className="bp-form-grid vx-production-inputs">
              <label>
                Production sets
                <input
                  type="number"
                  min="1"
                  max="1000000"
                  required
                  value={sets}
                  onChange={(e) => setSets(Number(e.target.value))}
                />
              </label>
              <label>
                Estimated cutting allowance (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={waste}
                  onChange={(e) => setWaste(Number(e.target.value))}
                />
              </label>
            </div>
            <button
              className="bp-button"
              disabled={busy || !fabrics.length || required <= 0}
            >
              {busy ? "Saving…" : "Save design calculation"}
              <Icon name="check" size={15} />
            </button>
          </form>
        </section>
        <aside className="vx-production-summary">
          <div className="bp-kicker">YOUR NEXT CREATION, CONSIDERED</div>
          <h2>
            A little precision.
            <br />A lot less waste.
          </h2>
          <div className="vx-requirement">
            {qty(required)}
            <small>meters required</small>
          </div>
          <dl>
            <div>
              <dt>Garments to produce</dt>
              <dd>
                {qty(rows.reduce((s, r) => s + Number(r.units), 0) * sets)}
              </dd>
            </div>
            <div>
              <dt>Estimated allowance</dt>
              <dd>{waste}%</dd>
            </div>
            <div>
              <dt>Linked fabric on hand</dt>
              <dd>
                {selected
                  ? qty(selected.quantityMeters) + " m"
                  : "Select a fabric"}
              </dd>
            </div>
          </dl>
          <p>
            Save separate consumption records for each garment design. Actual
            wastage and stock reservation are Business features.
          </p>
        </aside>
      </div>
      <section className="vx-card vx-saved-designs">
        <div className="vx-card-heading">
          <div>
            <h2>Design consumption history</h2>
            <p>Limits apply per garment, across its saved design records.</p>
          </div>
          <span className="vx-count">{designs.length}</span>
        </div>
        {designs.length ? (
          <div className="vx-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Garment / design</th>
                  <th>Fabric requirement</th>
                  <th>Production status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {designs.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <strong>{d.garmentName}</strong>
                      <small>{d.name}</small>
                    </td>
                    <td>
                      {qty(d.requiredMeters)} m
                      <small>
                        {d.productionSets} sets · {d.wastagePercent}% allowance
                      </small>
                    </td>
                    <td>
                      <span className="vx-badge">{d.state.toLowerCase()}</span>
                      {d.state === "COMPLETED" && (
                        <small>
                          {qty(d.actualWastageMeters)} m actual waste
                        </small>
                      )}
                    </td>
                    <td>
                      {hasFeature(plan, "reservation") &&
                      d.state === "PLANNED" ? (
                        <button
                          className="vx-link"
                          disabled={busy}
                          onClick={() => onReserve(d.id)}
                        >
                          Reserve stock <Icon name="arrow" size={12} />
                        </button>
                      ) : hasFeature(plan, "reservation") &&
                        d.state === "RESERVED" ? (
                        <button
                          className="vx-link"
                          disabled={busy}
                          onClick={() => onComplete(d)}
                        >
                          Complete batch <Icon name="check" size={12} />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="vx-empty-compact">
            <Icon name="fabric" size={26} />
            <p>Your saved design calculations will appear here.</p>
          </div>
        )}
      </section>
    </>
  );
}
