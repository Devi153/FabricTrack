import React from "react";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, vi, afterEach } from "vitest";
import BusinessPortal from "../src/business-portal/BusinessPortal";
const owner = {
  id: "owner-1",
  phone: "+919876543210",
  ownerName: "Devi",
  businessName: "Devi Textiles",
  email: "",
  city: "",
  onboardingComplete: true,
  plan: "FREE",
};
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
function api(overrides = {}) {
  return {
    session: vi.fn().mockResolvedValue(owner),
    fabrics: vi.fn().mockResolvedValue([]),
    workspace: vi.fn().mockResolvedValue(empty),
    logout: vi.fn().mockResolvedValue({}),
    addSupplier: vi.fn().mockResolvedValue({}),
    addDesign: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}
afterEach(cleanup);
it("public plans show Free Standard Business without bypassing verification", async () => {
  const service = api({
    session: vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("Sign in"), { status: 401 })),
  });
  const user = userEvent.setup();
  render(<BusinessPortal api={service} />);
  await screen.findByLabelText("Phone number");
  await user.click(screen.getByRole("button", { name: /Explore plans/ }));
  await screen.findByRole("heading", { name: "A little room to grow." });
  expect(screen.getByRole("heading", { name: "Standard" })).toBeTruthy();
  expect(screen.getAllByText("1 photograph per fabric").length).toBe(3);
  expect(service.fabrics).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole("button", { name: "Close plan comparison" }),
  );
  expect(screen.getByLabelText("Phone number")).toBeTruthy();
});
it("all workspace pages render empty owner data without generating example records", async () => {
  const service = api();
  const user = userEvent.setup();
  render(<BusinessPortal api={service} />);
  await screen.findByRole("heading", {
    name: "Your first fabric belongs here.",
  });
  for (const page of [
    "Roll inventory",
    "Quality passports",
    "Stock movements",
    "Suppliers",
    "Design & consumption",
    "Fabric intelligence",
    "Procurement",
    "Plans & billing",
    "Account & team",
  ]) {
    await user.click(screen.getByRole("button", { name: page, exact: true }));
    expect(screen.queryByText("Organic Cotton")).toBeNull();
  }
  expect(screen.getByText(/only active member/)).toBeTruthy();
  expect(service.addSupplier).not.toHaveBeenCalled();
  expect(service.addDesign).not.toHaveBeenCalled();
});
it("Free accounts get clear Standard upgrade gates and no stock reservation control", async () => {
  const user = userEvent.setup();
  render(<BusinessPortal api={api()} />);
  await screen.findByRole("heading", {
    name: "Your first fabric belongs here.",
  });
  await user.click(
    screen.getByRole("button", { name: "Fabric intelligence", exact: true }),
  );
  expect(screen.getAllByText("Explore Standard").length).toBeGreaterThan(0);
  expect(screen.queryByRole("button", { name: /Reserve stock/ })).toBeNull();
  await user.click(
    screen.getByRole("button", { name: "Design & consumption", exact: true }),
  );
  expect(screen.queryByRole("button", { name: "+ Add size" })).toBeNull();
});
it("supplier creation posts owner-entered data with no workspace ID", async () => {
  const service = api();
  const user = userEvent.setup();
  render(<BusinessPortal api={service} />);
  await screen.findByRole("heading", {
    name: "Your first fabric belongs here.",
  });
  await user.click(
    screen.getByRole("button", { name: "Suppliers", exact: true }),
  );
  await user.click(screen.getAllByRole("button", { name: "Add supplier" })[0]);
  await user.type(screen.getByLabelText("Supplier name"), "My supplier");
  await user.click(screen.getByRole("button", { name: "Save record" }));
  await waitFor(() =>
    expect(service.addSupplier).toHaveBeenCalledWith({
      name: "My supplier",
      contact: "",
      email: "",
      phone: "",
    }),
  );
});
it("movement chart includes real records throughout the selected 30-day window", async () => {
  const snapshot = {
    ...empty,
    movements: [
      {
        id: "move-1",
        fabricId: "fabric-1",
        direction: "IN",
        quantityMeters: 100,
        note: "Receipt",
        createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      },
    ],
  };
  render(
    <BusinessPortal
      api={api({ workspace: vi.fn().mockResolvedValue(snapshot) })}
    />,
  );
  await screen.findByRole("heading", { name: "Stock in motion" });
  await waitFor(() => expect(screen.getByTitle(/100 m inward/)).toBeTruthy());
});
