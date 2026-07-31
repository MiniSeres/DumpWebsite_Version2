const S = {
    q: [],
    f: 'all',
    bc: Number(localStorage.getItem('bypassCount') || 0),
    tt: 0,
    dc: 0,
    run: false,
    pause: false,
    abort: new Map(),
    cache: new Map(),
    proc: new Set(),
    retry: new Map(),e.
    start: 0,
    crawled: 0,
    speed: 0,
    speedTimer: 0,
    duplicates: 0,
    fileHash: new Map(),
    logs: [],
    maxLogs: 500
};

const C = {
    H: '/*\n  MiniSeres Dump\n  ' + new Date().toISOString() + '\n*/\n\n',
    MC: 15,
    RL: 3,
    TO: 15000,
    CT: 3600000,
    P: [{ u: 'https://corsproxy.io/?url=', t: 14000 }, { u: 'https://api.allorigins.win/raw?url=', t: 14000 }, { u: 'https://api.codetabs.com/v1/proxy?quest=', t: 16000 }, { u: 'https://cors-anywhere.herokuapp.com/', t: 15000 }, { u: 'https://proxy.cors.sh/', t: 12000 }],
    A: ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0', 'Mozilla/5.0 (Android 14; Mobile) Chrome/125.0.0.0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) Version/17.5 Safari/605.1.15', 'Mozilla/5.0 (X11; Linux x86_64) Chrome/124.0.0.0', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5) Version/17.5 Mobile/15E148 Safari/604.1'],
    H: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9', 'Accept-Encoding': 'gzip, deflate, br', 'DNT': '1', 'Connection': 'keep-alive', 'Upgrade-Insecure-Requests': '1', 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
};

const U = {
    sz: b => { if (!b || b <= 0) return '0B'; const u = ['B', 'KB', 'MB', 'GB']; let i = 0; while (b >= 1024 && i < 3) { b /= 1024; i++; } return b.toFixed(i === 0 ? 0 : 1) + u[i]; },
    dm: u => { try { return new URL(u).hostname.replace(/^www\./, '').replace(/[^a-zA-Z0-9_\-.]/g, '_'); } catch { return 'unknown'; } },
    ts: () => { const d = new Date(); return '' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '_' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + String(d.getSeconds()).padStart(2, '0'); },
    ip: () => `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,
    id: () => { const a = new Uint8Array(8); crypto.getRandomValues(a); return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join(''); },
    sha256: async d => { const e = new TextEncoder(), b = await crypto.subtle.digest('SHA-256', e.encode(d)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); },
    dedupe: a => { const s = new Set(); return a.filter(i => { const k = typeof i === 'object' ? JSON.stringify(i) : i; if (s.has(k)) return false; s.add(k); return true; }); },
    sleep: ms => new Promise(r => setTimeout(r, ms)),
    norm: u => { try { const p = new URL(u); p.search = ''; p.hash = ''; return p.toString(); } catch { return u; } },
    valid: u => { try { const p = new URL(u); return p.protocol === 'http:' || p.protocol === 'https:'; } catch { return false; } },
    fmt: ms => ms < 1000 ? ms + 'ms' : ms < 60000 ? (ms / 1000).toFixed(1) + 's' : Math.floor(ms / 60000) + 'm ' + Math.floor((ms % 60000) / 1000) + 's',
    getFileExt: u => { try { const p = new URL(u); const path = p.pathname; const ext = path.split('.').pop().toLowerCase(); return ext || 'html'; } catch { return 'html'; } },
    getFileName: u => { try { const p = new URL(u); const path = p.pathname; const parts = path.split('/'); return parts[parts.length - 1] || 'index.html'; } catch { return 'file'; } }
};

const Cache = {
    get: k => { const e = S.cache.get(k); if (!e) return null; if (Date.now() - e.ts > C.CT) { S.cache.delete(k); return null; } return e.data; },
    set: (k, d) => { S.cache.set(k, { data: d, ts: Date.now() }); },
    clear: () => { S.cache.clear(); }
};
