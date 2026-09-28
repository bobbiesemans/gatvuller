/**
 * JSON for a <script type="application/ld+json"> block. JSON.stringify alone lets a value such as
 * "</script><script>..." close the tag, so every character that can end or open markup is escaped.
 */
export function jsonLd(data: unknown) {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
