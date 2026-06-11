import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// Saved Wikipedia articles per account — stored as plain text so they can be
// read later without fetching Wikipedia again (offline reading).

function wikiTitleFromUrl(url: string): { lang: string; title: string } | null {
  const m = url.match(/^https?:\/\/([a-z-]+)\.(?:m\.)?wikipedia\.org\/wiki\/([^#?]+)/i);
  if (!m) return null;
  return { lang: m[1], title: decodeURIComponent(m[2]) };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ articles: [] });
  const articles = await prisma.savedArticle.findMany({
    where: { userEmail: session.user.email },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, url: true, createdAt: true },
  });
  return NextResponse.json({ articles });
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Sign in to save articles' }, { status: 401 });
    }
    const { url } = await req.json();
    const wiki = wikiTitleFromUrl(url || '');
    if (!wiki) {
      return NextResponse.json({ error: 'Only Wikipedia articles can be saved' }, { status: 400 });
    }

    // Fetch plain-text extract from the Wikipedia API
    const apiUrl = `https://${wiki.lang}.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&redirects=1&titles=${encodeURIComponent(wiki.title)}`;
    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'AcademicOS/1.0 (study app)' },
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    const pages = data?.query?.pages || {};
    const page = Object.values(pages)[0] as { title?: string; extract?: string } | undefined;
    if (!page?.extract) {
      return NextResponse.json({ error: 'Could not read this article' }, { status: 502 });
    }

    const article = await prisma.savedArticle.create({
      data: {
        userEmail: session.user.email,
        title: page.title || wiki.title.replace(/_/g, ' '),
        url,
        // Cap stored size so one giant page can't blow up the database
        content: page.extract.slice(0, 300_000),
      },
    });
    return NextResponse.json({ success: true, id: article.id, title: article.title });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save article';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  // Fetch one article's full content by id
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const { id } = await req.json();
  const article = await prisma.savedArticle.findFirst({
    where: { id, userEmail: session.user.email },
  });
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ article });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const { id } = await req.json();
  await prisma.savedArticle.deleteMany({ where: { id, userEmail: session.user.email } });
  return NextResponse.json({ success: true });
}
