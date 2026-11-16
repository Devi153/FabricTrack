import React, { useEffect, useState, useRef } from "react";
import Icon from "./Icons";
import SuppliersScreen from "./SuppliersScreen";
import IntelligenceScreen from "./IntelligenceScreen";
import OverviewScreen from "./OverviewScreen";
import { qty, money, date } from "./format";
import { Brand, ErrorMessage } from "./PortalShared";
import Plans from "./Plans";
import WorkspaceDialog from "./WorkspaceDialog";
import DesignCalculator from "./DesignCalculator";
import { hasFeature, tierName } from "./tiers";
import { PLAN_CATALOG } from "./rules";
import { toCsv, importRecords } from "./csv";
const names = [
  "Overview",
  "Fabric library",
  "Roll inventory",
  "Quality passports",
  "Stock movements",
  "Suppliers",
  "Design & consumption",
  "Fabric intelligence",
  "Procurement",
  "Plans & billing",
  "Account & team",
];
const symbol = [
  "grid",
  "fabric",
  "fabric",
  "lock",
  "arrow",
  "phone",
  "fabric",
  "spark",
  "plus",
  "leaf",
  "lock",
];
const empty = {
  fabrics: [],
  suppliers: [],
  rolls: [],
  passports: [],
  movements: [],
  designs: [],
  purchases: [],
  reservations: [],
  procurement: [],
};
const field = (name, label, type = "text", rest = {}) => ({
  name,
  label,
  type,
  ...rest,
});
export default function OwnerWorkspace({ api, user, onLogout, onExpired }) {
  const [data, setData] = useState(empty);
  const [page, setPage] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("All fabrics");
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [period, setPeriod] = useState(30);
  const [movementRoll, setMovementRoll] = useState("");
  const uploadRef = useRef();
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      api.fabrics(controller.signal),
      api.workspace ? api.workspace(controller.signal) : Promise.resolve({}),
    ])
      .then(([fabrics, snapshot]) =>
        setData({
          ...empty,
          ...snapshot,
          fabrics: snapshot.fabrics || fabrics,
        }),
      )
      .catch((e) => {
        if (e.name === "AbortError") return;
        if (e.status === 401) {
          onExpired();
          return;
        }
        setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [api, nonce]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  const plan =
    PLAN_CATALOG.find((p) => p.code === user.plan) || PLAN_CATALOG[0];
  const {
    fabrics,
    suppliers,
    rolls,
    passports,
    movements,
    designs,
    purchases,
  } = data;
  const total = fabrics.reduce((s, f) => s + Number(f.quantityMeters), 0);
  const value = fabrics.reduce(
    (s, f) => s + Number(f.quantityMeters) * Number(f.costPerMeter),
    0,
  );
  const low = fabrics.filter(
    (f) => Number(f.quantityMeters) < Number(f.minStockQuantity),
  );
  const filtered = fabrics.filter(
    (f) =>
      (type === "All fabrics" ||
        f.type === type ||
        (type === "Low stock" &&
          Number(f.quantityMeters) < Number(f.minStockQuantity))) &&
      `${f.name} ${f.type} ${f.color}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const fabricName = (id) => fabrics.find((f) => f.id === id)?.name || "Fabric";
  const supplierName = (id) =>
    suppliers.find((s) => s.id === id)?.name || "Unassigned";
  const opts = fabrics.map((f) => ({
    value: f.id,
    label: `${f.name} · ${qty(f.quantityMeters)} m`,
  }));
  const supplierOpts = suppliers.map((s) => ({ value: s.id, label: s.name }));
  const rollOpts = rolls.map((r) => ({
    value: r.id,
    label: `${r.label} · ${fabricName(r.fabricId)} · ${qty(r.quantityMeters)} m`,
  }));
  function go(p) {
    setPage(p);
    setMenu(false);
    setSearch("");
    setType("All fabrics");
    setMovementRoll("");
    setError("");
  }
  async function action(fn, label = "Your record has been saved.") {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
      setDialog(null);
      setNonce((x) => x + 1);
      setToast(label);
    } catch (e) {
      if (e.status === 401) onExpired();
      else setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function open(title, fields, save, subtitle, submitLabel) {
    setError("");
    setDialog({ title, fields, save, subtitle, submitLabel });
  }
  const addFabric = () =>
    open(
      "A new thread in your collection.",
      [
        field("name", "Fabric name", "text", {
          placeholder: "Name your fabric",
        }),
        field("type", "Fabric type", "select", {
          options: ["Cotton", "Linen", "Silk", "Denim", "Knit", "Other"].map(
            (t) => ({ value: t, label: t }),
          ),
        }),
        field("color", "Color"),
        field("gsm", "GSM", "number", { min: 1, max: 2000, step: 1 }),
        field("widthInches", "Width (inches)", "number", {
          min: 0.1,
          max: 200,
          step: 0.1,
        }),
        field("quantityMeters", "Opening stock (meters)", "number", {
          min: 0,
          max: 100000000,
          step: 0.1,
        }),
        field("costPerMeter", "Cost per meter (₹)", "number", {
          min: 0,
          max: 10000000,
          step: 0.01,
        }),
        field("location", "Storage location", "text", { optional: true }),
      ],
      (v) => api.addFabric(v),
      "Your opening stock becomes one traceable roll.",
      "Save fabric",
    );
  const addSupplier = () =>
    open(
      "A new connection.",
      [
        field("name", "Supplier name"),
        field("contact", "Contact person", "text", { optional: true }),
        field("email", "Contact email", "email", { optional: true }),
        field("phone", "Contact phone", "tel", { optional: true }),
      ],
      (v) => api.addSupplier(v),
    );
  const addRoll = () =>
    open(
      "Every roll, accounted for.",
      [
        field("fabricId", "Fabric", "select", { options: opts }),
        field("label", "Roll label"),
        field("quantityMeters", "Quantity (meters)", "number", {
          min: 0.1,
          max: 100000000,
          step: 0.1,
        }),
        field("location", "Location", "text", { optional: true }),
        field("dyeLot", "Dye lot / batch", "text", { optional: true }),
      ],
      (v) => api.addRoll(v),
      "Adds an independent physical roll and records stock inward.",
    );
  const move = () =>
    open(
      "Keep your stock in motion.",
      [
        field("rollId", "Physical roll", "select", { options: rollOpts }),
        field("direction", "Movement", "select", {
          options: [
            ["IN", "Stock inward"],
            ["OUT", "Stock outward"],
            ["ADJUST_IN", "Adjustment increase"],
            ["ADJUST_OUT", "Adjustment decrease"],
          ].map(([value, label]) => ({ value, label })),
        }),
        field("quantityMeters", "Quantity (meters)", "number", {
          min: 0.1,
          max: 100000000,
          step: 0.1,
        }),
        field("note", "Reference / reason", "textarea", {
          optional: true,
          wide: true,
          maxLength: 500,
        }),
      ],
      (v) => api.moveStock(v),
      "Reserved production stock is protected from outward movements.",
    );
  const purchase = () =>
    open(
      "Bring the next possibility in.",
      [
        field("supplierId", "Supplier", "select", { options: supplierOpts }),
        field("fabricId", "Fabric", "select", { options: opts }),
        field("rollLabel", "New roll label"),
        field("quantityMeters", "Received quantity (m)", "number", {
          min: 0.1,
          max: 100000000,
          step: 0.1,
        }),
        field("unitPrice", "Purchase price per meter (₹)", "number", {
          min: 0,
          max: 10000000,
          step: 0.01,
        }),
        field("reference", "Purchase reference", "text", { optional: true }),
        field("location", "Storage location", "text", { optional: true }),
        field("dyeLot", "Dye lot", "text", { optional: true }),
      ],
      (v) => api.addPurchase(v),
      "Creates a roll, records a purchase and updates the weighted inventory cost.",
    );
  function passport(f) {
    const p = passports.find((p) => p.fabricId === f.id) || {};
    open(
      `${f.name} · quality passport`,
      [
        field("composition", "Composition", "text", {
          optional: true,
          value: p.composition || "",
        }),
        field("shrinkagePercent", "Shrinkage (%)", "number", {
          min: 0,
          max: 100,
          value: p.shrinkagePercent || 0,
        }),
        field("dyeLot", "Dye lot", "text", {
          optional: true,
          value: p.dyeLot || "",
        }),
        field("shade", "Shade / batch note", "text", {
          optional: true,
          value: p.shade || "",
        }),
        field("care", "Wash care", "textarea", {
          optional: true,
          value: p.care || "",
          maxLength: 500,
          wide: true,
        }),
        field("notes", "Quality & defect notes", "textarea", {
          optional: true,
          value: p.notes || "",
          wide: true,
        }),
        field("minStockQuantity", "Minimum stock (meters)", "number", {
          min: 0,
          max: 100000000,
          step: 0.1,
          value: f.minStockQuantity || 0,
        }),
        field("supplierId", "Supplier", "select", {
          options: supplierOpts,
          optional: true,
          nullable: true,
          value: f.supplierId || "",
        }),
        field("photoDataUrl", "One fabric photograph", "photo", {
          optional: true,
          value: p.photoDataUrl || "",
          wide: true,
        }),
      ],
      (v) => api.savePassport(f.id, v),
      "Specifications, care, shade and quality notes travel with your fabric.",
    );
  }
  function exportCsv() {
    const url = URL.createObjectURL(
      new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "vox-fabric-inventory.csv";
    link.click();
    URL.revokeObjectURL(url);
    setToast("Your fabric inventory has been exported.");
  }
  async function importCsv(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (file.size > 2097152) throw new Error("Use a CSV smaller than 2 MB.");
      const records = importRecords(await file.text());
      if (!records.length)
        throw new Error("This CSV contains no fabric records.");
      await action(
        () => api.importFabrics(records),
        `${records.length} fabrics imported.`,
      );
    } catch (e) {
      setError(e.message);
    }
  }
  function draft() {
    open(
      "Plan a fabric procurement.",
      [
        field("fabricId", "Fabric", "select", { options: opts }),
        field("quantityMeters", "Required meters", "number", {
          min: 0.1,
          max: 100000000,
          step: 0.1,
        }),
        field("note", "Procurement notes", "textarea", {
          wide: true,
          optional: true,
          maxLength: 1000,
        }),
      ],
      (v) => api.procurement(v),
      "Saves a draft request. It does not place an order with a supplier.",
      "Save procurement draft",
    );
  }
  const complete = (d) =>
    open(
      "Close the production loop.",
      [
        field(
          "actualWastageMeters",
          "Actual cutting wastage (meters)",
          "number",
          { min: 0, max: Number(d.requiredMeters), step: 0.1, value: 0 },
        ),
      ],
      (v) => api.completeDesign(d.id, v),
      `Consumes the reserved ${qty(d.requiredMeters)} meters. Wastage is part of this quantity.`,
      "Complete reserved batch",
    );
  function emptyView(title, text, button, fn) {
    return (
      <div className="vx-empty">
        <div className="bp-empty-illustration">
          <span />
          <span />
          <span />
        </div>
        <div className="bp-kicker">EVERY COLLECTION STARTS SOMEWHERE</div>
        <h3>{title}</h3>
        <p>{text}</p>
        {button && (
          <button className="bp-button" onClick={fn}>
            <Icon name="plus" size={15} />
            {button}
          </button>
        )}
      </div>
    );
  }
  function fabricTable(compact = false) {
    const records = compact ? filtered.slice(0, 5) : filtered;
    return records.length ? (
      <div className="vx-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fabric name</th>
              <th>Specifications</th>
              <th>On-hand stock</th>
              <th>
                {hasFeature(user.plan, "lowStock") ? "Status" : "Location"}
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {records.map((f, i) => {
              const p = passports.find((p) => p.fabricId === f.id);
              return (
                <tr
                  key={f.id}
                  tabIndex={0}
                  onClick={() => passport(f)}
                  onKeyDown={(e) => e.key === "Enter" && passport(f)}
                  aria-label={`View ${f.name} passport`}
                >
                  <td>
                    <div className="vx-fabric-name">
                      <div className={"vx-swatch swatch-" + (i % 5)}>
                        {p?.photoDataUrl ? (
                          <img src={p.photoDataUrl} alt="" />
                        ) : (
                          f.name.slice(0, 1)
                        )}
                      </div>
                      <span>
                        <strong>{f.name}</strong>
                        <small>{f.color}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    {f.type}
                    <small>
                      {f.gsm} GSM · {f.widthInches}″ width
                    </small>
                  </td>
                  <td>
                    <strong>{qty(f.quantityMeters)} m</strong>
                    <small>
                      {
                        rolls.filter(
                          (r) =>
                            r.fabricId === f.id && Number(r.quantityMeters) > 0,
                        ).length
                      }{" "}
                      active rolls
                    </small>
                  </td>
                  <td>
                    {hasFeature(user.plan, "lowStock") ? (
                      <span
                        className={
                          "vx-badge " +
                          (Number(f.quantityMeters) < Number(f.minStockQuantity)
                            ? "warn"
                            : "")
                        }
                      >
                        {Number(f.quantityMeters) < Number(f.minStockQuantity)
                          ? "Low stock"
                          : "In stock"}
                      </span>
                    ) : (
                      f.location || "—"
                    )}
                  </td>
                  <td>
                    <Icon name="arrow" size={14} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ) : (
      emptyView(
        search ? "No matching fabrics." : "Your first fabric belongs here.",
        search
          ? "Try another name, type or color."
          : "Add your first fabric. Every record in this workspace will be yours.",
        !search ? "Add your first fabric" : null,
        addFabric,
      )
    );
  }
  function gate(title, text, level = "Standard") {
    return (
      <section className="vx-gate">
        <span>
          <Icon name="lock" size={23} />
        </span>
        <div className="bp-kicker">A LITTLE MORE ROOM TO GROW</div>
        <h3>{title}</h3>
        <p>{text}</p>
        <button className="vx-link" onClick={() => go("Plans & billing")}>
          Explore {level} <Icon name="arrow" size={13} />
        </button>
      </section>
    );
  }
  const actionButtons =
    page === "Overview" || page === "Fabric library" ? (
      <>
        <button
          className="vx-button"
          onClick={exportCsv}
          disabled={loading || busy}
        >
          <Icon name="arrow" size={13} />
          Export CSV
        </button>
        <button
          className="bp-button"
          onClick={addFabric}
          disabled={loading || busy}
        >
          <Icon name="plus" size={15} />
          Add fabric
        </button>
      </>
    ) : page === "Roll inventory" ? (
      <button
        className="bp-button"
        onClick={addRoll}
        disabled={!fabrics.length || busy}
      >
        <Icon name="plus" size={15} />
        Add roll
      </button>
    ) : page === "Stock movements" ? (
      <button
        className="bp-button"
        onClick={move}
        disabled={!rolls.length || busy}
      >
        <Icon name="plus" size={15} />
        Record movement
      </button>
    ) : page === "Suppliers" ? (
      <>
        <button
          className="vx-button"
          onClick={purchase}
          disabled={!fabrics.length || !suppliers.length || busy}
        >
          Record purchase
        </button>
        <button className="bp-button" onClick={addSupplier}>
          <Icon name="plus" size={15} />
          Add supplier
        </button>
      </>
    ) : page === "Procurement" ? (
      <button
        className="bp-button"
        onClick={draft}
        disabled={!fabrics.length || busy}
      >
        <Icon name="plus" size={15} />
        New draft
      </button>
    ) : null;
  const chartEnd = new Date();
  chartEnd.setHours(24, 0, 0, 0);
  const chartStart = new Date(chartEnd);
  chartStart.setDate(chartStart.getDate() - period);
  const chartDays = Array.from({ length: 7 }, (_, i) => {
    const start = new Date(chartStart);
    start.setDate(start.getDate() + Math.floor((i * period) / 7));
    const end = new Date(chartStart);
    end.setDate(end.getDate() + Math.floor(((i + 1) * period) / 7));
    const labelDay = new Date(end.getTime() - 86400000);
    const entries = movements.filter(
      (m) => new Date(m.createdAt) >= start && new Date(m.createdAt) < end,
    );
    return {
      label: labelDay.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
      in: entries
        .filter((m) => m.direction.includes("IN"))
        .reduce((s, m) => s + Number(m.quantityMeters), 0),
      out: entries
        .filter((m) => m.direction.includes("OUT"))
        .reduce((s, m) => s + Number(m.quantityMeters), 0),
    };
  });
  const maxChart = Math.max(1, ...chartDays.flatMap((d) => [d.in, d.out]));
  return (
    <div className="bp-root vx-app">
      <input
        ref={uploadRef}
        hidden
        type="file"
        accept=".csv"
        onChange={importCsv}
      />
      {menu && (
        <button
          className="vx-scrim"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={"vx-sidebar " + (menu ? "open" : "")}>
        <Brand light />
        <div className="vx-workspace-name">
          <span>{user.businessName.slice(0, 1)}</span>
          <div>
            <strong>{user.businessName}</strong>
            <small>Business Portal</small>
          </div>
          <Icon name="check" size={13} />
        </div>
        <div className="vx-nav-label">YOUR WORKSPACE</div>
        <nav>
          {names.map((n, i) => (
            <React.Fragment key={n}>
              {i === 6 && (
                <div className="vx-nav-label vx-nav-section">
                  PLAN & PRODUCE
                </div>
              )}
              {i === 9 && (
                <div className="vx-nav-label vx-nav-section">YOUR BUSINESS</div>
              )}
              <button
                className={page === n ? "active" : ""}
                onClick={() => go(n)}
              >
                <Icon name={symbol[i]} size={17} />
                <span>{n}</span>
                {n === "Fabric library" && <small>{fabrics.length}</small>}
              </button>
            </React.Fragment>
          ))}
        </nav>
        <div className="vx-sidebar-footer">
          <div className="vx-plan-card">
            <span>
              <Icon name="spark" size={16} />
              {tierName(user.plan)} workspace
            </span>
            <p>
              {fabrics.length} of {plan.fabricLimit ?? "unlimited"} fabric
              records
            </p>
            <div className="vx-progress">
              <i
                style={{
                  width: `${plan.fabricLimit ? Math.min(100, (fabrics.length / plan.fabricLimit) * 100) : 5}%`,
                }}
              />
            </div>
            <button onClick={() => go("Plans & billing")}>
              Room for your next chapter <Icon name="arrow" size={12} />
            </button>
          </div>
          <div className="vx-user">
            <span>{user.ownerName.slice(0, 1)}</span>
            <div>
              <strong>{user.ownerName}</strong>
              <small>Verified business owner</small>
            </div>
            <button
              className="bp-icon-button"
              aria-label="Sign out"
              disabled={busy}
              onClick={() => action(onLogout, "Signed out.")}
            >
              <Icon name="logout" size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="vx-main">
        <header className="vx-topbar">
          <button
            className="bp-icon-button vx-menu"
            aria-label="Open navigation"
            onClick={() => setMenu(true)}
          >
            <Icon name="grid" />
          </button>
          <span>
            Business Portal <i>/</i>
            <strong>{page}</strong>
          </span>
          <div>
            <input
              aria-label="Search fabrics"
              value={search}
              placeholder="Search your fabric library…"
              onChange={(e) => {
                setSearch(e.target.value);
                if (page !== "Overview" && page !== "Fabric library")
                  setPage("Fabric library");
              }}
            />
            <span className="vx-verified">
              <Icon name="lock" size={11} />
              Verified workspace
            </span>
            <span className="vx-top-avatar">{user.ownerName.slice(0, 1)}</span>
          </div>
        </header>
        <main className="vx-content">
          <div className="vx-page-heading">
            <div>
              <div className="bp-kicker">YOUR WORKSPACE, WOVEN TOGETHER</div>
              <h1>
                {page === "Overview"
                  ? fabrics.length
                    ? "A good day starts with clarity."
                    : `Welcome, ${user.ownerName}.`
                  : page}
              </h1>
              <p>
                {
                  {
                    Overview: fabrics.length
                      ? "Every fabric, every roll, every possibility. Your business at a glance."
                      : "Your workspace is ready. Let’s add the first fabric in your collection.",
                    "Fabric library":
                      "The materials behind your next possibility. Organized, connected, yours.",
                    "Roll inventory":
                      "Every physical roll. Every meter. Every place it belongs.",
                    "Quality passports":
                      "The story behind the fabric, from composition to care.",
                    "Stock movements":
                      "A clear record of what comes in and what goes out.",
                    Suppliers:
                      "Good relationships make great fabrics. Keep yours connected.",
                    "Design & consumption":
                      "From a thoughtful idea to a precise production plan.",
                    "Fabric intelligence":
                      "A little foresight. A lot less material left behind.",
                    Procurement:
                      "Give your next material purchase a considered starting point.",
                    "Account & team": "A space shaped around your business.",
                  }[page]
                }
              </p>
            </div>
            <div className="vx-heading-actions">{actionButtons}</div>
          </div>
          <ErrorMessage message={!dialog ? error : ""} />
          {error && !dialog && (
            <button
              className="vx-button"
              onClick={() => setNonce((x) => x + 1)}
            >
              Retry loading your records
            </button>
          )}
          {loading ? (
            <div className="vx-loading">
              <span className="bp-spinner" />
              <p>Gathering your workspace…</p>
            </div>
          ) : error && !dialog ? null : (
            <>
              {page === "Overview" && (
                <OverviewScreen
                  plan={plan}
                  fabrics={fabrics}
                  user={user}
                  total={total}
                  value={value}
                  rolls={rolls}
                  low={low}
                  period={period}
                  setPeriod={setPeriod}
                  chartDays={chartDays}
                  maxChart={maxChart}
                  fabricTable={fabricTable}
                  go={go}
                  gate={gate}
                  passport={passport}
                  fabricName={fabricName}
                  movements={movements}
                />
              )}
              {page === "Fabric library" && (
                <section className="vx-card">
                  <div className="vx-table-toolbar">
                    <div className="vx-tabs">
                      {[
                        "All fabrics",
                        ...(hasFeature(user.plan, "fullSearch")
                          ? ["Cotton", "Linen", "Silk"]
                          : []),
                      ].map((t) => (
                        <button
                          className={type === t ? "selected" : ""}
                          key={t}
                          onClick={() => setType(t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <button
                      className="vx-button"
                      onClick={() => uploadRef.current.click()}
                      disabled={busy}
                    >
                      Import CSV
                    </button>
                  </div>
                  {fabricTable()}
                </section>
              )}
              {page === "Roll inventory" &&
                (rolls.length ? (
                  <div className="vx-roll-grid">
                    {rolls.map((r, i) => (
                      <section className="vx-card vx-roll" key={r.id}>
                        <div className={"vx-roll-art color-" + (i % 4)}>
                          <span />
                          <small>{fabricName(r.fabricId)}</small>
                        </div>
                        <div>
                          <h2>{r.label}</h2>
                          <p>
                            {qty(r.quantityMeters)} m on hand <span>·</span>{" "}
                            {qty(r.reservedMeters)} m reserved
                          </p>
                          <dl>
                            <div>
                              <dt>Location</dt>
                              <dd>{r.location || "Not recorded"}</dd>
                            </div>
                            <div>
                              <dt>Dye lot</dt>
                              <dd>{r.dyeLot || "Not recorded"}</dd>
                            </div>
                          </dl>
                          <button className="vx-link" onClick={move}>
                            Record roll movement <Icon name="arrow" size={13} />
                          </button>
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <section className="vx-card">
                    {emptyView(
                      "Every roll will have a place.",
                      "Add a fabric with opening stock, or receive a new physical roll.",
                      fabrics.length ? "Add a roll" : "Add your first fabric",
                      fabrics.length ? addRoll : addFabric,
                    )}
                  </section>
                ))}
              {page === "Quality passports" &&
                (fabrics.length ? (
                  <div className="vx-passport-grid">
                    {fabrics.map((f) => {
                      const p = passports.find((p) => p.fabricId === f.id);
                      return (
                        <button
                          className="vx-card vx-passport"
                          key={f.id}
                          onClick={() => passport(f)}
                        >
                          <div>
                            <Icon name="lock" size={22} />
                            <span>FABRIC QUALITY PASSPORT</span>
                          </div>
                          <h2>{f.name}</h2>
                          <p>
                            {f.color} · {f.gsm} GSM · {f.widthInches}″ width
                          </p>
                          {p?.photoDataUrl && (
                            <img
                              src={p.photoDataUrl}
                              alt={f.name + " photograph"}
                            />
                          )}
                          <dl>
                            <div>
                              <dt>Composition</dt>
                              <dd>{p?.composition || "Not recorded"}</dd>
                            </div>
                            <div>
                              <dt>Dye lot</dt>
                              <dd>{p?.dyeLot || "Not recorded"}</dd>
                            </div>
                            <div>
                              <dt>Shrinkage</dt>
                              <dd>{qty(p?.shrinkagePercent)}%</dd>
                            </div>
                          </dl>
                          <span>
                            Open passport <Icon name="arrow" size={13} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <section className="vx-card">
                    {emptyView(
                      "Every fabric has a story.",
                      "Add a fabric to begin its composition, dye-lot and care passport.",
                      "Add your first fabric",
                      addFabric,
                    )}
                  </section>
                ))}
              {page === "Stock movements" && (
                <section className="vx-card">
                  <div className="vx-card-heading">
                    <div>
                      <h2>Your inventory story</h2>
                      <p>A ledger of receipts, issues and adjustments.</p>
                    </div>
                  </div>
                  <div className="vx-roll-history-filter">
                    <label>
                      Physical roll
                      <select
                        aria-label="Filter movement history by roll"
                        value={movementRoll}
                        onChange={(e) => setMovementRoll(e.target.value)}
                      >
                        <option value="">All physical rolls</option>
                        {rolls.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label} · {fabricName(r.fabricId)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {movements.length ? (
                    <div className="vx-table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Fabric / reference</th>
                            <th>Physical roll</th>
                            <th>Movement</th>
                            <th>Quantity</th>
                            <th>Recorded</th>
                          </tr>
                        </thead>
                        <tbody>
                          {movements
                            .filter(
                              (m) => !movementRoll || m.rollId === movementRoll,
                            )
                            .map((m) => (
                              <tr key={m.id}>
                                <td>
                                  <strong>{fabricName(m.fabricId)}</strong>
                                  <small>{m.note || "Stock movement"}</small>
                                </td>
                                <td>
                                  <span className="vx-badge">
                                    {m.direction
                                      .toLowerCase()
                                      .replaceAll("_", " ")}
                                  </span>
                                </td>
                                <td>{qty(m.quantityMeters)} m</td>
                                <td>{date(m.createdAt)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    emptyView(
                      "Your first movement starts a story.",
                      "Add a fabric or receive a roll to begin your inventory ledger.",
                      fabrics.length
                        ? "Receive a roll"
                        : "Add your first fabric",
                      fabrics.length ? addRoll : addFabric,
                    )
                  )}
                </section>
              )}
              {page === "Suppliers" && (
                <SuppliersScreen
                  suppliers={suppliers}
                  purchases={purchases}
                  supplierName={supplierName}
                  fabricName={fabricName}
                  emptyView={emptyView}
                  addSupplier={addSupplier}
                />
              )}
              {page === "Design & consumption" && (
                <DesignCalculator
                  fabrics={fabrics}
                  designs={designs}
                  plan={user.plan}
                  busy={busy}
                  onPlans={() => go("Plans & billing")}
                  onSave={(v) =>
                    action(
                      () => api.addDesign(v),
                      "Design consumption record saved.",
                    )
                  }
                  onReserve={(id) =>
                    action(
                      () => api.reserveDesign(id),
                      "Production stock reserved.",
                    )
                  }
                  onComplete={complete}
                />
              )}
              {page === "Fabric intelligence" && (
                <IntelligenceScreen
                  user={user}
                  fabrics={fabrics}
                  movements={movements}
                  rolls={rolls}
                  designs={designs}
                  purchases={purchases}
                  suppliers={suppliers}
                  gate={gate}
                  purchase={purchase}
                />
              )}
              {page === "Procurement" && (
                <section className="vx-card">
                  <div className="vx-card-heading">
                    <div>
                      <h2>Your procurement drafts</h2>
                      <p>
                        Plan requirements here. Supplier fulfilment uses your
                        procurement workflow.
                      </p>
                    </div>
                  </div>
                  {data.procurement.length ? (
                    <div className="vx-table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Fabric</th>
                            <th>Required quantity</th>
                            <th>Notes</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.procurement.map((p) => (
                            <tr key={p.id}>
                              <td>{fabricName(p.fabricId)}</td>
                              <td>{qty(p.quantityMeters)} m</td>
                              <td>{p.note || "—"}</td>
                              <td>
                                <span className="vx-badge">
                                  Draft · no order placed
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    emptyView(
                      "A considered start to your next purchase.",
                      "Create a material requirement draft. Drafts do not place supplier orders.",
                      fabrics.length
                        ? "New procurement draft"
                        : "Add a fabric first",
                      fabrics.length ? draft : addFabric,
                    )
                  )}
                </section>
              )}
              {page === "Plans & billing" && <Plans current={user.plan} />}
              {page === "Account & team" && (
                <div className="vx-account-grid">
                  <section className="vx-card vx-insight">
                    <h2>Your business</h2>
                    <dl>
                      <div>
                        <dt>Owner</dt>
                        <dd>{user.ownerName}</dd>
                      </div>
                      <div>
                        <dt>Business</dt>
                        <dd>{user.businessName}</dd>
                      </div>
                      <div>
                        <dt>Verified phone</dt>
                        <dd>{user.phone}</dd>
                      </div>
                      <div>
                        <dt>Contact email</dt>
                        <dd>{user.email || "Not provided"}</dd>
                      </div>
                      <div>
                        <dt>City</dt>
                        <dd>{user.city || "Not provided"}</dd>
                      </div>
                    </dl>
                    <button
                      className="vx-link"
                      onClick={() =>
                        open(
                          "A space shaped around you.",
                          [
                            field("ownerName", "Owner name", "text", {
                              value: user.ownerName,
                            }),
                            field("businessName", "Business name", "text", {
                              value: user.businessName,
                            }),
                            field("email", "Contact email", "email", {
                              optional: true,
                              value: user.email || "",
                            }),
                            field("city", "City", "text", {
                              optional: true,
                              value: user.city || "",
                            }),
                          ],
                          (v) =>
                            api
                              .saveProfile(v)
                              .then(() => window.location.reload()),
                        )
                      }
                    >
                      Edit business details <Icon name="arrow" size={13} />
                    </button>
                  </section>
                  <section className="vx-card vx-insight">
                    <h2>Account & verification</h2>
                    <p>
                      Your phone was verified before opening this workspace.
                    </p>
                    <div className="vx-insight-row">
                      <span>Phone verification</span>
                      <span className="vx-badge">Verified</span>
                    </div>
                    <div className="vx-insight-row">
                      <span>Email verification</span>
                      <span className="vx-badge neutral">Coming later</span>
                    </div>
                    <div className="vx-insight-row">
                      <span>Team entitlement</span>
                      <span>
                        {plan.teamMembers}{" "}
                        {plan.teamMembers === 1 ? "member" : "members"}
                      </span>
                    </div>
                    <p>
                      Team invitations aren’t available yet. Your current owner
                      account is the only active member.
                    </p>
                    <button
                      className="vx-link"
                      onClick={() => go("Plans & billing")}
                    >
                      Review your plan <Icon name="arrow" size={13} />
                    </button>
                  </section>
                </div>
              )}
            </>
          )}
          <footer className="vx-footer">
            <span>© {new Date().getFullYear()} VOX Fabric OS</span>
            <span>All your threads, in one place.</span>
            <span>{tierName(user.plan)} workspace</span>
          </footer>
        </main>
      </div>
      {dialog && (
        <WorkspaceDialog
          {...dialog}
          busy={busy}
          error={error}
          onClose={() => {
            setDialog(null);
            setError("");
          }}
          onSave={(v) => action(() => dialog.save(v))}
        />
      )}
      {toast && (
        <div className="vx-toast" role="status">
          <Icon name="check" size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
