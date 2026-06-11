import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// Per-account OS settings (wallpaper, accent…) so customization follows
// the user's email across computers.

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ settings: null });
    const row = await prisma.userSettings.findUnique({ where: { userEmail: session.user.email } });
    return NextResponse.json({ settings: row ? JSON.parse(row.data) : null });
  } catch {
    return NextResponse.json({ settings: null });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }
    const settings = await req.json();
    const data = JSON.stringify(settings);
    await prisma.userSettings.upsert({
      where: { userEmail: session.user.email },
      create: { userEmail: session.user.email, data },
      update: { data },
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
