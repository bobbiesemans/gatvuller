#!/usr/bin/env node
/**
 * A local stand-in for the parts of the Stripe API that GatVuller uses, so the whole payment flow
 * (Checkout with Connect, refunds, onboarding, signed webhooks) can be tested without Stripe keys.
 * It is NOT Stripe: it never moves money, and the app only talks to it when STRIPE_API_URL points here
 * and the key is a test key (see stripeApiOverride in src/lib/stripe.ts).
 *
 *   node scripts/qa/fake-stripe.mjs --port=12111 --webhook=http://127.0.0.1:3011/api/webhooks/stripe --secret=whsec_test_local
 *
 * Hosted pages: /pay/<session> (pay or go back), /onboard/<account> (finish onboarding), /express/<account>.
 * Inspection: GET /__state. Controls: POST /__control/fail-refunds?times=N, /__control/complete/<session>,
 * /__control/resend/<eventId>.
 */
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import Stripe from "stripe";

const rid = (prefix, n = 14) => `${prefix}_${randomBytes(n).toString("hex").slice(0, n * 2 - 4)}`;
const now = () => Math.floor(Date.now() / 1000);

/** Stripe sends form bodies with bracket notation: line_items[0][price_data][unit_amount]=2900 */
export function parseForm(body) {
  const root = {};
  for (const pair of body.split("&")) {
    if (!pair) continue;
    const [rawKey, rawValue = ""] = pair.split("=");
    const key = decodeURIComponent(rawKey.replace(/\+/g, " "));
    const value = decodeURIComponent(rawValue.replace(/\+/g, " "));
    const path = key.match(/[^[\]]+/g) || [];
    let node = root;
    path.forEach((part, index) => {
      if (index === path.length - 1) node[part] = value;
      else node = node[part] ??= {};
    });
  }
  const arrayify = (value) => {
    if (value === null || typeof value !== "object") return value;
    const keys = Object.keys(value);
    const mapped = Object.fromEntries(keys.map((k) => [k, arrayify(value[k])]));
    return keys.length > 0 && keys.every((k) => /^\d+$/.test(k)) ? keys.sort((a, b) => a - b).map((k) => mapped[k]) : mapped;
  };
  return arrayify(root);
}

const stripeError = (res, status, type, code, message, param) => {
  json(res, status, { error: { type, code, message, ...(param ? { param } : {}) } });
};

function json(res, status, body, extra = {}) {
  const text = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json", "Request-Id": rid("req", 8), ...extra });
  res.end(text);
}

function html(res, status, title, body) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font:16px system-ui;margin:0;background:#f6f9fc;color:#1a1f36}main{max-width:420px;margin:12vh auto;padding:28px;background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.08)}
button,a.btn{display:block;width:100%;box-sizing:border-box;text-align:center;padding:14px;border:0;border-radius:8px;background:#635bff;color:#fff;font:600 16px system-ui;text-decoration:none;cursor:pointer}
a.back{display:block;text-align:center;margin-top:14px;color:#635bff}small{color:#6b7280}</style></head><body><main>${body}</main></body></html>`);
}

const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export async function startFakeStripe(options = {}) {
  const webhookUrl = options.webhookUrl || process.env.FAKE_STRIPE_WEBHOOK_URL || "";
  const webhookSecret = options.webhookSecret || process.env.FAKE_STRIPE_WEBHOOK_SECRET || "whsec_test_local";
  const webhookDelayMs = Number(options.webhookDelayMs ?? process.env.FAKE_STRIPE_WEBHOOK_DELAY_MS ?? 800);
  const signer = new Stripe("sk_test_fake_signer");

  const state = {
    sessions: new Map(),
    intents: new Map(),
    refunds: new Map(),
    accounts: new Map(),
    events: [],
    deliveries: [],
    idempotent: new Map(),
    failRefunds: 0,
  };
  let publicBase = "";

  /* ------------------------------------------------------------ webhooks */
  async function deliver(event, attempt = 1) {
    if (!webhookUrl) return;
    const payload = JSON.stringify(event);
    const header = signer.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
    let status = 0;
    try {
      const res = await fetch(webhookUrl, { method: "POST", headers: { "content-type": "application/json", "stripe-signature": header }, body: payload });
      status = res.status;
    } catch {
      status = -1;
    }
    state.deliveries.push({ id: event.id, type: event.type, attempt, status });
    // Stripe retries a failed delivery with backoff.
    if ((status < 200 || status >= 300) && attempt < 4) setTimeout(() => void deliver(event, attempt + 1), 1000 * attempt).unref();
  }

  function emit(type, object, delay = 0) {
    const event = { id: rid("evt", 12), object: "event", api_version: "2026-08-26.dahlia", created: now(), type, livemode: false, pending_webhooks: 1, request: { id: null, idempotency_key: null }, data: { object } };
    state.events.push(event);
    setTimeout(() => void deliver(event), delay).unref();
    return event;
  }

  /* ------------------------------------------------------------- objects */
  const sessionView = (s) => {
    const expired = s.status === "open" && s.expires_at <= now();
    return { ...s, status: expired ? "expired" : s.status };
  };

  const accountView = (a) => ({
    id: a.id,
    object: "account",
    type: "express",
    country: a.country,
    email: a.email,
    business_profile: a.business_profile,
    capabilities: a.active ? { card_payments: "active", transfers: "active" } : { card_payments: "inactive", transfers: "inactive" },
    charges_enabled: a.active,
    payouts_enabled: a.active,
    details_submitted: a.active,
    requirements: a.active
      ? { currently_due: [], past_due: [], disabled_reason: null }
      : { currently_due: ["external_account", "individual.verification.document"], past_due: [], disabled_reason: "requirements.pending_verification" },
    metadata: a.metadata || {},
  });

  function completeSession(session, { delay = webhookDelayMs } = {}) {
    if (session.status !== "open") return null;
    if (session.expires_at <= now()) return null;
    const intent = {
      id: rid("pi", 12),
      object: "payment_intent",
      amount: session.amount_total,
      currency: session.currency,
      status: "succeeded",
      application_fee_amount: session.payment_intent_data?.application_fee_amount ? Number(session.payment_intent_data.application_fee_amount) : null,
      transfer_data: session.payment_intent_data?.transfer_data || null,
      metadata: session.payment_intent_data?.metadata || {},
      session: session.id,
    };
    state.intents.set(intent.id, intent);
    session.status = "complete";
    session.payment_status = "paid";
    session.payment_intent = intent.id;
    emit("checkout.session.completed", sessionView(session), delay);
    return intent;
  }

  function createRefund(intent, params) {
    const refund = {
      id: rid("re", 12),
      object: "refund",
      amount: intent.amount,
      currency: intent.currency,
      payment_intent: intent.id,
      status: "succeeded",
      reason: null,
      metadata: params.metadata || {},
      reverse_transfer: params.reverse_transfer === "true",
      refund_application_fee: params.refund_application_fee === "true",
      created: now(),
    };
    state.refunds.set(refund.id, refund);
    emit("refund.created", refund, 50);
    return refund;
  }

  /* -------------------------------------------------------------- routes */
  async function api(req, res, url, form) {
    const auth = req.headers.authorization || "";
    if (!/^Bearer (sk|rk)_test_/.test(auth)) return stripeError(res, 401, "invalid_request_error", "api_key_invalid", "Invalid API Key provided (the fake accepts only test keys).");
    const path = url.pathname.replace(/^\/v1/, "");
    const method = req.method;

    // Idempotency: same key + same body replays the first answer; a different body is an error.
    const key = req.headers["idempotency-key"];
    const fingerprint = method === "POST" && key ? `${path}|${JSON.stringify(form)}` : null;
    if (fingerprint) {
      const seen = state.idempotent.get(key);
      if (seen) {
        if (seen.fingerprint !== fingerprint) return stripeError(res, 400, "idempotency_error", undefined, "Keys for idempotent requests can only be used with the same parameters they were first used with.");
        return json(res, seen.status, seen.body, { "Idempotent-Replayed": "true" });
      }
    }
    const reply = (status, body) => {
      if (fingerprint && status < 500) state.idempotent.set(key, { fingerprint, status, body });
      return json(res, status, body);
    };

    if (method === "POST" && path === "/checkout/sessions") {
      const items = Array.isArray(form.line_items) ? form.line_items : [];
      if (form.mode !== "payment" || items.length === 0) return stripeError(res, 400, "invalid_request_error", "parameter_missing", "mode=payment and line_items are required.");
      if (!form.success_url || !form.cancel_url) return stripeError(res, 400, "invalid_request_error", "parameter_missing", "success_url and cancel_url are required.");
      const amount = items.reduce((sum, i) => sum + Number(i.price_data?.unit_amount ?? 0) * Number(i.quantity ?? 1), 0);
      const fee = form.payment_intent_data?.application_fee_amount;
      if (fee !== undefined && (Number(fee) < 0 || Number(fee) > amount)) return stripeError(res, 400, "invalid_request_error", "amount_too_large", "application_fee_amount must be between 0 and the amount.");
      if (form.payment_intent_data?.transfer_data?.destination && !state.accounts.has(form.payment_intent_data.transfer_data.destination)) {
        return stripeError(res, 400, "invalid_request_error", "resource_missing", "No such destination account.", "payment_intent_data[transfer_data][destination]");
      }
      const id = rid("cs_test", 20);
      const session = {
        id,
        object: "checkout.session",
        mode: "payment",
        status: "open",
        payment_status: "unpaid",
        payment_intent: null,
        currency: items[0].price_data?.currency || "eur",
        amount_total: amount,
        client_reference_id: form.client_reference_id || null,
        customer_email: form.customer_email || null,
        metadata: form.metadata || {},
        payment_intent_data: form.payment_intent_data || null,
        success_url: form.success_url,
        cancel_url: form.cancel_url,
        expires_at: Number(form.expires_at) || now() + 24 * 3600,
        livemode: false,
        url: `${publicBase}/pay/${id}`,
        created: now(),
      };
      state.sessions.set(id, session);
      return reply(200, sessionView(session));
    }

    let m = path.match(/^\/checkout\/sessions\/([^/]+)$/);
    if (method === "GET" && m) {
      const s = state.sessions.get(m[1]);
      return s ? json(res, 200, sessionView(s)) : stripeError(res, 404, "invalid_request_error", "resource_missing", `No such checkout.session: '${m[1]}'`);
    }
    m = path.match(/^\/checkout\/sessions\/([^/]+)\/expire$/);
    if (method === "POST" && m) {
      const s = state.sessions.get(m[1]);
      if (!s) return stripeError(res, 404, "invalid_request_error", "resource_missing", `No such checkout.session: '${m[1]}'`);
      if (s.status !== "open") return stripeError(res, 400, "invalid_request_error", undefined, "Only Checkout Sessions with a status of `open` can be expired.");
      s.status = "expired";
      emit("checkout.session.expired", sessionView(s), 50);
      return reply(200, sessionView(s));
    }

    if (method === "POST" && path === "/refunds") {
      if (state.failRefunds > 0) {
        state.failRefunds--;
        return stripeError(res, 500, "api_error", undefined, "The fake is set to fail refunds.");
      }
      const intent = state.intents.get(form.payment_intent);
      if (!intent) return stripeError(res, 404, "invalid_request_error", "resource_missing", `No such payment_intent: '${form.payment_intent}'`, "payment_intent");
      if ([...state.refunds.values()].some((r) => r.payment_intent === intent.id)) {
        return stripeError(res, 400, "invalid_request_error", "charge_already_refunded", "Charge has already been refunded.");
      }
      return reply(200, createRefund(intent, form));
    }
    if (method === "GET" && path === "/refunds") {
      const wanted = url.searchParams.get("payment_intent");
      const data = [...state.refunds.values()].filter((r) => !wanted || r.payment_intent === wanted).slice(0, Number(url.searchParams.get("limit") || 10));
      return json(res, 200, { object: "list", data, has_more: false, url: "/v1/refunds" });
    }

    if (method === "POST" && path === "/accounts") {
      const id = rid("acct", 8);
      const account = { id, country: form.country || "BE", email: form.email || null, business_profile: form.business_profile || {}, metadata: form.metadata || {}, active: false };
      state.accounts.set(id, account);
      return reply(200, accountView(account));
    }
    m = path.match(/^\/accounts\/([^/]+)$/);
    if (method === "GET" && m) {
      const a = state.accounts.get(m[1]);
      return a ? json(res, 200, accountView(a)) : stripeError(res, 404, "invalid_request_error", "resource_missing", `No such account: '${m[1]}'`);
    }
    m = path.match(/^\/accounts\/([^/]+)\/login_links$/);
    if (method === "POST" && m) {
      if (!state.accounts.get(m[1])?.active) return stripeError(res, 400, "invalid_request_error", undefined, "Login links can only be created for accounts that have completed onboarding.");
      return json(res, 200, { object: "login_link", url: `${publicBase}/express/${m[1]}`, created: now() });
    }
    if (method === "POST" && path === "/account_links") {
      if (!state.accounts.has(form.account)) return stripeError(res, 404, "invalid_request_error", "resource_missing", `No such account: '${form.account}'`);
      const link = `${publicBase}/onboard/${form.account}?return=${encodeURIComponent(form.return_url || "")}&refresh=${encodeURIComponent(form.refresh_url || "")}`;
      return json(res, 200, { object: "account_link", url: link, created: now(), expires_at: now() + 300 });
    }

    if (method === "GET" && path === "/balance") {
      const account = req.headers["stripe-account"];
      const paid = [...state.intents.values()].filter((i) => i.transfer_data?.destination === account && ![...state.refunds.values()].some((r) => r.payment_intent === i.id));
      const net = paid.reduce((sum, i) => sum + i.amount - (i.application_fee_amount || 0), 0);
      return json(res, 200, { object: "balance", available: [{ amount: 0, currency: "eur" }], pending: [{ amount: net, currency: "eur" }] });
    }
    if (method === "GET" && path === "/payouts") return json(res, 200, { object: "list", data: [], has_more: false, url: "/v1/payouts" });

    return stripeError(res, 404, "invalid_request_error", "resource_missing", `Unrecognized request URL (${method} ${url.pathname}). The GatVuller fake does not implement it.`);
  }

  function pages(req, res, url) {
    let m = url.pathname.match(/^\/pay\/([^/]+)(\/(complete|back))?$/);
    if (m) {
      const s = state.sessions.get(m[1]);
      if (!s) return html(res, 404, "Not found", "<h1>Not found</h1>");
      const view = sessionView(s);
      if (m[3] === "back") {
        res.writeHead(303, { Location: s.cancel_url });
        return res.end();
      }
      if (m[3] === "complete" && req.method === "POST") {
        if (!completeSession(s)) return html(res, 400, "Closed", "<h1>This session can no longer be paid</h1>");
        res.writeHead(303, { Location: s.success_url.replace("{CHECKOUT_SESSION_ID}", s.id) });
        return res.end();
      }
      if (view.status !== "open") return html(res, 200, "Closed", `<h1>Session ${esc(view.status)}</h1><p>This checkout can no longer be paid.</p>`);
      const euros = (view.amount_total / 100).toFixed(2);
      return html(
        res,
        200,
        "Fake Stripe Checkout",
        `<small>TEST MODE · fake Stripe Checkout</small><h1>Pay € ${esc(euros)}</h1><p>${esc(view.customer_email || "")}</p>
<form method="post" action="/pay/${esc(s.id)}/complete"><button type="submit" data-testid="fake-pay">Pay (test)</button></form>
<a class="back" href="/pay/${esc(s.id)}/back" data-testid="fake-back">← Back</a>`
      );
    }
    m = url.pathname.match(/^\/onboard\/([^/]+)(\/complete)?$/);
    if (m) {
      const a = state.accounts.get(m[1]);
      if (!a) return html(res, 404, "Not found", "<h1>Not found</h1>");
      const back = url.searchParams.get("return") || "";
      if (m[2] && req.method === "POST") {
        a.active = true;
        emit("account.updated", accountView(a), 100);
        res.writeHead(303, { Location: back || "/" });
        return res.end();
      }
      return html(
        res,
        200,
        "Fake Stripe onboarding",
        `<small>TEST MODE · fake Stripe Connect onboarding</small><h1>Set up payouts</h1><p>Account ${esc(a.id)}</p>
<form method="post" action="/onboard/${esc(a.id)}/complete?return=${encodeURIComponent(back)}"><button type="submit" data-testid="fake-onboard">Finish onboarding (test)</button></form>`
      );
    }
    m = url.pathname.match(/^\/express\/([^/]+)$/);
    if (m) return html(res, 200, "Fake Express dashboard", `<small>TEST MODE</small><h1>Express dashboard</h1><p>Account ${esc(m[1])}</p>`);
    return null;
  }

  async function control(req, res, url) {
    if (url.pathname === "/__state") {
      return json(res, 200, {
        sessions: [...state.sessions.values()].map(sessionView),
        intents: [...state.intents.values()],
        refunds: [...state.refunds.values()],
        accounts: [...state.accounts.values()].map(accountView),
        events: state.events.map((e) => ({ id: e.id, type: e.type })),
        deliveries: state.deliveries,
      });
    }
    let m = url.pathname.match(/^\/__control\/fail-refunds$/);
    if (m) {
      state.failRefunds = Number(url.searchParams.get("times") || 1);
      return json(res, 200, { failRefunds: state.failRefunds });
    }
    m = url.pathname.match(/^\/__control\/complete\/([^/]+)$/);
    if (m) {
      const s = state.sessions.get(m[1]);
      const intent = s && completeSession(s, { delay: Number(url.searchParams.get("delay") ?? 0) });
      return json(res, intent ? 200 : 409, { paymentIntent: intent?.id ?? null });
    }
    m = url.pathname.match(/^\/__control\/resend\/([^/]+)$/);
    if (m) {
      const event = state.events.find((e) => e.id === m[1]);
      if (event) await deliver(event);
      return json(res, event ? 200 : 404, { resent: Boolean(event) });
    }
    m = url.pathname.match(/^\/__control\/expire-session\/([^/]+)$/);
    if (m) {
      const s = state.sessions.get(m[1]);
      if (s?.status === "open") {
        s.status = "expired";
        emit("checkout.session.expired", sessionView(s), 0);
      }
      return json(res, s ? 200 : 404, { status: s?.status ?? null });
    }
    return null;
  }

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://localhost");
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks).toString("utf8");
      if (url.pathname.startsWith("/v1/")) return await api(req, res, url, req.method === "POST" ? parseForm(body) : {});
      if (url.pathname.startsWith("/__")) {
        if ((await control(req, res, url)) === null) json(res, 404, { error: "unknown control" });
        return;
      }
      if (pages(req, res, url) === null) html(res, 404, "Not found", "<h1>Not found</h1>");
    } catch (error) {
      json(res, 500, { error: { type: "api_error", message: String(error?.message || error) } });
    }
  });

  await new Promise((resolve) => server.listen(Number(options.port ?? 0), "127.0.0.1", resolve));
  const port = server.address().port;
  publicBase = `http://127.0.0.1:${port}`;

  return {
    url: publicBase,
    port,
    state,
    stop: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

// CLI
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
  const fake = await startFakeStripe({ port: Number(args.port || 12111), webhookUrl: args.webhook, webhookSecret: args.secret, webhookDelayMs: args.delay });
  console.log(`fake Stripe listening on ${fake.url}${args.webhook ? ` -> webhooks to ${args.webhook}` : " (no webhook target)"}`);
  process.on("SIGINT", () => fake.stop().then(() => process.exit(0)));
  process.on("SIGTERM", () => fake.stop().then(() => process.exit(0)));
}
