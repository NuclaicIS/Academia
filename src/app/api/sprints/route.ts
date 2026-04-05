import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Sign in with Google first!" }, { status: 401 });
    }

    const { title, subjectName, targetDate } = await req.json();

    // Find or create the subject
    let subject = await prisma.subject.findFirst({ where: { name: subjectName } });
    if (!subject) {
      subject = await prisma.subject.create({ data: { name: subjectName } });
    }

    // Save sprint tied to this user's email
    const newSprint = await prisma.studySprint.create({
      data: {
        title,
        subjectId: subject.id,
        userEmail: session.user.email,
        deadline: targetDate ? new Date(targetDate) : null,
      }
    });

    return NextResponse.json({ success: true, sprint: newSprint });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await req.json();

    // Only allow deleting your own sprints
    await prisma.studySprint.deleteMany({
      where: { id, userEmail: session.user.email }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ sprints: [] });
    }

    const sprints = await prisma.studySprint.findMany({
      where: { userEmail: session.user.email },
      include: { subject: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ sprints });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
