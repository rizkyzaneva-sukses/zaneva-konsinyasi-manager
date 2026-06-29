import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { resetTrialData, seedDummyData } from '@/lib/trial-data';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN');
    const body = await request.json();
    const action = body?.action;

    if (action === 'seed') {
      const summary = await seedDummyData(session.userId);
      return NextResponse.json({
        success: true,
        message: 'Data dummy berhasil disuntik',
        data: summary,
      });
    }

    if (action === 'reset') {
      if (body?.confirm !== 'RESET DATA') {
        return NextResponse.json(
          { success: false, error: 'Ketik RESET DATA untuk konfirmasi reset' },
          { status: 400 }
        );
      }

      const summary = await resetTrialData();
      await createAuditLog({
        userId: session.userId,
        aksi: 'RESET_TRIAL_DATA',
        tabelTerkait: 'TrialData',
        recordId: 'trial-data',
        dataSesudah: summary,
        keterangan: 'Owner/Admin reset data trial menjadi kosong',
      });

      return NextResponse.json({
        success: true,
        message: 'Data trial berhasil direset',
        data: summary,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Action tidak valid' },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
