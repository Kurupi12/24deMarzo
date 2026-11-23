import { Prisma, PrismaClient } from '@prisma/client';

type DbClient = PrismaClient | Prisma.TransactionClient;

const GENERIC_CUSTOMER_NAMES = new Set([
  'sin nombre (consumidor final)',
  'consumidor final',
  'cliente ocasional / mostrador',
]);

/**
 * Normaliza el RUC/C.I. de un cliente: si viene vacío pero tiene un nombre propio
 * (y no se fuerza factura innominada), reutiliza o genera un código interno OC-XXXXX.
 */
export async function resolveCustomerRuc(
  db: DbClient,
  params: {
    customerRuc?: string | null;
    customerName?: string | null;
    forceAnonymousFallback?: boolean;
  }
): Promise<string> {
  const rawRuc = (params.customerRuc || '').trim();
  if (rawRuc) return rawRuc;

  const cleanName = (params.customerName || '').trim();
  const isGenericName = !cleanName || GENERIC_CUSTOMER_NAMES.has(cleanName.toLowerCase());

  if (isGenericName || params.forceAnonymousFallback) {
    return '44444401-7';
  }

  const existingOccasional = await db.customer.findFirst({
    where: {
      name: { equals: cleanName, mode: 'insensitive' },
      ruc: { startsWith: 'OC-' },
    },
    select: { ruc: true },
  });

  if (existingOccasional) {
    return existingOccasional.ruc;
  }

  const lastOccasional = await db.customer.findFirst({
    where: { ruc: { startsWith: 'OC-' } },
    orderBy: { createdAt: 'desc' },
    select: { ruc: true },
  });

  const lastSeq = lastOccasional?.ruc.match(/\d+$/)?.[0];
  const nextSeq = lastSeq ? parseInt(lastSeq, 10) + 1 : 1;
  return `OC-${String(nextSeq).padStart(5, '0')}`;
}

/**
 * Registra o actualiza un cliente en el maestro si tiene código/RUC distinto a Consumidor Final.
 */
export async function syncCustomerMaster(
  db: DbClient,
  params: {
    ruc: string;
    name: string;
    address?: string | null;
    googleMapsUrl?: string | null;
    phone?: string | null;
    email?: string | null;
  }
) {
  const cleanRuc = params.ruc.trim();
  const cleanName = params.name.trim();
  if (!cleanRuc || !cleanName || cleanRuc === '44444401-7') return null;

  const cleanAddress = params.address?.trim() || undefined;
  const cleanMaps = params.googleMapsUrl?.trim() || undefined;
  const cleanPhone = params.phone?.trim() || undefined;
  const cleanEmail = params.email?.trim() || undefined;

  return db.customer.upsert({
    where: { ruc: cleanRuc },
    update: {
      name: cleanName,
      ...(cleanAddress !== undefined ? { address: cleanAddress } : {}),
      ...(cleanMaps !== undefined ? { googleMapsUrl: cleanMaps } : {}),
      ...(cleanPhone !== undefined ? { phone: cleanPhone } : {}),
      ...(cleanEmail !== undefined ? { email: cleanEmail } : {}),
    },
    create: {
      ruc: cleanRuc,
      name: cleanName,
      address: cleanAddress,
      googleMapsUrl: cleanMaps,
      phone: cleanPhone,
      email: cleanEmail,
    },
  });
}
