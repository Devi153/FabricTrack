import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, vi } from "vitest";
import { ForgotPasswordPage } from "../../pages/auth/ForgotPasswordPage";
import { SetPasswordPage } from "../../pages/auth/SetPasswordPage";
const service = () => ({
  requestReset: vi.fn().mockResolvedValue(undefined),
  hasSession: vi.fn().mockResolvedValue(true),
  updatePassword: vi.fn().mockResolvedValue(undefined),
});
it("shows a neutral response after requesting recovery", async () => {
  const api = service();
  render(<ForgotPasswordPage service={api} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Work email"), "owner@example.test");
  await user.click(screen.getByRole("button", { name: "Send reset link" }));
  expect(api.requestReset).toHaveBeenCalledWith("owner@example.test");
  expect(await screen.findByRole("status")).toHaveTextContent(
    "If an account exists",
  );
});
it("rejects an expired setup link", async () => {
  const api = service();
  api.hasSession.mockResolvedValue(false);
  render(<SetPasswordPage service={api} />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "invalid or expired",
  );
  expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
});
it("checks password confirmation before updating the provider", async () => {
  const api = service();
  render(<SetPasswordPage service={api} />);
  const user = userEvent.setup();
  await user.type(
    await screen.findByLabelText("New password"),
    "long-password-one",
  );
  await user.type(
    screen.getByLabelText("Confirm password"),
    "long-password-two",
  );
  await user.click(screen.getByRole("button", { name: "Save password" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match");
  expect(api.updatePassword).not.toHaveBeenCalled();
});
it("saves the new password and offers sign-in", async () => {
  const api = service();
  render(<SetPasswordPage service={api} />);
  const user = userEvent.setup();
  await user.type(
    await screen.findByLabelText("New password"),
    "a-long-password",
  );
  await user.type(screen.getByLabelText("Confirm password"), "a-long-password");
  await user.click(screen.getByRole("button", { name: "Save password" }));
  await waitFor(() =>
    expect(api.updatePassword).toHaveBeenCalledWith("a-long-password"),
  );
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Your password is saved",
  );
});
