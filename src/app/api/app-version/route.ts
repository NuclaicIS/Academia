import { NextResponse } from 'next/server';

// Version manifest for the Android app's in-app updater. The app fetches this,
// compares `versionCode` against its own, and offers to download + install the
// new APK if this is higher.
//
// >>> WHEN YOU SHIP A NEW APK: bump `versionCode` (and versionName/notes) here,
//     and set the same versionCode in academic-os-android/app.json and in
//     academic-os-android/src/lib/update.ts (CURRENT_VERSION_CODE). <<<

const LATEST = {
  versionCode: 3,
  versionName: '1.2.0',
  apkUrl: 'https://github.com/vidhanagrwal92-netizen/academic-os-app/releases/latest/download/AcademicOS.apk',
  notes: 'New keyless Vision Tutor: snap a photo of your homework and the on-device AI checks it step by step — no account or limits.',
};

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(LATEST);
}
