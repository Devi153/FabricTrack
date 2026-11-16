import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { LoginForm } from "../../components/auth/LoginForm";
describe("LoginForm", () => {
  it("submits credentials through its independent callback", async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm configured busy={false} error="" onSubmit={submit} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Work email"), "admin@example.test");
    await user.type(screen.getByLabelText("Password"), "example-password");
    await user.click(screen.getByRole("button", { name: /Sign in to admin/ }));
    expect(submit).toHaveBeenCalledWith({
      email: "admin@example.test",
      password: "example-password",
    });
  });
  it("toggles visibility without submitting", async () => {
    const submit = vi.fn();
    render(<LoginForm configured busy={false} error="" onSubmit={submit} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Show password" }),
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    expect(submit).not.toHaveBeenCalled();
  });
  it("disables login when busy and presents errors accessibly", () => {
    render(
      <LoginForm configured busy error="Access denied" onSubmit={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Access denied");
  });
  it("fails closed when configuration is missing", () => {
    render(
      <LoginForm configured={false} busy={false} error="" onSubmit={vi.fn()} />,
    );
    expect(
      screen.getByRole("button", { name: /Sign in to admin/ }),
    ).toBeDisabled();
  });
});
