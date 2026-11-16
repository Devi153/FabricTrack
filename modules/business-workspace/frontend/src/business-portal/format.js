export const qty = (n) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 1 });
export const money = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
export const date = (s) =>
  new Date(s).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
