const Net = {
    fetch: async (url) => {
        const useP = document.getElementById('autoProxy').checked, spoof = document.getElementById('spoofInfo').checked, retry = document.getElementById('retryFail').checked, maxTry = retry ? C.RL : 1;
        const hd = { ...C.H };
        if (spoof) { hd['User-Agent'] = C.A[Math.floor(Math.random() * C.A.length)]; hd['Referer'] = 'https://google.com/'; hd['X-Forwarded-For'] = U.ip(); hd['X-Real-IP'] = U.ip(); }
        const ctrl = new AbortController(), rid = U.id();
        S.abort.set(rid, ctrl);
        let last = null;
        for (let t = 0; t < maxTry; t++) {
            if (!useP) { try { const r = await fetch(url, { headers: hd, signal: AbortSignal.timeout(C.TO) }); if (r.ok) { const d = await r.text(); S.abort.delete(rid); return d; } } catch (e) { last = e; } }
            const shuffled = [...C.P].sort(() => Math.random() - 0.5);
            for (const p of shuffled) {
                try {
                    S.bc++;
                    localStorage.setItem('bypassCount', S.bc);
                    document.getElementById('bypassCount').textContent = S.bc;
                    const r = await fetch(p.u + encodeURIComponent(url), { headers: hd, signal: AbortSignal.timeout(p.t) });
                    if (r.ok) { const d = await r.text(); S.abort.delete(rid); return d; }
                } catch (e) { last = e; await U.sleep(100 * t); }
            }
        }
        S.abort.delete(rid);
        throw new Error(last ? last.message : 'Không thể truy cập');
    },
    extract: t => { const u = t.match(/https?:\/\/[^\s<>"'\n]+/g) || []; return U.dedupe(u.filter(u => u.startsWith('http'))); },
    extractAllFiles: (html, baseUrl) => {
        const files = [];
        const patterns = [
            /<link[^>]*href=["']([^"']+)["']/gi,
            /<script[^>]*src=["']([^"']+)["']/gi,
            /<img[^>]*src=["']([^"']+)["']/gi,
            /<source[^>]*src=["']([^"']+)["']/gi,
            /url\(["']?([^"')]+)["']?\)/gi,
            /@import\s+["']([^"']+)["']/gi,
            /<a[^>]*href=["']([^"']+)["']/gi
        ];
        const urlSet = new Set();
        for (const pattern of patterns) {
            let match;
            const regex = new RegExp(pattern.source, 'gi');
            while ((match = regex.exec(html)) !== null) {
                let url = match[1];
                if (url && !url.startsWith('http') && !url.startsWith('//')) {
                    try {
                        const base = new URL(baseUrl);
                        url = new URL(url, base).toString();
                    } catch { continue; }
                }
                if (url && url.startsWith('http') && !urlSet.has(url)) {
                    urlSet.add(url);
                    const ext = U.getFileExt(url);
                    files.push({ url, ext, size: 0 });
                }
            }
        }
        return files;
    }
};
