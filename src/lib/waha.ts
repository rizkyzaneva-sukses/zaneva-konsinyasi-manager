import { prisma } from './prisma';
import { formatRupiah } from './utils';
import { getInvoiceNumber } from './invoice';
import { getVenueStock } from './stock';

type WahaWebhookPayload = {
  event?: string;
  session?: string;
  payload?: {
    id?: string;
    from?: string;
    fromMe?: boolean;
    body?: string;
    hasMedia?: boolean;
  };
};

type WahaReply = {
  chatId: string;
  text: string;
};

function normalizePhone(value: string): string {
  return value.replace(/@c\.us|@s\.whatsapp\.net|@lid/gi, '').replace(/\D/g, '');
}

function normalizeCommand(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function helpText(isOwner: boolean): string {
  if (isOwner) {
    return [
      'Format Owner ZKM:',
      'STOK <nama venue>',
      'INVOICE <nama venue>',
      'BROADCAST ALL | pesan',
      'BROADCAST <nama venue 1>, <nama venue 2> | pesan',
      'HELP',
    ].join('\n');
  }

  return [
    'Format Zaneva:',
    'STOK',
    'STOK <SKU>',
    'INVOICE',
    'INVOICE <NO_INVOICE>',
    'HELP',
  ].join('\n');
}

function isOwnerPhone(phone: string): boolean {
  const ownerNumbers = (process.env.WAHA_OWNER_NUMBERS || '')
    .split(',')
    .map((item) => normalizePhone(item))
    .filter(Boolean);

  return ownerNumbers.includes(phone);
}

function formatStockRows(rows: Awaited<ReturnType<typeof getVenueStock>>, sku?: string): string {
  const filtered = sku
    ? rows.filter((row) => row.sku.toLowerCase() === sku.toLowerCase())
    : rows;

  if (filtered.length === 0) {
    return sku ? `SKU ${sku} tidak ditemukan atau tidak aktif.` : 'Belum ada produk aktif.';
  }

  return filtered
    .slice(0, 20)
    .map((row) => {
      const ropMark = row.sisaStok <= row.minStok ? ' (ROP)' : '';
      return `- ${row.sku} ${row.produkNama}: ${row.sisaStok} pcs${ropMark}`;
    })
    .join('\n');
}

async function formatVenueInvoices(venueId: string, invoiceNumber?: string): Promise<string> {
  const invoices = await prisma.invoice.findMany({
    where: {
      venueId,
      ...(invoiceNumber
        ? { noInvoice: { equals: invoiceNumber, mode: 'insensitive' as const } }
        : { status: { in: ['BELUM_DIBAYAR', 'TELAT'] } }),
    },
    orderBy: { jatuhTempo: 'asc' },
    include: { pembayaran: true },
  });

  if (invoices.length === 0) {
    return invoiceNumber
      ? `Invoice ${invoiceNumber} tidak ditemukan untuk venue ini.`
      : 'Tidak ada invoice belum lunas.';
  }

  return invoices
    .slice(0, 10)
    .map((invoice) => {
      const approvedPaid = invoice.pembayaran
        .filter((payment) => payment.status === 'APPROVED')
        .reduce((sum, payment) => sum + payment.jumlah, 0);
      const sisa = invoice.totalTagihan - approvedPaid;
      return [
        `- ${getInvoiceNumber(invoice)}`,
        `Total: ${formatRupiah(invoice.totalTagihan)}`,
        `Sisa: ${formatRupiah(Math.max(sisa, 0))}`,
        `Status: ${invoice.status}`,
      ].join(' | ');
    })
    .join('\n');
}

async function findVenueByName(query: string) {
  return prisma.venue.findFirst({
    where: {
      nama: { contains: query, mode: 'insensitive' },
    },
  });
}

async function findVenuesForBroadcast(target: string) {
  if (target.toUpperCase() === 'ALL') {
    return prisma.venue.findMany({
      where: { status: 'AKTIF', picKontakWa: { not: '' } },
      orderBy: { nama: 'asc' },
    });
  }

  const names = target
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const venues = [];
  for (const name of names) {
    const venue = await findVenueByName(name);
    if (venue) venues.push(venue);
  }
  return venues;
}

async function executeOwnerCommand(command: string): Promise<WahaReply[]> {
  const upper = command.toUpperCase();

  if (upper === 'HELP') {
    return [{ chatId: '', text: helpText(true) }];
  }

  if (upper.startsWith('STOK ')) {
    const venueName = command.slice(5).trim();
    const venue = await findVenueByName(venueName);
    if (!venue) return [{ chatId: '', text: `Venue "${venueName}" tidak ditemukan.` }];
    const stock = await getVenueStock(venue.id);
    return [{ chatId: '', text: `Stok ${venue.nama}:\n${formatStockRows(stock)}` }];
  }

  if (upper.startsWith('INVOICE ')) {
    const venueName = command.slice(8).trim();
    const venue = await findVenueByName(venueName);
    if (!venue) return [{ chatId: '', text: `Venue "${venueName}" tidak ditemukan.` }];
    return [{ chatId: '', text: `Invoice ${venue.nama}:\n${await formatVenueInvoices(venue.id)}` }];
  }

  if (upper.startsWith('BROADCAST ')) {
    const [, rest = ''] = command.split(/^BROADCAST\s+/i);
    const [targetRaw, messageRaw] = rest.split('|').map((item) => item?.trim());
    if (!targetRaw || !messageRaw) {
      return [{ chatId: '', text: 'Format broadcast: BROADCAST ALL | pesan atau BROADCAST Venue A, Venue B | pesan' }];
    }

    const venues = await findVenuesForBroadcast(targetRaw);
    if (venues.length === 0) {
      return [{ chatId: '', text: 'Tidak ada venue tujuan yang cocok.' }];
    }

    return [
      ...venues.map((venue) => ({
        chatId: `${normalizePhone(venue.picKontakWa)}@c.us`,
        text: messageRaw,
      })),
      {
        chatId: '',
        text: `Broadcast dikirim ke ${venues.length} venue: ${venues.map((venue) => venue.nama).join(', ')}`,
      },
    ];
  }

  return [{ chatId: '', text: helpText(true) }];
}

async function executeVenueCommand(phone: string, command: string): Promise<string> {
  const venues = await prisma.venue.findMany({
    where: { picKontakWa: { not: '' } },
  });
  const venue = venues.find((item) => normalizePhone(item.picKontakWa) === phone);

  if (!venue) {
    return 'Nomor WA ini belum terdaftar sebagai PIC venue. Hubungi admin Zaneva.';
  }

  const upper = command.toUpperCase();

  if (upper === 'HELP') return helpText(false);

  if (upper === 'STOK' || upper.startsWith('STOK ')) {
    const sku = upper === 'STOK' ? undefined : command.slice(5).trim();
    const stock = await getVenueStock(venue.id);
    return `Stok ${venue.nama}:\n${formatStockRows(stock, sku)}`;
  }

  if (upper === 'INVOICE' || upper.startsWith('INVOICE ')) {
    const noInvoice = upper === 'INVOICE' ? undefined : command.slice(8).trim();
    return `Invoice ${venue.nama}:\n${await formatVenueInvoices(venue.id, noInvoice)}`;
  }

  return helpText(false);
}

export async function sendWahaText(chatId: string, text: string): Promise<void> {
  const baseUrl = process.env.WAHA_API_URL;
  if (!baseUrl) {
    console.warn('[WAHA] WAHA_API_URL not configured, skipping reply');
    return;
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/sendText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.WAHA_API_KEY ? { 'X-Api-Key': process.env.WAHA_API_KEY } : {}),
    },
    body: JSON.stringify({
      session: process.env.WAHA_SESSION || 'default',
      chatId,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(`WAHA sendText failed: ${response.status}`);
  }
}

export async function handleWahaWebhook(body: WahaWebhookPayload) {
  if (!body.event?.startsWith('message')) {
    return { ignored: true, reason: 'unsupported event' };
  }

  const payload = body.payload;
  if (!payload?.from || !payload.body || payload.fromMe) {
    return { ignored: true, reason: 'empty or outgoing message' };
  }

  const chatId = payload.from.endsWith('@c.us') ? payload.from : `${normalizePhone(payload.from)}@c.us`;
  const phone = normalizePhone(payload.from);
  const command = normalizeCommand(payload.body);
  const isOwner = isOwnerPhone(phone);
  const replies = isOwner
    ? await executeOwnerCommand(command)
    : [{ chatId: '', text: await executeVenueCommand(phone, command) }];

  for (const reply of replies) {
    await sendWahaText(reply.chatId || chatId, reply.text);
  }

  return {
    ignored: false,
    role: isOwner ? 'OWNER' : 'VENUE',
    replies: replies.length,
  };
}
