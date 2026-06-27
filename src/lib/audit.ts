import { prisma } from './prisma';

interface AuditParams {
  userId: string;
  aksi: string;
  tabelTerkait: string;
  recordId: string;
  dataSebelum?: Record<string, unknown> | null | any;
  dataSesudah?: Record<string, unknown> | null | any;
  keterangan?: string;
}

export async function createAuditLog(params: AuditParams) {
  return prisma.auditLog.create({
    data: {
      userId: params.userId,
      aksi: params.aksi,
      tabelTerkait: params.tabelTerkait,
      recordId: params.recordId,
      dataSebelum: params.dataSebelum ?? undefined,
      dataSesudah: params.dataSesudah ?? undefined,
      keterangan: params.keterangan,
    },
  });
}
