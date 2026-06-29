import { NextRequest, NextResponse } from 'next/server';
import { handleWahaWebhook } from '@/lib/waha';

function isValidSecret(request: NextRequest): boolean {
  const expected = process.env.WAHA_WEBHOOK_SECRET;
  if (!expected) return true;

  const headerSecret =
    request.headers.get('x-zkm-waha-secret') ||
    request.headers.get('x-webhook-secret') ||
    request.headers.get('x-waha-secret');
  const querySecret = new URL(request.url).searchParams.get('secret');

  return headerSecret === expected || querySecret === expected;
}

export async function POST(request: NextRequest) {
  try {
    if (!isValidSecret(request)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const result = await handleWahaWebhook(body);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('WAHA webhook error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
