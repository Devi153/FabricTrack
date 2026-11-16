import React from "react";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach } from "vitest";
import BusinessPortal from "../src/business-portal/BusinessPortal";
const unauthorized = Object.assign(new Error("Please sign in"), {
  status: 401,
});
const incomplete = {
  id: "owner-1",
  phone: "+919876543210",
  ownerName: "",
  businessName: "",
  email: "",
  city: "",
  onboardingComplete: false,
  plan: "FREE",
};
const complete = {
  ...incomplete,
  ownerName: "Devi",
  businessName: "Devi Textiles",
  onboardingComplete: true,
};
function makeApi(overrides = {}) {
  return {
    session: vi.fn().mockRejectedValue(unauthorized),
    requestOtp: vi.fn().mockResolvedValue({
      challengeId: "challenge-1",
      expiresInSeconds: 300,
      resendAfterSeconds: 60,
    }),
    verifyOtp: vi.fn().mockResolvedValue(incomplete),
    saveProfile: vi.fn().mockResolvedValue(complete),
    fabrics: vi.fn().mockResolvedValue([]),
    addFabric: vi.fn().mockResolvedValue({ id: "fabric-1" }),
    logout: vi.fn().mockResolvedValue({ signedOut: true }),
    ...overrides,
  };
}
afterEach(cleanup);
describe("Business Portal owner flow", () => {
  it("keeps inventory behind verification, saves owner details, then shows empty inventory", async () => {
    const api = makeApi();
    const user = userEvent.setup();
    render(<BusinessPortal api={api} />);
    await screen.findByRole("heading", { name: "Welcome to your workspace." });
    expect(api.fabrics).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText("Phone number"), "98765 43210");
    await user.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    await screen.findByLabelText("Verification code");
    expect(api.requestOtp).toHaveBeenCalledWith("+919876543210");
    expect(api.fabrics).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText("Verification code"), "1234");
    await user.click(screen.getByRole("button", { name: "Verify & continue" }));
    await screen.findByRole("heading", {
      name: "Let’s make it your business.",
    });
    expect(api.verifyOtp).toHaveBeenCalledWith("challenge-1", "1234");
    expect(api.fabrics).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText("Your name"), "Devi");
    await user.type(screen.getByLabelText("Business name"), "Devi Textiles");
    await user.click(screen.getByRole("button", { name: "Open my workspace" }));
    await screen.findByRole("heading", {
      name: "Your first fabric belongs here.",
    });
    expect(api.saveProfile).toHaveBeenCalledWith({
      ownerName: "Devi",
      businessName: "Devi Textiles",
      email: "",
      city: "",
    });
    expect(api.fabrics).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Organic Cotton")).toBeNull();
  });
  it("keeps rejected OTP on verification screen without opening dashboard", async () => {
    const api = makeApi({
      verifyOtp: vi.fn().mockRejectedValue(new Error("The code is invalid.")),
    });
    const user = userEvent.setup();
    render(<BusinessPortal api={api} />);
    await screen.findByLabelText("Phone number");
    await user.type(screen.getByLabelText("Phone number"), "9876543210");
    await user.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    await screen.findByLabelText("Verification code");
    await user.type(screen.getByLabelText("Verification code"), "0000");
    await user.click(screen.getByRole("button", { name: "Verify & continue" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("alert").textContent).toContain("invalid");
    expect(api.fabrics).not.toHaveBeenCalled();
    expect(api.saveProfile).not.toHaveBeenCalled();
  });
  it("shows returning owner records from server without creating sample data", async () => {
    const api = makeApi({
      session: vi.fn().mockResolvedValue(complete),
      fabrics: vi.fn().mockResolvedValue([
        {
          id: "saved-1",
          name: "My saved fabric",
          color: "Blue",
          type: "Cotton",
          gsm: 180,
          widthInches: 58,
          quantityMeters: 20,
          costPerMeter: 100,
          location: "A",
        },
      ]),
    });
    render(<BusinessPortal api={api} />);
    await screen.findByText("My saved fabric");
    expect(api.requestOtp).not.toHaveBeenCalled();
    expect(api.addFabric).not.toHaveBeenCalled();
    expect(screen.queryByText("Your first fabric belongs here.")).toBeNull();
  });
  it("submits the owner-entered fabric without a client-supplied owner ID", async () => {
    const api = makeApi({ session: vi.fn().mockResolvedValue(complete) });
    const user = userEvent.setup();
    render(<BusinessPortal api={api} />);
    await screen.findByRole("heading", {
      name: "Your first fabric belongs here.",
    });
    await user.click(
      screen.getByRole("button", { name: "Add your first fabric" }),
    );
    await user.type(screen.getByLabelText("Fabric name"), "My cotton");
    await user.selectOptions(screen.getByLabelText("Fabric type"), "Cotton");
    await user.type(screen.getByLabelText("Color"), "Blue");
    await user.type(screen.getByLabelText("GSM"), "180");
    await user.type(screen.getByLabelText("Width (inches)"), "58");
    await user.type(screen.getByLabelText("Opening stock (meters)"), "100");
    await user.type(screen.getByLabelText("Cost per meter (₹)"), "185");
    await user.type(screen.getByLabelText("Storage location"), "A-01");
    await user.click(screen.getByRole("button", { name: "Save fabric" }));
    await waitFor(() => expect(api.addFabric).toHaveBeenCalledTimes(1));
    expect(api.addFabric.mock.calls[0][0]).toEqual({
      name: "My cotton",
      type: "Cotton",
      color: "Blue",
      gsm: 180,
      widthInches: 58,
      quantityMeters: 100,
      costPerMeter: 185,
      location: "A-01",
    });
  });
  it("service outages do not bypass sign-in", async () => {
    const api = makeApi({
      session: vi.fn().mockRejectedValue(new Error("Service offline")),
    });
    render(<BusinessPortal api={api} />);
    await screen.findByRole("heading", { name: "Welcome to your workspace." });
    await screen.findByText("Verification service is currently unavailable.");
    expect(api.fabrics).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Phone number")).toBeTruthy();
  });
  it("inventory session expiry returns to phone verification", async () => {
    const api = makeApi({
      session: vi.fn().mockResolvedValue(complete),
      fabrics: vi.fn().mockRejectedValue(unauthorized),
    });
    render(<BusinessPortal api={api} />);
    await screen.findByLabelText("Phone number");
    expect(
      screen.queryByRole("heading", { name: "Your fabric library" }),
    ).toBeNull();
  });
});
