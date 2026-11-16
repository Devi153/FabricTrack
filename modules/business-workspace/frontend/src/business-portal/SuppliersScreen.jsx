import React from "react";
import Icon from "./Icons";
import { hasFeature } from "./tiers";
import { qty, money, date } from "./format";
export default function SuppliersScreen({
  suppliers,
  purchases,
  supplierName,
  fabricName,
  emptyView,
  addSupplier,
}) {
  return (
    <>
      {suppliers.length ? (
        <div className="vx-supplier-grid">
          {suppliers.map((s) => (
            <section className="vx-card vx-supplier" key={s.id}>
              <span className="vx-supplier-avatar">
                {s.name.slice(0, 2).toUpperCase()}
              </span>
              <h2>{s.name}</h2>
              <p>{s.contact || "Your textile partner"}</p>
              <dl>
                <div>
                  <dt>Phone</dt>
                  <dd>{s.phone || "Not recorded"}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{s.email || "Not recorded"}</dd>
                </div>
              </dl>
              <div className="vx-supplier-purchases">
                <strong>
                  {purchases.filter((p) => p.supplierId === s.id).length}
                </strong>{" "}
                recorded purchases
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="vx-card">
          {emptyView(
            "Good fabrics start with good connections.",
            "Add your first supplier to connect purchase history and fabric costs.",
            "Add supplier",
            addSupplier,
          )}
        </section>
      )}
      <section className="vx-card vx-purchase-history">
        <div className="vx-card-heading">
          <div>
            <h2>Supplier purchase history</h2>
            <p>Receipts and prices recorded by your business.</p>
          </div>
        </div>
        {purchases.length ? (
          <div className="vx-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Fabric / reference</th>
                  <th>Quantity</th>
                  <th>Price / meter</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td>{supplierName(p.supplierId)}</td>
                    <td>
                      {fabricName(p.fabricId)}
                      <small>{p.reference}</small>
                    </td>
                    <td>{qty(p.quantityMeters)} m</td>
                    <td>{money(p.unitPrice)}</td>
                    <td>{date(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="vx-empty-compact">
            <p>
              Record a purchase to connect a supplier, fabric receipt and
              historical price.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
