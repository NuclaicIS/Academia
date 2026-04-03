'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function PhoneAlertWidget() {
  const [title, setTitle] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Syncing to Google Cloud...');
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, targetDate })
      });
      const data = await res.json();
      
      if (res.status === 401) {
        // If they aren't logged in, redirect them to the Google login
        signIn('google'); 
      } else if (res.ok) {
         setStatus("Successfully synced to Phone Alarm!");
         setTitle('');
         setTargetDate('');
      } else {
         setStatus("Error: " + data.error);
      }
    } catch (err) {
      setStatus("Network error syncing data.");
    }
    setLoading(false);
  };

  return (
    <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800/80 shadow-lg shadow-black/50">
      <h3 className="font-semibold text-zinc-100 flex items-center justify-between gap-2 mb-4">
       <span className="flex items-center gap-2">
         <span className="text-xl">📱</span> Send Phone Reminder
       </span>
       <span className="text-[10px] uppercase font-bold tracking-wider bg-zinc-800 text-blue-400 px-2.5 py-1 rounded-full">Cost: $0</span>
      </h3>
      <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
        Schedules this event natively into your linked Google Calendar. Your phone will receive a push notification 1 day before, and 30 minutes before the deadline—even if your laptop is fully shut down.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input required value={title} onChange={e => setTitle(e.target.value)} type="text" placeholder="Physics Exam" className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
        <input required value={targetDate} onChange={e => setTargetDate(e.target.value)} type="datetime-local" className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-zinc-300 transition-colors" />
        <button disabled={loading} type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-3 rounded-xl mt-2 transition-all active:scale-95">
          {loading ? "Connecting..." : "Schedule Phone Alarm"}
        </button>
      </form>
      {status && <p className={`text-xs mt-3 font-medium ${status.includes('Error') ? 'text-red-400' : 'text-blue-400'}`}>{status}</p>}
    </div>
  )
}
