export type WebhookEvent =
  | 'BAST_TERBIT'
  | 'STOK_RENDAH'
  | 'LAPORAN_PENJUALAN'
  | 'INVOICE_TERBIT'
  | 'PEMBAYARAN_DITERIMA'
  | 'PEMBAYARAN_MENUNGGU_VERIFIKASI'
  | 'PEMBAYARAN_DIVERIFIKASI'
  | 'PEMBAYARAN_DITOLAK'
  | 'INVOICE_TELAT'
  | 'RETUR_DIPROSES';

interface WebhookPayload {
  event: WebhookEvent;
  data: Record<string, unknown>;
  timestamp: string;
}

export async function sendWebhook(event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[Webhook] N8N_WEBHOOK_URL not configured, skipping webhook');
    return;
  }

  const payload: WebhookPayload = {
    event,
    data,
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error(`[Webhook] Failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    // Non-blocking: webhook failure should not break the main transaction
    console.error('[Webhook] Error sending webhook:', error);
  }
}
