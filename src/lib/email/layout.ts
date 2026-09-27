import { appUrl, COMPANY } from "@/lib/config";

export function esc(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type DetailRow = [label: string, value: string];

export function detailsTable(rows: DetailRow[]) {
  const body = rows
    .map(
      ([label, value]) => `<tr>
        <td style="padding:8px 0;color:#64748b;font-size:14px;width:40%;vertical-align:top">${esc(label)}</td>
        <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600">${esc(value)}</td>
      </tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #ede9fe;border-bottom:1px solid #ede9fe;margin:20px 0">${body}</table>`;
}

export function paragraph(text: string, muted = false) {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${muted ? "#64748b" : "#334155"}">${esc(text)}</p>`;
}

export function codeBlock(code: string) {
  return `<div style="margin:18px 0;padding:16px;border-radius:14px;background:#f5f3ff;text-align:center">
    <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6d28d9">Code</div>
    <div style="font-size:30px;font-weight:800;letter-spacing:.25em;color:#4c1d95;font-family:ui-monospace,Menlo,monospace">${esc(code)}</div>
  </div>`;
}

export function emailLayout(opts: {
  preheader: string;
  title: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
  secondary?: { label: string; href: string };
  footer: string;
}) {
  const cta = opts.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px"><tr><td style="border-radius:12px;background:#6d28d9">
        <a href="${esc(opts.cta.href)}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none">${esc(opts.cta.label)}</a>
      </td></tr></table>`
    : "";
  const secondary = opts.secondary
    ? `<p style="margin:8px 0 0;font-size:14px"><a href="${esc(opts.secondary.href)}" style="color:#6d28d9;font-weight:600">${esc(opts.secondary.label)}</a></p>`
    : "";

  return `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
        <tr><td style="padding:0 4px 16px">
          <a href="${appUrl()}" style="text-decoration:none;font-size:22px;font-weight:800;color:#0f172a">Gat<span style="color:#6d28d9">Vuller</span></a>
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:20px;padding:32px 28px;border:1px solid #ede9fe">
          <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#0f172a">${esc(opts.title)}</h1>
          ${opts.bodyHtml}
          ${cta}
          ${secondary}
        </td></tr>
        <tr><td style="padding:18px 8px;font-size:12px;line-height:1.6;color:#94a3b8;text-align:center">
          ${esc(opts.footer)}<br>${esc(COMPANY.legalName)} · ${esc(COMPANY.address)} · <a href="mailto:${esc(COMPANY.email)}" style="color:#94a3b8">${esc(COMPANY.email)}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Plain-text alternative: improves deliverability and accessibility. */
export function plainText(parts: (string | undefined | false)[]) {
  return parts.filter(Boolean).join("\n\n");
}
