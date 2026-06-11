# Academic OS

A personal student "operating system" that runs on your own computer. On a desktop browser it boots into a full OS shell — desktop icons, draggable windows, taskbar, start menu — with these apps:

- **Sprints** — goal tracker with phone alerts (the original app)
- **AI Tutor** — step-by-step tutoring chat powered by the local qwen2.5:1.5b model
- **AI Chat** — general assistant, also local qwen2.5:1.5b
- **Vision Tutor** — snap homework photos for checking
- **Browser** — minimal web browser with a built-in page proxy (`/api/proxy`) so sites render inside the window; heavy sites open with ↗
- **Calculator**

The AI runs on the user's own computer two ways: if Ollama is running locally it is used first; otherwise the model is downloaded once (~1 GB) into the browser via WebLLM/WebGPU and runs there — so the AI also works on the Vercel deployment with no server GPU.

On phones it keeps the original mobile dashboard and PWA install flow.

## Running the OS

1. Make sure [Ollama](https://ollama.com) is installed and the model is pulled: `ollama pull qwen2.5:1.5b` (already done on this machine). Ollama must be running (`ollama serve` or the Ollama tray app).
2. Start the app: `npm run dev` (or `npm run build && npm start`).
3. Open [http://localhost:3000](http://localhost:3000) on a computer — the desktop OS loads automatically. Double-click icons or use the Start menu.

The AI endpoints can be pointed elsewhere with `OLLAMA_URL` and `OLLAMA_MODEL` env vars. On Vercel (or any computer without Ollama), the AI apps automatically fall back to running the model inside the visitor's browser via WebLLM (needs Chrome/Edge with WebGPU).

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
