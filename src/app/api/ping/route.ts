import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Keep-alive ping. Supabase pauses a free-tier database after ~7 days with no
// activity, which would break sign-in and sprints. A Vercel cron (see
// vercel.json) hits this every 5 days to run one trivial query so the database
// is always counted as "active" and never pauses.

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // The lightest possible round-trip to the database
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'ping failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
