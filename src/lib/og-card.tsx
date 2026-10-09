/** Shared 1200×630 social card. Plain inline styles: ImageResponse supports a flexbox subset only. */
export const OG_SIZE = { width: 1200, height: 630 };

type Props = { eyebrow: string; title: string; subtitle?: string; price?: string; was?: string; badge?: string };

export function OgCard({ eyebrow, title, subtitle, price, was, badge }: Props) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#faf7f2", padding: 72, fontFamily: "serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: "#b4492b", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 700 }}>G</div>
        <div style={{ fontSize: 40, color: "#1c1917" }}>GatVuller</div>
        {badge ? <div style={{ marginLeft: "auto", background: "#dcfce7", color: "#166534", fontSize: 30, padding: "8px 22px", borderRadius: 999, fontFamily: "sans-serif", fontWeight: 700 }}>{badge}</div> : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 26, letterSpacing: 4, textTransform: "uppercase", color: "#b4492b", fontFamily: "sans-serif", fontWeight: 700 }}>{eyebrow}</div>
        <div style={{ fontSize: title.length > 40 ? 64 : 80, lineHeight: 1.05, color: "#1c1917", maxWidth: 1000 }}>{title}</div>
        {subtitle ? <div style={{ fontSize: 32, color: "#57534e", fontFamily: "sans-serif" }}>{subtitle}</div> : null}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ fontSize: 26, color: "#78716c", fontFamily: "sans-serif" }}>Last-minute afspraken met korting · gatvuller.vercel.app</div>
        {price ? (
          <div style={{ display: "flex", alignItems: "baseline", gap: 18, background: "#b4492b", color: "#fff", padding: "16px 32px", borderRadius: 24 }}>
            <div style={{ fontSize: 64, fontWeight: 700, fontFamily: "sans-serif" }}>{price}</div>
            {was ? <div style={{ fontSize: 32, textDecoration: "line-through", opacity: 0.75, fontFamily: "sans-serif" }}>{was}</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
