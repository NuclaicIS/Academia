import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    const token = session?.accessToken;

    if (!token) {
      return NextResponse.json({ error: "You must click 'Sign In' before syncing alerts!" }, { status: 401 });
    }

    const { title, targetDate } = await req.json();

    const startTime = new Date(targetDate);
    // Let's create an event representing a 1-hour study block or deadline
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    const event = {
      summary: title,
      description: "Auto-synced from your Personal Academic OS.",
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 30 }, // Push notification to phone 30 mins before!
          { method: "popup", minutes: 24 * 60 } // Early-warning push notification 1 day before!
        ]
      }
    };

    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Failed to trigger Google Cal sync.");

    return NextResponse.json({ success: true, googleLink: data.htmlLink });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
