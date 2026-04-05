import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    const token = session?.accessToken;

    // Force Google sign-in before allowing sprint creation
    if (!token) {
      return NextResponse.json({ error: "Sign in with Google first to enable phone reminders!" }, { status: 401 });
    }

    const { title, subjectName, targetDate } = await req.json();

    // 1. Save to Cloud Database
    let subject = await prisma.subject.findFirst({ where: { name: subjectName } });
    if (!subject) {
      subject = await prisma.subject.create({ data: { name: subjectName } });
    }
    const newSprint = await prisma.studySprint.create({
      data: {
        title,
        subjectId: subject.id,
      }
    });

    // 2. Sync to Google Calendar for Phone Reminders
    let googleSynced = false;
    if (targetDate) {
      const startTime = new Date(targetDate);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
      const event = {
        summary: title + " - " + subjectName,
        description: "Study Sprint - Auto-synced from Academic OS",
        start: { dateTime: startTime.toISOString(), timeZone: "Asia/Kolkata" },
        end: { dateTime: endTime.toISOString(), timeZone: "Asia/Kolkata" },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 30 },
            { method: "popup", minutes: 24 * 60 }
          ]
        }
      };
      
      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(event)
      });
      if (res.ok) googleSynced = true;
    }

    return NextResponse.json({ success: true, sprint: newSprint, googleSynced });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
