import React, { useState, useEffect, useRef } from "react";
import Icon from "./Icons";
import Plans from "./Plans";
import { AuthShell, ErrorMessage } from "./PortalShared";
import {
  normalizePhone,
  validPhone,
  validOtp,
  secondsRemaining,
} from "./rules";
export default function Login({ api, onVerified, connectivityError, onRetry }) {
  const [showPlans, setShowPlans] = useState(false);
  const [step, setStep] = useState("phone");
  const [country, setCountry] = useState("+91");
  const [number, setNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [expiresAt, setExpiresAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const otpRef = useRef();
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (step === "otp") otpRef.current?.focus();
  }, [step, challenge]);
  const remaining = secondsRemaining(resendAt, now);
  const expires = secondsRemaining(expiresAt, now);
  async function requestOtp(event, resend = false) {
    event?.preventDefault();
    if (busy) return;
    const target = resend ? phone : normalizePhone(country, number);
    if (!validPhone(target)) {
      setError("Enter a valid phone number with its country code.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api.requestOtp(target);
      setPhone(target);
      setChallenge(result.challengeId);
      setCode("");
      const time = Date.now();
      setNow(time);
      setResendAt(time + (result.resendAfterSeconds || 60) * 1000);
      setExpiresAt(time + result.expiresInSeconds * 1000);
      setStep("otp");
    } catch (error) {
      setError(error.message);
      if (error.retryAfter) {
        setResendAt(Date.now() + error.retryAfter * 1000);
        setNow(Date.now());
      }
    } finally {
      setBusy(false);
    }
  }
  async function verify(event) {
    event.preventDefault();
    if (busy || !validOtp(code)) return;
    setBusy(true);
    setError("");
    try {
      const account = await api.verifyOtp(challenge, code);
      onVerified(account);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell step={step === "phone" ? 1 : 2}>
      {showPlans ? (
        <>
          <Plans onClose={() => setShowPlans(false)} />
          <button className="bp-back" onClick={() => setShowPlans(false)}>
            Back to sign in
          </button>
        </>
      ) : (
        <>
          {connectivityError && (
            <div className="vx-connectivity" role="status">
              <span className="vx-status-dot" />
              <span>Verification service is currently unavailable.</span>
              <button type="button" onClick={onRetry}>
                Retry
              </button>
            </div>
          )}
          <div className="bp-form-header">
            <span className="bp-form-icon">
              <Icon name={step === "phone" ? "phone" : "lock"} size={23} />
            </span>
            <div className="bp-kicker">YOUR BUSINESS STARTS HERE</div>
            <h1>
              {step === "phone"
                ? "Welcome to your workspace."
                : "One small step. You’re almost in."}
            </h1>
            <p>
              {step === "phone" ? (
                "A little more clarity. A lot more room to create. Sign in or create your business account."
              ) : (
                <>
                  We sent a 4-digit code to <strong>{phone}</strong>.<br />
                  Enter it below to securely continue.
                </>
              )}
            </p>
          </div>
          {step === "phone" ? (
            <form onSubmit={requestOtp} className="bp-login-form">
              <label htmlFor="bp-phone">Phone number</label>
              <div className="bp-phone-field">
                <select
                  aria-label="Country dialing code"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  {[
                    ["+91", "IN +91"],
                    ["+1", "US/CA +1"],
                    ["+44", "UK +44"],
                    ["+971", "AE +971"],
                    ["+65", "SG +65"],
                    ["+61", "AU +61"],
                  ].map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  id="bp-phone"
                  type="tel"
                  autoComplete="tel-national"
                  placeholder="98765 43210"
                  value={number}
                  onChange={(e) => {
                    setNumber(e.target.value);
                    setError("");
                  }}
                  required
                  maxLength={24}
                />
                <Icon name="phone" size={17} />
              </div>
              <p className="bp-input-hint">
                Use a different country? Enter the full number beginning with +.
              </p>
              <ErrorMessage message={error} />
              <button
                type="submit"
                className="bp-button"
                disabled={busy || secondsRemaining(resendAt, now) > 0}
              >
                {busy ? "Sending your code…" : "Send verification code"}
                <Icon name="arrow" size={17} />
              </button>
              {secondsRemaining(resendAt, now) > 0 && (
                <p className="bp-input-hint">
                  Please wait before requesting another code.
                </p>
              )}
              <p className="bp-consent">
                We’ll send an SMS to verify your number.
                <br />
                Your account is created only after successful verification.
              </p>
            </form>
          ) : (
            <form onSubmit={verify} className="bp-login-form">
              <label htmlFor="bp-code">Verification code</label>
              <input
                ref={otpRef}
                className="bp-otp"
                id="bp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{4}"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 4));
                  setError("");
                }}
                maxLength={4}
                placeholder="0000"
                required
                aria-describedby="bp-otp-hint"
              />
              <p className="bp-input-hint" id="bp-otp-hint">
                {expires > 0
                  ? `Code expires in ${Math.floor(expires / 60)}:${String(expires % 60).padStart(2, "0")}`
                  : "This code has expired. Request a new one."}
              </p>
              <ErrorMessage message={error} />
              <button
                type="submit"
                className="bp-button"
                disabled={busy || !validOtp(code) || expires === 0}
              >
                {busy ? "Verifying…" : "Verify & continue"}
                <Icon name="arrow" size={17} />
              </button>
              <div className="bp-resend">
                <span>Didn’t get a code?</span>
                <button
                  type="button"
                  disabled={busy || remaining > 0}
                  onClick={(e) => requestOtp(e, true)}
                >
                  {remaining > 0 ? `Resend in ${remaining}s` : "Resend code"}
                </button>
              </div>
              <button
                className="bp-back"
                type="button"
                disabled={busy}
                onClick={() => {
                  setStep("phone");
                  setCode("");
                  setError("");
                }}
              >
                <Icon name="back" size={14} />
                Change phone number
              </button>
            </form>
          )}
          <div className="bp-trust-row">
            <Icon name="lock" size={14} />
            <span>Secure sign-in. No passwords to remember.</span>
          </div>
          <div className="bp-email-later">
            <Icon name="mail" size={14} />
            <span>Email verification</span>
            <small>Coming later</small>
          </div>
          <button
            className="vx-explore-plans"
            type="button"
            onClick={() => setShowPlans(true)}
          >
            Made for every stage. <strong>Explore plans</strong>
            <Icon name="arrow" size={13} />
          </button>
        </>
      )}
    </AuthShell>
  );
}
