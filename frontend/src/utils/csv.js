// src/utils/csv.js
export function downloadCsv(rows, filename = "export.csv") {
  if (!Array.isArray(rows) || rows.length === 0) {
    const blob = new Blob([""], { type: "text/csv;charset=utf-8;" });
    trigger(blob, filename);
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")].concat(
    rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(","))
  );
  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  trigger(blob, filename);
}

function escapeCsv(val) {
  if (val == null) return "";
  const s = String(val);
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function trigger(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
