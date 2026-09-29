export type FakeSession = {
  id: string;
  status: string;
  payment_status: string;
  payment_intent: string | null;
  amount_total: number;
  currency: string;
  url: string;
  metadata: Record<string, string>;
  success_url: string;
  cancel_url: string;
  customer_email: string | null;
  client_reference_id: string | null;
  expires_at: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payment_intent_data: any;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FakeEvent = { id: string; type: string; data: { object: any } };
export type FakeRefund = { id: string; amount: number; payment_intent: string; status: string };
export type FakeDelivery = { id: string; type: string; attempt: number; status: number };

export type FakeStripeState = {
  sessions: Map<string, FakeSession>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  intents: Map<string, any>;
  refunds: Map<string, FakeRefund>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  accounts: Map<string, any>;
  events: FakeEvent[];
  deliveries: FakeDelivery[];
  failRefunds: number;
};

export type FakeStripe = { url: string; port: number; state: FakeStripeState; stop(): Promise<void> };

export function startFakeStripe(options?: {
  port?: number;
  webhookUrl?: string;
  webhookSecret?: string;
  webhookDelayMs?: number;
}): Promise<FakeStripe>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseForm(body: string): Record<string, any>;
