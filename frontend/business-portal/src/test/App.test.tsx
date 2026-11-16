import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { vi, beforeEach, afterEach, it, expect } from "vitest";
import App from "../pages/BusinessPortalPage";
beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function response(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: async () => data,
  } as Response);
}
it("does not open the dashboard before OTP verification", async () => {
  vi.mocked(fetch).mockImplementation((url) => {
    if (String(url).endsWith("/auth/config"))
      return response({ development: true });
    return response({
      challengeId: "challenge",
      expiresIn: 300,
      resendAfter: 60,
      development: true,
    });
  });
  render(<App />);
  fireEvent.change(screen.getByLabelText("Your name"), {
    target: { value: "Devi" },
  });
  fireEvent.change(screen.getByLabelText("Mobile number"), {
    target: { value: "+919876543210" },
  });
  fireEvent.click(screen.getByText("Send verification code →"));
  expect(await screen.findByText("Check your phone")).toBeInTheDocument();
  expect(screen.queryByText("Business at a glance")).not.toBeInTheDocument();
  expect(sessionStorage.getItem("fabrictrack.business.session")).toBeNull();
});
it("opens the verified account and revokes the session on logout", async () => {
  const account = {
    id: "a",
    name: "Devi",
    phone: "+919876543210",
    plan: "FREE",
  };
  vi.mocked(fetch).mockImplementation((url) => {
    const path = String(url);
    if (path.endsWith("/auth/config")) return response({ development: true });
    if (path.endsWith("/auth/start"))
      return response({
        challengeId: "c",
        expiresIn: 300,
        resendAfter: 60,
        development: true,
      });
    if (path.endsWith("/auth/verify"))
      return response({ token: "session", expiresIn: 28800, account });
    if (path.endsWith("/dashboard")) return response({ account });
    return response({ signedOut: true });
  });
  render(<App />);
  fireEvent.change(screen.getByLabelText("Your name"), {
    target: { value: "Devi" },
  });
  fireEvent.change(screen.getByLabelText("Mobile number"), {
    target: { value: "+919876543210" },
  });
  fireEvent.click(screen.getByText("Send verification code →"));
  await screen.findByText("Check your phone");
  fireEvent.change(screen.getByLabelText("Verification code"), {
    target: { value: "0123" },
  });
  fireEvent.click(screen.getByText("Verify & continue →"));
  expect(await screen.findByText("Business at a glance")).toBeInTheDocument();
  expect(sessionStorage.getItem("fabrictrack.business.session")).toBe(
    "session",
  );
  fireEvent.click(screen.getByText("Sign out"));
  await waitFor(() =>
    expect(sessionStorage.getItem("fabrictrack.business.session")).toBeNull(),
  );
});
it("shows wrong-code errors and keeps the user on verification", async () => {
  vi.mocked(fetch).mockImplementation((url) => {
    if (String(url).endsWith("/auth/config"))
      return response({ development: true });
    if (String(url).endsWith("/auth/start"))
      return response({
        challengeId: "c",
        expiresIn: 300,
        resendAfter: 60,
        development: true,
      });
    return response({ message: "Incorrect code. Please try again." }, 400);
  });
  render(<App />);
  fireEvent.change(screen.getByLabelText("Your name"), {
    target: { value: "Devi" },
  });
  fireEvent.change(screen.getByLabelText("Mobile number"), {
    target: { value: "+919876543210" },
  });
  fireEvent.click(screen.getByText("Send verification code →"));
  await screen.findByText("Check your phone");
  fireEvent.change(screen.getByLabelText("Verification code"), {
    target: { value: "1111" },
  });
  fireEvent.click(screen.getByText("Verify & continue →"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect code");
  expect(sessionStorage.getItem("fabrictrack.business.session")).toBeNull();
});
