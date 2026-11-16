import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, vi } from "vitest";
import { InviteAdminForm } from "../components/team/InviteAdminForm";
import { AdminDashboard } from "../pages/AdminDashboard";
it("submits a staff invitation and confirms success", async () => {
  const invite = vi.fn().mockResolvedValue(undefined);
  render(<InviteAdminForm invite={invite} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Work email"), "staff@example.test");
  await user.click(screen.getByRole("button", { name: "Send invitation" }));
  expect(invite).toHaveBeenCalledWith("staff@example.test");
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Invitation sent",
  );
});
it("shows invitation failures without reporting success", async () => {
  const invite = vi
    .fn()
    .mockRejectedValue(new Error("Access activation failed"));
  render(<InviteAdminForm invite={invite} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Work email"), "staff@example.test");
  await user.click(screen.getByRole("button", { name: "Send invitation" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Access activation failed",
  );
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
it("does not show team management to ordinary admins", () => {
  render(
    <AdminDashboard
      admin={{
        userId: "1",
        email: "staff@example.test",
        role: "PLATFORM_ADMIN",
        canManageAdmins: false,
      }}
      busy={false}
      error=""
      onLogout={vi.fn()}
    />,
  );
  expect(
    screen.queryByRole("button", { name: "Team access" }),
  ).not.toBeInTheDocument();
});
