import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import { AdminDashboard } from "../pages/AdminDashboard";
vi.mock("../components/team/InviteAdminForm", () => ({
  InviteAdminForm: () => <div>Invitation form</div>,
}));
afterEach(cleanup);
const admin = {
  userId: "owner",
  email: "owner@example.test",
  role: "PLATFORM_ADMIN" as const,
  canManageAdmins: true,
};
it("lets account managers open team access", () => {
  render(
    <AdminDashboard admin={admin} busy={false} error="" onLogout={vi.fn()} />,
  );
  fireEvent.click(screen.getByRole("button", { name: /^Team access$/i }));
  expect(screen.getByText("Invitation form")).toBeInTheDocument();
});
it("hides invitation actions from other staff and supports sign out", () => {
  const logout = vi.fn().mockResolvedValue(undefined);
  render(
    <AdminDashboard
      admin={{ ...admin, canManageAdmins: false }}
      busy={false}
      error=""
      onLogout={logout}
    />,
  );
  expect(
    screen.queryByRole("button", { name: /Team access/i }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Sign out/i }));
  expect(logout).toHaveBeenCalledOnce();
});
