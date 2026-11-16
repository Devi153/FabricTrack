export const CSV_FIELDS = [
  "name",
  "type",
  "color",
  "gsm",
  "widthInches",
  "quantityMeters",
  "costPerMeter",
  "location",
];
export function parseCsv(text) {
  const rows = [];
  let row = [],
    value = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(value);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else value += c;
  }
  if (quoted) throw new Error("The CSV contains an unclosed quote.");
  row.push(value);
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function importRecords(text) {
  const [headers, ...rows] = parseCsv(text.replace(/^\uFEFF/, ""));
  if (!headers || !CSV_FIELDS.slice(0, 7).every((k) => headers.includes(k)))
    throw new Error(
      "Use the exported CSV column names as your import template.",
    );
  if (rows.length > 1000)
    throw new Error("Import up to 1,000 fabrics at a time.");
  return rows.map((row) => {
    const source = Object.fromEntries(
      headers.map((key, i) => [key, row[i] ?? ""]),
    );
    const record = Object.fromEntries(
      CSV_FIELDS.map((k) => [k, source[k] ?? ""]),
    );
    for (const k of ["gsm", "widthInches", "quantityMeters", "costPerMeter"]) {
      record[k] = Number(record[k]);
      if (!Number.isFinite(record[k]) || record[k] < 0)
        throw new Error("The CSV contains an invalid number.");
    }
    return record;
  });
}
export function toCsv(records) {
  const escape = (v) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  return [
    CSV_FIELDS.join(","),
    ...records.map((r) => CSV_FIELDS.map((k) => escape(r[k])).join(",")),
  ].join("\r\n");
}
