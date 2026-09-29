import { appUrl, COMPANY } from "@/lib/config";

/** Same tokens as the site: warm paper, ink text, brick-red actions. */
const C = {
  paper: "#faf7f2",
  surface: "#ffffff",
  ink: "#1d1b18",
  soft: "#4a453e",
  muted: "#736c62",
  line: "#e7e1d7",
  brand: "#b4492b",
  brandSoft: "#f8ebe5",
};

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
        <td style="padding:8px 0;color:${C.muted};font-size:14px;width:40%;vertical-align:top">${esc(label)}</td>
        <td style="padding:8px 0;color:${C.ink};font-size:14px;font-weight:600">${esc(value)}</td>
      </tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.line};border-bottom:1px solid ${C.line};margin:20px 0">${body}</table>`;
}

export function paragraph(text: string, muted = false) {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${muted ? C.muted : C.soft}">${esc(text)}</p>`;
}

export function notice(text: string) {
  return `<p style="margin:0 0 14px;padding:12px 14px;border-radius:10px;background:#fff4d6;color:#6b4a00;font-size:14px;line-height:1.5">${esc(text)}</p>`;
}

export function codeBlock(label: string, code: string) {
  return `<div style="margin:18px 0;padding:16px;border-radius:14px;background:${C.brandSoft};text-align:center">
    <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${C.brand}">${esc(label)}</div>
    <div style="font-size:28px;font-weight:800;letter-spacing:.22em;color:${C.ink};font-family:ui-monospace,Menlo,Consolas,monospace">${esc(code)}</div>
  </div>`;
}

export function emailLayout(opts: {
  preheader: string;
  title: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
  secondary?: { label: string; href: string };
  footer: string;
  lang?: string;
}) {
  const cta = opts.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px"><tr><td style="border-radius:12px;background:${C.brand}">
        <a href="${esc(opts.cta.href)}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none">${esc(opts.cta.label)}</a>
      </td></tr></table>`
    : "";
  const secondary = opts.secondary
    ? `<p style="margin:8px 0 0;font-size:14px"><a href="${esc(opts.secondary.href)}" style="color:${C.brand};font-weight:600">${esc(opts.secondary.label)}</a></p>`
    : "";

  return `<!doctype html>
<html lang="${esc(opts.lang || "nl")}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:${C.paper};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
        <tr><td style="padding:0 4px 16px">
          <a href="${appUrl()}" style="text-decoration:none;font-size:22px;font-weight:800;color:${C.ink}">Gat<span style="color:${C.brand}">Vuller</span></a>
        </td></tr>
        <tr><td style="background:${C.surface};border-radius:18px;padding:32px 28px;border:1px solid ${C.line}">
          <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:${C.ink}">${esc(opts.title)}</h1>
          ${opts.bodyHtml}
          ${cta}
          ${secondary}
        </td></tr>
        <tr><td style="padding:18px 8px;font-size:12px;line-height:1.6;color:${C.muted};text-align:center">
          ${esc(opts.footer)}<br>${esc(COMPANY.legalName)} · ${esc(COMPANY.address)} · <a href="mailto:${esc(COMPANY.email)}" style="color:${C.muted}">${esc(COMPANY.email)}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Plain-text alternative: improves deliverability and accessibility. */
export function plainText(parts: (string | undefined | false | null)[]) {
  return parts.filter(Boolean).join("\n\n");
}
