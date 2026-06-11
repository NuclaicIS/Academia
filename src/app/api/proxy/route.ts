import { NextResponse } from 'next/server';

// Minimal web proxy for the OS Browser app. Fetches a page server-side and
// re-serves it without the frame-blocking headers, so it can render inside
// the browser window's iframe. Assets load directly from the real site via
// an injected <base> tag; link clicks are re-routed back through the proxy.

const BLOCKED_HOSTS = /^(localhost|127\.|0\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|\[::1\])/i;

function proxyUrl(target: string) {
  return `/api/proxy?url=${encodeURIComponent(target)}`;
}

const NAV_SCRIPT = `
<script>
(function () {
  var PROXY = '/api/proxy?url=';
  function toProxy(href) {
    try {
      var u = new URL(href, document.baseURI);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
      return PROXY + encodeURIComponent(u.href);
    } catch (e) { return null; }
  }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var p = toProxy(a.getAttribute('href'));
    if (p) { e.preventDefault(); window.location.href = p; }
  }, true);
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || !f.action) return;
    if ((f.method || 'get').toLowerCase() !== 'get') return;
    e.preventDefault();
    var u = new URL(f.action, document.baseURI);
    var data = new FormData(f);
    data.forEach(function (v, k) { u.searchParams.set(k, v); });
    var p = toProxy(u.href);
    if (p) window.location.href = p;
  }, true);
})();
</script>`;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get('url');
  if (!raw) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return NextResponse.json({ error: 'Only http(s) URLs allowed' }, { status: 400 });
  }
  if (BLOCKED_HOSTS.test(target.hostname)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
  }

  try {
    const upstream = await fetch(target.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    const contentType = upstream.headers.get('content-type') || '';

    if (!contentType.includes('text/html')) {
      // Pass non-HTML straight through (images, css fetched via proxy, etc.)
      return new Response(upstream.body, {
        status: upstream.status,
        headers: { 'Content-Type': contentType || 'application/octet-stream' },
      });
    }

    let html = await upstream.text();
    const finalUrl = upstream.url || target.href;

    // Make relative assets resolve against the real site, and route navigation
    // back through the proxy.
    const baseTag = `<base href="${finalUrl.replace(/"/g, '&quot;')}">`;
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, (m) => `${m}${baseTag}${NAV_SCRIPT}`);
    } else {
      html = baseTag + NAV_SCRIPT + html;
    }

    return new Response(html, {
      status: upstream.status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Proxied-Url': finalUrl,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'fetch failed';
    return new Response(
      `<html><body style="background:#09090b;color:#a1a1aa;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h2 style="color:#e4e4e7">Couldn't load page</h2><p>${message}</p><p style="font-size:12px">${proxyUrl(target.href)}</p></div></body></html>`,
      { status: 502, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
