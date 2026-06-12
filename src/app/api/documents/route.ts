import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// Document Keeper — store study materials per account. Files are kept as
// base64 in the database so they can be downloaded/previewed later from any
// computer you sign in on.
//
// Note: Vercel caps a request body at ~4.5 MB, and base64 inflates a file by
// ~33%, so we limit a single upload to 3 MB of original file. Bigger files
// would need Supabase Storage with direct uploads.

const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3 MB

const ALLOWED: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  pdf: 'application/pdf',
  txt: 'text/plain',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function extOf(name: string): string {
  return (name.split('.').pop() || '').toLowerCase();
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ documents: [] });
  const documents = await prisma.document.findMany({
    where: { userEmail: session.user.email },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, ext: true, mime: true, size: true, createdAt: true },
  });
  return NextResponse.json({ documents });
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Sign in to keep documents' }, { status: 401 });
    }
    const { name, data } = await req.json();
    if (!name || !data) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    const ext = extOf(name);
    const mime = ALLOWED[ext];
    if (!mime) {
      return NextResponse.json(
        { error: 'Unsupported type. Allowed: png, jpeg, pdf, txt, pptx, xlsx, docx' },
        { status: 400 },
      );
    }

    // `data` is a base64 string (no data: prefix). Estimate the real byte size.
    const base64 = String(data).includes(',') ? String(data).split(',').pop()! : String(data);
    const size = Math.floor((base64.length * 3) / 4);
    if (size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `File too large (${(size / 1024 / 1024).toFixed(1)} MB). Max is 3 MB.` },
        { status: 413 },
      );
    }

    const doc = await prisma.document.create({
      data: {
        userEmail: session.user.email,
        name,
        ext: ext === 'jpg' ? 'jpeg' : ext,
        mime,
        size,
        data: base64,
      },
      select: { id: true, name: true, ext: true, mime: true, size: true, createdAt: true },
    });
    return NextResponse.json({ success: true, document: doc });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  // Fetch one document's full contents (base64) for download/preview
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const { id } = await req.json();
  const doc = await prisma.document.findFirst({
    where: { id, userEmail: session.user.email },
    select: { name: true, mime: true, data: true },
  });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ document: doc });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const { id } = await req.json();
  await prisma.document.deleteMany({ where: { id, userEmail: session.user.email } });
  return NextResponse.json({ success: true });
}
