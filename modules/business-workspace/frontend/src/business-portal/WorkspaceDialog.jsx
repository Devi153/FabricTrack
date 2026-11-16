import React, { useEffect, useRef, useState } from "react";
import Icon from "./Icons";
import { ErrorMessage } from "./PortalShared";
export default function WorkspaceDialog({
  title,
  subtitle,
  fields,
  onSave,
  onClose,
  busy,
  error,
  submitLabel = "Save record",
}) {
  const root = useRef();
  const [photo, setPhoto] = useState(
    fields.find((f) => f.type === "photo")?.value || "",
  );
  const [photoError, setPhotoError] = useState("");
  useEffect(() => {
    const previous = document.activeElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    root.current?.querySelector("input,select,textarea")?.focus();
    return () => {
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  function keys(e) {
    if (e.key === "Escape" && !busy) onClose();
    if (e.key === "Tab") {
      const list = [
        ...root.current.querySelectorAll(
          'input:not([type="hidden"]),select,textarea,button',
        ),
      ].filter((x) => !x.disabled);
      if (e.shiftKey && document.activeElement === list[0]) {
        e.preventDefault();
        list.at(-1).focus();
      } else if (!e.shiftKey && document.activeElement === list.at(-1)) {
        e.preventDefault();
        list[0].focus();
      }
    }
  }
  function submit(e) {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget));
    for (const f of fields) {
      if (f.type === "number") v[f.name] = Number(v[f.name]);
      if (f.nullable && v[f.name] === "") v[f.name] = null;
    }
    onSave(v);
  }
  function upload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoError("");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 307200
    ) {
      setPhotoError("Choose a JPG, PNG or WebP under 300 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.onerror = () => setPhotoError("The image could not be read.");
    reader.readAsDataURL(file);
  }
  return (
    <div className="bp-dialog-shade">
      <section
        className="bp-dialog vx-dialog"
        ref={root}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vx-dialog-title"
        onKeyDown={keys}
      >
        <button
          className="bp-icon-button bp-dialog-close"
          aria-label="Close dialog"
          onClick={onClose}
          disabled={busy}
        >
          <Icon name="close" size={18} />
        </button>
        <div className="bp-kicker">YOUR WORKSPACE, WOVEN TOGETHER</div>
        <h2 id="vx-dialog-title">{title}</h2>
        <p>{subtitle || "Saved securely to your business account."}</p>
        <form onSubmit={submit}>
          <div className="bp-form-grid">
            {fields.map((f) => (
              <label key={f.name} className={f.wide ? "vx-span-two" : ""}>
                {f.label}
                {f.type === "select" ? (
                  <select
                    name={f.name}
                    defaultValue={f.value ?? ""}
                    required={!f.optional}
                  >
                    <option value="">
                      {f.placeholder || "Select an option"}
                    </option>
                    {f.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    name={f.name}
                    defaultValue={f.value || ""}
                    maxLength={f.maxLength || 2000}
                    rows={3}
                    required={!f.optional}
                  />
                ) : f.type === "photo" ? (
                  <div className="vx-photo-field">
                    {photo && <img src={photo} alt="Your fabric photograph" />}
                    <input type="hidden" name={f.name} value={photo} />
                    <input
                      aria-label="Fabric photograph"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={upload}
                    />
                    <small>One photograph per fabric · maximum 300 KB</small>
                    {photo && (
                      <button
                        type="button"
                        className="bp-back"
                        onClick={() => setPhoto("")}
                      >
                        Remove photograph
                      </button>
                    )}
                    <ErrorMessage message={photoError} />
                  </div>
                ) : (
                  <input
                    name={f.name}
                    type={f.type || "text"}
                    defaultValue={f.value ?? ""}
                    required={!f.optional}
                    min={f.min ?? 0}
                    max={f.max}
                    step={f.step || "any"}
                    maxLength={f.maxLength || 120}
                    placeholder={f.placeholder || ""}
                  />
                )}
              </label>
            ))}
          </div>
          <ErrorMessage message={error} />
          <button className="bp-button" disabled={busy || !!photoError}>
            {busy ? "Saving…" : submitLabel}
            <Icon name="check" size={16} />
          </button>
        </form>
      </section>
    </div>
  );
}
