(() => {
    'use strict';
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
        retry: new Map(),
        start: 0,
        crawled: 0,
        speed: 0,
        speedTimer: 0,
        duplicates: 0,
        fileHash: new Map(),
        logs: ['🚀 Tool đã khởi động!', '📌 Nhập 1 URL và bấm Crawl ALL để lấy toàn bộ file'],
        maxLogs: 1000,
        failCount: 0,
        totalFiles: 0,
        currentFile: '',
        mainUrl: ''
    };
    const C = {
        H: '/*\n  MiniSeres Dump\n  ' + new Date().toISOString() + '\n*/\n\n',
        MC: 5,
        RL: 2,
        TO: 10000,
        CT: 3600000,
        P: [
            { u: 'https://corsproxy.io/?url=', t: 14000 },
            { u: 'https://api.allorigins.win/raw?url=', t: 14000 },
            { u: 'https://api.codetabs.com/v1/proxy?quest=', t: 16000 },
            { u: 'https://cors-anywhere.herokuapp.com/', t: 15000 }
        ],
        A: [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0',
            'Mozilla/5.0 (Android 14; Mobile) Chrome/125.0.0.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) Version/17.5 Safari/605.1.15'
        ],
        H: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
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
        getFileName: u => { try { const p = new URL(u); const path = p.pathname; const parts = path.split('/'); const name = parts[parts.length - 1] || 'index.html'; return name.length > 50 ? name.substring(0, 50) + '...' : name; } catch { return 'file'; } }
    };
    const Cache = {
        get: k => { const e = S.cache.get(k); if (!e) return null; if (Date.now() - e.ts > C.CT) { S.cache.delete(k); return null; } return e.data; },
        set: (k, d) => { S.cache.set(k, { data: d, ts: Date.now() }); },
        clear: () => { S.cache.clear(); }
    };
    const Net = {
        fetch: async (url) => {
            const useP = document.getElementById('autoProxy').checked;
            const spoof = document.getElementById('spoofInfo').checked;
            const retry = document.getElementById('retryFail').checked;
            const maxTry = retry ? C.RL : 1;
            const hd = { ...C.H };
            if (spoof) {
                hd['User-Agent'] = C.A[Math.floor(Math.random() * C.A.length)];
                hd['Referer'] = 'https://google.com/';
                hd['X-Forwarded-For'] = U.ip();
                hd['X-Real-IP'] = U.ip();
            }
            const ctrl = new AbortController();
            const rid = U.id();
            S.abort.set(rid, ctrl);
            let last = null;
            for (let t = 0; t < maxTry; t++) {
                if (!useP) {
                    try {
                        const r = await fetch(url, { headers: hd, signal: AbortSignal.timeout(C.TO) });
                        if (r.ok) {
                            const d = await r.text();
                            S.abort.delete(rid);
                            return d;
                        }
                    } catch (e) { last = e; }
                }
                const shuffled = [...C.P].sort(() => Math.random() - 0.5);
                for (const p of shuffled) {
                    try {
                        S.bc++;
                        localStorage.setItem('bypassCount', S.bc);
                        document.getElementById('bypassCount').textContent = S.bc;
                        const r = await fetch(p.u + encodeURIComponent(url), { headers: hd, signal: AbortSignal.timeout(p.t) });
                        if (r.ok) {
                            const d = await r.text();
                            S.abort.delete(rid);
                            return d;
                        }
                    } catch (e) { last = e; await U.sleep(100 * t); }
                }
            }
            S.abort.delete(rid);
            throw new Error(last ? last.message : 'Không thể truy cập');
        },
        extract: t => {
            const u = t.match(/https?:\/\/[^\s<>"'\n]+/g) || [];
            return U.dedupe(u.filter(u => u.startsWith('http')));
        },
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
    const Dialog = {
        show: (content) => {
            const dlg = document.getElementById('customDialog');
            if (!dlg) { alert(content.replace(/<[^>]*>/g, '')); return; }
            dlg.style.display = 'flex';
            document.getElementById('dialogContent').innerHTML = content;
        },
        hide: () => {
            const dlg = document.getElementById('customDialog');
            if (dlg) dlg.style.display = 'none';
        },
        confirm: (message, callback) => {
            const html = `
                <button class="close-btn" onclick="Dialog.hide()">&times;</button>
                <h3><i class="fas fa-question-circle" style="color:#2563eb;"></i> Xác nhận</h3>
                <p style="margin:12px 0; color:#475569;">${message}</p>
                <div class="dlg-actions">
                    <button class="btn btn-outline" onclick="Dialog.hide()">Hủy</button>
                    <button class="btn btn-primary" id="dlgConfirmBtn">Đồng ý</button>
                </div>
            `;
            Dialog.show(html);
            const btn = document.getElementById('dlgConfirmBtn');
            if (btn) btn.onclick = () => { Dialog.hide(); if (callback) callback(); };
        },
        alert: (message) => {
            const html = `
                <button class="close-btn" onclick="Dialog.hide()">&times;</button>
                <h3><i class="fas fa-info-circle" style="color:#2563eb;"></i> Thông báo</h3>
                <p style="margin:12px 0; color:#475569;">${message}</p>
                <div class="dlg-actions">
                    <button class="btn btn-primary" onclick="Dialog.hide()">OK</button>
                </div>
            `;
            Dialog.show(html);
        },
        chooseFiles: (items, callback) => {
            const extMap = {};
            items.forEach(it => {
                const ext = it.fileType || 'html';
                if (!extMap[ext]) extMap[ext] = { count: 0, size: 0, items: [] };
                extMap[ext].count++;
                extMap[ext].size += it.size || 0;
                extMap[ext].items.push(it);
            });
            let html = `
                <button class="close-btn" onclick="Dialog.hide()">&times;</button>
                <h3><i class="fas fa-file-archive" style="color:#2563eb;"></i> Chọn file để tải</h3>
                <div style="margin:12px 0; max-height:300px; overflow-y:auto;">
                    <div style="font-size:0.8rem; color:#64748b; padding:4px 0; display:flex; gap:16px; border-bottom:1px solid #e2e8f0; font-weight:600;">
                        <span style="flex:2;">Đuôi file</span>
                        <span style="flex:1;text-align:center;">Số lượng</span>
                        <span style="flex:1;text-align:right;">Kích thước</span>
                        <span style="width:40px;text-align:center;"><input type="checkbox" id="selectAllExt" checked></span>
                    </div>
            `;
            let total = 0, totalSize = 0;
            Object.keys(extMap).forEach(ext => {
                const info = extMap[ext];
                total += info.count;
                totalSize += info.size;
                html += `
                    <div class="dlg-row" style="display:flex; gap:16px; align-items:center; padding:6px 0; border-bottom:1px solid #f1f5f9;">
                        <span style="flex:2; font-weight:500;">.${ext}</span>
                        <span style="flex:1; text-align:center;">${info.count}</span>
                        <span style="flex:1; text-align:right;">${U.sz(info.size)}</span>
                        <span style="width:40px; text-align:center;"><input type="checkbox" class="ext-check" data-ext="${ext}" checked></span>
                    </div>
                `;
            });
            html += `
                    </div>
                    <div style="margin:8px 0; padding:8px; background:#f8fafc; border-radius:8px; font-size:0.85rem; display:flex; justify-content:space-between;">
                        <span>Tổng: <strong>${total}</strong> file</span>
                        <span>Kích thước: <strong>${U.sz(totalSize)}</strong></span>
                    </div>
                    <div class="dlg-actions">
                        <button class="btn btn-outline" onclick="Dialog.hide()">Hủy</button>
                        <button class="btn btn-success" id="dlgDownloadBtn"><i class="fas fa-download"></i> Tải xuống</button>
                    </div>
                </div>
            `;
            Dialog.show(html);
            const selectAll = document.getElementById('selectAllExt');
            if (selectAll) {
                selectAll.addEventListener('change', function() {
                    document.querySelectorAll('.ext-check').forEach(cb => cb.checked = this.checked);
                });
            }
            const downloadBtn = document.getElementById('dlgDownloadBtn');
            if (downloadBtn) {
                downloadBtn.onclick = () => {
                    const selected = [];
                    document.querySelectorAll('.ext-check:checked').forEach(cb => {
                        const ext = cb.dataset.ext;
                        if (extMap[ext]) selected.push(...extMap[ext].items);
                    });
                    Dialog.hide();
                    if (selected.length === 0) { Dialog.alert('Chưa chọn file nào!'); return; }
                    if (callback) callback(selected);
                };
            }
        }
    };
    window.Dialog = Dialog;

    const UI = {
        msg: (t) => {
            const w = document.getElementById('msgArea');
            if (!w) { console.log(t); return; }
            const el = document.createElement('div');
            el.className = 'msg';
            el.textContent = t;
            w.appendChild(el);
            setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 250); }, 3200);
        },
        addLog: (txt) => {
            const time = new Date().toLocaleTimeString();
            const line = `[${time}] ${txt}`;
            S.logs.push(line);
            if (S.logs.length > S.maxLogs) S.logs.shift();
            const logView = document.getElementById('logView');
            if (logView) {
                logView.textContent = S.logs.join('\n');
                logView.scrollTop = logView.scrollHeight;
            }
            console.log(line);
        },
        render: () => {
            const w = document.getElementById('queueList');
            if (!w) return;
            const v = S.f === 'all' ? S.q : S.q.filter(x => x.s === S.f);
            const dc = S.q.filter(x => x.s === 'done').length;
            document.getElementById('totalCount').textContent = S.q.length;
            document.getElementById('doneCount').textContent = dc + ' xong';
            if (S.q.length) {
                const p = Math.round((dc / S.q.length) * 100);
                const pb = document.getElementById('progressBar');
                if (pb) pb.style.width = p + '%';
                const pt = document.getElementById('progressText');
                if (pt) pt.textContent = p + '%';
                const pp = document.getElementById('progressPercent');
                if (pp) pp.textContent = p + '%';
            }
            if (!v.length) {
                w.innerHTML = '<div class="empty-txt">📭 Không có file nào</div>';
                return;
            }
            w.innerHTML = v.map((it, i) => {
                const idx = S.q.indexOf(it);
                const cls = it.s === 'pending' ? 'pend' : it.s === 'run' ? 'run' : it.s === 'done' ? 'ok' : 'no';
                const txt = it.s === 'pending' ? '⏳ Chờ' : it.s === 'run' ? '🔄 Đang tải' : it.s === 'done' ? '✅ Xong' : '❌ Lỗi';
                const rt = it.retries > 0 ? `(${it.retries}/${C.RL})` : '';
                const name = U.getFileName(it.url);
                return `<div class="queue-item">
                    <div class="item-top">
                        <div style="display:flex;align-items:flex-start;gap:8px;flex:1;min-width:0;">
                            <input type="checkbox" class="chk" data-i="${idx}">
                            <span class="item-url" title="${it.url}">📄 ${name}</span>
                        </div>
                        <span class="tag tag-${cls}">${txt}${rt}</span>
                    </div>
                    <div class="item-foot">
                        <span>💾 ${U.sz(it.size)}</span>
                        <span>⏱ ${it.tm||'--'}</span>
                        <span>🔑 ${it.checksum?it.checksum.substring(0,8)+'...':''}</span>
                        <span style="color:#64748b;">📁 ${it.fileType||'html'}</span>
                        <div style="display:flex;gap:4px;">
                            <button class="s-btn" onclick="window._v(${idx})">👁 Xem</button>
                            <button class="s-btn" onclick="window._d(${idx})">💾 Tải</button>
                            <button class="s-btn" onclick="window._r(${idx})">🔄 Thử lại</button>
                            <button class="s-btn danger" onclick="window._del(${idx})">🗑 Xóa</button>
                        </div>
                    </div>
                </div>`;
            }).join('');
            document.querySelectorAll('.chk').forEach(cb => cb.addEventListener('change', UI.updSel));
        },
        updSel: () => {
            const c = document.querySelectorAll('.chk:checked');
            const sc = document.getElementById('selectedCount');
            if (sc) sc.textContent = c.length;
            const ba = document.getElementById('batchActions');
            if (ba) ba.style.display = c.length ? 'flex' : 'none';
        },
        stats: () => {
            const d = S.q.filter(x => x.s === 'done').length;
            const f = S.q.filter(x => x.s === 'fail').length;
            const p = S.q.filter(x => x.s === 'pending').length;
            const r = S.q.filter(x => x.s === 'run').length;
            const total = document.getElementById('totalCount');
            if (total) total.textContent = S.q.length;
            const done = document.getElementById('doneCount');
            if (done) done.textContent = d + ' xong';
            const pend = document.getElementById('pendingCount');
            if (pend) pend.textContent = p;
            const run = document.getElementById('runningCount');
            if (run) run.textContent = r;
            const fail = document.getElementById('failedCount');
            if (fail) fail.textContent = f;
            const crawled = document.getElementById('crawledCount');
            if (crawled) crawled.textContent = S.crawled;
            const proc = document.getElementById('processingCount');
            if (proc) proc.textContent = S.proc.size;
            const dup = document.getElementById('duplicateCount');
            if (dup) dup.textContent = S.duplicates;
            const success = document.getElementById('successCount');
            if (success) success.textContent = S.dc || 0;
            const failCount = document.getElementById('failCount');
            if (failCount) failCount.textContent = S.failCount || 0;
            if (d > 0) {
                const avg = document.getElementById('avgTime');
                if (avg) avg.textContent = U.fmt(Math.round(S.tt / d));
            }
            if (S.start > 0 && S.run) {
                const e = Date.now() - S.start;
                const elapsed = document.getElementById('elapsedTime');
                if (elapsed) elapsed.textContent = U.fmt(e);
                const rem = S.q.filter(x => x.s === 'pending' || x.s === 'fail').length;
                if (rem > 0 && d > 0) {
                    const rate = d / (e / 1000);
                    const eta = document.getElementById('etaTime');
                    if (eta) eta.textContent = U.fmt((rem / rate) * 1000);
                }
            }
            if (S.start > 0 && S.run) {
                const elapsed = (Date.now() - S.start) / 1000;
                if (elapsed > 0) {
                    const speed = S.crawled / elapsed;
                    const spd = document.getElementById('speedDisplay');
                    if (spd) spd.textContent = speed.toFixed(1);
                }
            }
            if (S.q.length > 0) {
                const dc = S.q.filter(x => x.s === 'done').length;
                const pct = Math.min(100, Math.round((dc / S.q.length) * 100));
                const pp = document.getElementById('progressPercent');
                if (pp) pp.textContent = pct + '%';
            }
        },
        show: t => {
            const cv = document.getElementById('codeView');
            if (cv) cv.textContent = t || '--';
        },
        clear: () => {
            const cv = document.getElementById('codeView');
            if (cv) cv.textContent = '';
        },
        toggleLog: (show) => {
            const lc = document.getElementById('logContainer');
            if (lc) lc.style.display = show ? 'block' : 'none';
        }
    };

    const W = {
        process: async () => {
            if (S.run || S.pause) return;
            const crawlOn = document.getElementById('crawlToggle');
            if (!crawlOn || !crawlOn.checked) {
                S.run = false; S.start = 0;
                UI.msg('⏸ Crawl đang tắt');
                UI.addLog('⏸ Crawl đang tắt');
                return;
            }
            const items = S.q.map((it, i) => ({ it, i })).filter(({ it }) => it.s === 'pending' || (it.s === 'fail' && it.retries < C.RL));
            if (!items.length) {
                S.run = false; S.start = 0;
                UI.msg('✅ Hoàn thành!');
                UI.addLog('✅ Đã tải xong tất cả file!');
                UI.stats();
                return;
            }
            S.run = true;
            S.start = S.start || Date.now();
            const batch = items.slice(0, C.MC);
            const proms = batch.map(({ it, i }) => W.processItem(i));
            await Promise.allSettled(proms);
            UI.stats();
            UI.render();
            if (!S.pause && S.q.some(x => x.s === 'pending' || (x.s === 'fail' && x.retries < C.RL))) {
                await U.sleep(50);
                W.process();
            } else {
                S.run = false;
                if (!S.pause) {
                    UI.msg('✅ Xong queue');
                    UI.addLog('✅ Xong queue');
                }
            }
        },
        processItem: async (idx) => {
            const it = S.q[idx];
            if (!it || it.s === 'done' || S.proc.has(idx)) return;
            S.proc.add(idx);
            it.s = 'run';
            const name = U.getFileName(it.url);
            UI.render();
            const st = performance.now();
            UI.addLog(`⏳ Đang tải: ${name} (${it.fileType||'html'})`);
            try {
                const cached = Cache.get(it.url);
                if (cached) {
                    it.txt = cached;
                    it.size = new Blob([cached]).size;
                    it.s = 'done';
                    it.checksum = await U.sha256(cached);
                    it.tm = Math.round(performance.now() - st) + 'ms (cache)';
                    S.dc++;
                    S.crawled++;
                    UI.addLog(`⚡ Cache: ${name} - ${U.sz(it.size)}`);
                    UI.msg(`⚡ ${name} (cache)`);
                    S.proc.delete(idx);
                    UI.render();
                    UI.stats();
                    return;
                }
                UI.addLog(`📡 Đang tải: ${name}...`);
                const raw = await Net.fetch(it.url);
                const mode = document.getElementById('saveMode');
                const content = mode && mode.value === 'raw' ? raw : C.H + raw;
                it.txt = content;
                it.size = new Blob([content]).size;
                it.s = 'done';
                it.checksum = await U.sha256(content);
                it.retries = 0;
                Cache.set(it.url, content);
                const used = Math.round(performance.now() - st);
                it.tm = used + 'ms';
                S.tt += used;
                S.dc++;
                S.crawled++;
                UI.addLog(`✅ Thành công: ${name} - ${U.sz(it.size)} (${used}ms)`);
                UI.msg(`✅ ${name} - ${U.sz(it.size)}`);
            } catch (e) {
                it.s = 'fail';
                it.err = e.message;
                it.retries = (it.retries || 0) + 1;
                S.failCount++;
                UI.addLog(`❌ Lỗi: ${name} - ${e.message} (lần ${it.retries})`);
                UI.msg(`❌ ${name} - ${e.message}`);
                if (it.retries < C.RL) {
                    UI.addLog(`🔄 Sẽ thử lại ${name}...`);
                    setTimeout(() => {
                        if (!S.pause && it.s === 'fail') {
                            it.s = 'pending';
                            UI.render();
                            W.process();
                        }
                    }, 500 * it.retries);
                } else {
                    UI.addLog(`💀 ${name} - Đã thử ${C.RL} lần, bỏ qua!`);
                }
            } finally {
                S.proc.delete(idx);
                UI.render();
                UI.stats();
            }
        },
        crawlAll: async () => {
            if (S.run) {
                Dialog.alert('⚠️ Đang crawl, dừng trước khi crawl mới!');
                return;
            }
            const val = document.getElementById('urlInput');
            if (!val) { Dialog.alert('⚠️ Không tìm thấy input!'); return; }
            const urls = Net.extract(val.value);
            if (!urls.length) {
                Dialog.alert('⚠️ Không có URL hợp lệ!');
                return;
            }
            const mainUrl = urls[0];
            S.mainUrl = mainUrl;
            UI.addLog(`🎯 Mục tiêu: ${mainUrl}`);
            UI.msg(`🎯 Crawl: ${mainUrl}`);
            
            const maxFiles = parseInt(document.getElementById('maxFiles')?.value || 100);
            const timeout = parseInt(document.getElementById('timeoutSec')?.value || 10);
            const speedMode = document.getElementById('speedMode')?.value || 'medium';
            C.TO = timeout * 1000;
            const speedMap = { fast: 10, medium: 5, slow: 2 };
            C.MC = speedMap[speedMode] || 5;
            
            UI.addLog(`🔍 Đang phân tích trang chủ: ${mainUrl}`);
            UI.msg(`🔍 Đang phân tích...`);
            
            try {
                const html = await Net.fetch(mainUrl);
                UI.addLog(`📄 Đã tải HTML chính (${U.sz(new Blob([html]).size)})`);
                
                const files = Net.extractAllFiles(html, mainUrl);
                UI.addLog(`🔍 Tìm thấy ${files.length} file liên quan`);
                
                let total = 0, dupCount = 0, fileCount = 0;
                
                S.q.push({ url: mainUrl, txt: null, size: 0, s: 'pending', tm: null, err: null, retries: 0, checksum: null, fileType: 'html' });
                total++; fileCount++;
                UI.addLog(`  ➕ Thêm: index.html (trang chính)`);
                
                for (const file of files) {
                    if (fileCount >= maxFiles) break;
                    const n = U.norm(file.url);
                    const existing = S.q.find(x => x.url === n);
                    if (!existing) {
                        S.q.push({ url: n, txt: null, size: 0, s: 'pending', tm: null, err: null, retries: 0, checksum: null, fileType: file.ext });
                        total++; fileCount++;
                        UI.addLog(`  ➕ Thêm: ${U.getFileName(n)} (${file.ext})`);
                    } else {
                        dupCount++;
                        UI.addLog(`  ⏭ Bỏ qua: ${U.getFileName(n)} (trùng)`);
                    }
                }
                
                S.duplicates += dupCount;
                UI.msg(`🔍 Tìm thấy ${total} file (bỏ qua ${dupCount} trùng)`);
                UI.addLog(`📊 Tổng: ${total} file mới, ${dupCount} trùng`);
                UI.render();
                UI.stats();
                
                if (total > 0) {
                    UI.addLog(`🚀 Bắt đầu tải ${total} file...`);
                    S.pause = false;
                    await W.process();
                } else {
                    UI.addLog(`⚠️ Không có file mới để tải!`);
                }
            } catch (e) {
                UI.addLog(`❌ Lỗi crawl ${mainUrl}: ${e.message}`);
                Dialog.alert(`❌ Lỗi: ${e.message}`);
            }
        },
        start: async () => {
            if (S.run) {
                Dialog.alert('⚠️ Đang crawl, vui lòng đợi!');
                return;
            }
            const val = document.getElementById('urlInput');
            if (!val) { Dialog.alert('⚠️ Không tìm thấy input!'); return; }
            const urls = Net.extract(val.value);
            if (!urls.length) {
                Dialog.alert('⚠️ Không có URL hợp lệ!');
                return;
            }
            const mainUrl = urls[0];
            S.mainUrl = mainUrl;
            let used = Number(localStorage.getItem('toolUse') || 1247);
            used += 1;
            localStorage.setItem('toolUse', used);
            const uc = document.getElementById('userCount');
            if (uc) uc.textContent = used;
            
            if (S.q.length > 0) {
                const confirm = await new Promise(resolve => {
                    Dialog.confirm('Queue cũ chưa xong, xóa và bắt đầu mới?', () => resolve(true));
                });
                if (!confirm) return;
                S.q = [];
            }
            
            S.q.push({ url: mainUrl, txt: null, size: 0, s: 'pending', tm: null, err: null, retries: 0, checksum: null, fileType: 'html' });
            
            UI.msg('📥 Thêm 1 URL vào hàng đợi');
            UI.addLog(`📥 Thêm: ${mainUrl}`);
            UI.render();
            UI.stats();
            S.pause = false;
            const pb = document.getElementById('pauseBtn');
            if (pb) pb.textContent = '⏸ Tạm dừng';
            if (window._timerInterval) clearInterval(window._timerInterval);
            window._timerInterval = setInterval(() => { UI.stats(); }, 1000);
            await W.process();
        },
        pause: () => {
            S.pause = !S.pause;
            const pb = document.getElementById('pauseBtn');
            if (pb) pb.textContent = S.pause ? '▶ Tiếp tục' : '⏸ Tạm dừng';
            if (!S.pause && S.run) W.process();
            UI.msg(S.pause ? '⏸ Đã dừng' : '▶ Tiếp tục');
            UI.addLog(S.pause ? '⏸ Đã tạm dừng' : '▶ Tiếp tục crawl');
        },
        stop: () => {
            Dialog.confirm('Dừng crawl và đặt lại trạng thái?', () => {
                S.pause = true;
                S.run = false;
                S.start = 0;
                S.abort.forEach(c => { try { c.abort(); } catch {} });
                S.abort.clear();
                S.proc.clear();
                S.q.forEach(it => { if (it.s === 'run') it.s = 'pending'; });
                const pb = document.getElementById('pauseBtn');
                if (pb) pb.textContent = '▶ Tiếp tục';
                if (window._timerInterval) { clearInterval(window._timerInterval); window._timerInterval = null; }
                UI.msg('⏹ Đã dừng');
                UI.addLog('⏹ Đã dừng toàn bộ');
                UI.render();
                UI.stats();
            });
        },
        retry: (idx) => {
            const it = S.q[idx];
            if (!it || (it.s !== 'fail' && it.s !== 'done')) return;
            it.s = 'pending';
            it.retries = 0;
            it.err = null;
            UI.msg('🔄 Đặt lại: ' + U.getFileName(it.url));
            UI.addLog('🔄 Đặt lại: ' + U.getFileName(it.url));
            UI.render();
            if (!S.run) W.process();
        },
        retryAll: () => {
            let c = 0;
            S.q.forEach(it => {
                if (it.s === 'fail') {
                    it.s = 'pending';
                    it.retries = 0;
                    it.err = null;
                    c++;
                }
            });
            UI.msg('🔄 Đặt lại ' + c + ' mục');
            UI.addLog('🔄 Đặt lại ' + c + ' mục fail');
            UI.render();
            if (!S.run && c) W.process();
        },
        clearDone: () => {
            Dialog.confirm('Xóa tất cả mục đã hoàn thành?', () => {
                const b = S.q.length;
                S.q = S.q.filter(x => x.s !== 'done');
                UI.msg('🗑 Xóa ' + (b - S.q.length) + ' mục');
                UI.addLog('🗑 Xóa ' + (b - S.q.length) + ' mục done');
                UI.render();
                UI.stats();
            });
        },
        clearFailed: () => {
            Dialog.confirm('Xóa tất cả mục bị lỗi?', () => {
                const b = S.q.length;
                S.q = S.q.filter(x => x.s !== 'fail');
                UI.msg('🗑 Xóa ' + (b - S.q.length) + ' mục');
                UI.addLog('🗑 Xóa ' + (b - S.q.length) + ' mục fail');
                UI.render();
                UI.stats();
            });
        },
        clearAll: () => {
            Dialog.confirm('Xóa tất cả dữ liệu?', () => {
                S.q = [];
                Cache.clear();
                UI.msg('🗑 Đã xóa');
                UI.addLog('🗑 Xóa toàn bộ dữ liệu');
                UI.render();
                UI.stats();
                UI.clear();
            });
        },
        view: (idx) => {
            const it = S.q[idx];
            UI.show(it?.txt || '--');
        },
        download: (idx) => {
            const it = S.q[idx];
            if (!it?.txt) {
                Dialog.alert('Không có nội dung để tải!');
                return;
            }
            const dm = U.dm(it.url);
            const ext = it.fileType || 'txt';
            const blob = new Blob([it.txt], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dump_${dm}_${U.ts()}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            UI.msg('📥 Tải: ' + U.getFileName(it.url));
        },
        downloadSelected: () => {
            const checked = document.querySelectorAll('.chk:checked');
            if (!checked.length) {
                Dialog.alert('Chọn ít nhất 1 file để tải!');
                return;
            }
            const items = [];
            checked.forEach(cb => {
                const idx = parseInt(cb.dataset.i);
                const it = S.q[idx];
                if (it && it.s === 'done' && it.txt) items.push(it);
            });
            if (!items.length) {
                Dialog.alert('Không có file nào đã crawl xong!');
                return;
            }
            if (items.length === 1) {
                const idx = S.q.indexOf(items[0]);
                W.download(idx);
                return;
            }
            Dialog.chooseFiles(items, (selected) => {
                if (selected.length === 1) {
                    const idx = S.q.indexOf(selected[0]);
                    W.download(idx);
                    return;
                }
                const zip = new JSZip();
                const dm = U.dm(S.mainUrl || selected[0].url);
                for (const it of selected) {
                    const ext = it.fileType || 'txt';
                    const name = U.getFileName(it.url);
                    zip.file(`${dm}_${name}.${ext}`, it.txt);
                }
                zip.generateAsync({ type: 'blob' }).then(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${dm}_${U.ts()}.zip`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 5000);
                    UI.msg(`📦 ZIP ${selected.length} file`);
                    UI.addLog(`📦 Tải ZIP ${selected.length} file`);
                }).catch(e => {
                    Dialog.alert('❌ Lỗi tạo ZIP: ' + e.message);
                });
            });
        },
        downloadAll: async () => {
            const items = S.q.filter(x => x.s === 'done' && x.txt);
            if (!items.length) {
                Dialog.alert('Không có dữ liệu để tải!');
                return;
            }
            if (items.length === 1) {
                const idx = S.q.indexOf(items[0]);
                W.download(idx);
                return;
            }
            Dialog.chooseFiles(items, (selected) => {
                if (selected.length === 1) {
                    const idx = S.q.indexOf(selected[0]);
                    W.download(idx);
                    return;
                }
                const zip = new JSZip();
                const dm = U.dm(S.mainUrl || selected[0].url);
                for (const it of selected) {
                    const ext = it.fileType || 'txt';
                    const name = U.getFileName(it.url);
                    zip.file(`${dm}_${name}.${ext}`, it.txt);
                }
                zip.generateAsync({ type: 'blob' }).then(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${dm}_${U.ts()}.zip`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 5000);
                    UI.msg(`📦 ZIP ${selected.length} file`);
                    UI.addLog(`📦 Tải ZIP ${selected.length} file`);
                }).catch(e => {
                    Dialog.alert('❌ Lỗi tạo ZIP: ' + e.message);
                });
            });
        },
        copy: () => {
            const t = document.getElementById('codeView');
            if (!t || !t.textContent.trim()) {
                Dialog.alert('Không có nội dung để sao chép!');
                return;
            }
            navigator.clipboard.writeText(t.textContent).then(() => UI.msg('📋 Đã sao chép')).catch(() => Dialog.alert('❌ Lỗi sao chép!'));
        },
        selAll: () => {
            document.querySelectorAll('.chk').forEach(c => c.checked = true);
            UI.updSel();
        },
        selNone: () => {
            document.querySelectorAll('.chk').forEach(c => c.checked = false);
            UI.updSel();
        },
        selInv: () => {
            document.querySelectorAll('.chk').forEach(c => c.checked = !c.checked);
            UI.updSel();
        },
        batchDel: () => {
            const c = document.querySelectorAll('.chk:checked');
            if (!c.length) {
                Dialog.alert('Chọn ít nhất 1 mục!');
                return;
            }
            Dialog.confirm('Xóa ' + c.length + ' mục đã chọn?', () => {
                const idxs = [...c].map(cb => parseInt(cb.dataset.i)).sort((a, b) => b - a);
                for (const i of idxs) S.q.splice(i, 1);
                UI.msg('🗑 Xóa ' + idxs.length + ' mục');
                UI.addLog('🗑 Xóa ' + idxs.length + ' mục đã chọn');
                UI.render();
                UI.stats();
                UI.updSel();
            });
        },
        batchRetry: () => {
            const c = document.querySelectorAll('.chk:checked');
            if (!c.length) {
                Dialog.alert('Chọn ít nhất 1 mục!');
                return;
            }
            let count = 0;
            [...c].forEach(cb => {
                const idx = parseInt(cb.dataset.i);
                const it = S.q[idx];
                if (it && (it.s === 'fail' || it.s === 'done')) {
                    it.s = 'pending';
                    it.retries = 0;
                    it.err = null;
                    count++;
                }
            });
            UI.msg('🔄 Đặt lại ' + count + ' mục');
            UI.addLog('🔄 Đặt lại ' + count + ' mục đã chọn');
            UI.render();
            if (!S.run && count) W.process();
        },
        import: (file) => {
            if (!file) return;
            const r = new FileReader();
            r.onload = e => {
                const input = document.getElementById('urlInput');
                if (input) input.value = e.target.result;
                UI.msg('📂 Import: ' + file.name);
                UI.addLog('📂 Import file: ' + file.name);
            };
            r.onerror = () => Dialog.alert('❌ Lỗi đọc file!');
            r.readAsText(file);
        },
        export: () => {
            const txt = S.q.map(x => x.url).join('\n');
            if (!txt) {
                Dialog.alert('Danh sách trống!');
                return;
            }
            const b = new Blob([txt]);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(b);
            a.download = `urls_${U.ts()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            UI.msg('📤 Xuất ' + S.q.length + ' URL');
        },
        exportJson: () => {
            const items = S.q.filter(x => x.s === 'done' && x.txt);
            if (!items.length) {
                Dialog.alert('Không có kết quả!');
                return;
            }
            const data = items.map(x => ({
                url: x.url,
                size: x.size,
                checksum: x.checksum,
                time: x.tm,
                content: x.txt,
                type: x.fileType
            }));
            const b = new Blob([JSON.stringify(data, null, 2)]);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(b);
            a.download = `results_${U.ts()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            UI.msg('📤 Xuất JSON ' + items.length + ' file');
        },
        clearLog: () => {
            S.logs = [];
            const lv = document.getElementById('logView');
            if (lv) lv.textContent = '';
            UI.msg('🗑 Xóa log');
        }
    };

    window._v = W.view;
    window._d = W.download;
    window._r = W.retry;
    window._del = W.clearAll;

    const init = () => {
        const load = () => {
            const ap = document.getElementById('autoProxy');
            if (ap) ap.checked = localStorage.getItem('autoProxy') === 'true';
            const si = document.getElementById('spoofInfo');
            if (si) si.checked = localStorage.getItem('spoofInfo') === 'true';
            const rf = document.getElementById('retryFail');
            if (rf) rf.checked = localStorage.getItem('retryFail') === 'true';
            const sm = document.getElementById('saveMode');
            if (sm) {
                const m = localStorage.getItem('saveMode');
                if (m) sm.value = m;
            }
        };
        load();

        const bind = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', fn);
        };

        bind('startBtn', W.start);
        bind('pauseBtn', W.pause);
        bind('stopBtn', W.stop);
        bind('resetAll', W.clearAll);
        bind('clearDone', W.clearDone);
        bind('clearFailed', W.clearFailed);
        bind('copyTxt', W.copy);
        bind('packZip', W.downloadAll);
        bind('downloadSelected', W.downloadSelected);
        bind('redoFail', W.retryAll);
        bind('selAll', W.selAll);
        bind('selNone', W.selNone);
        bind('selInvert', W.selInv);
        bind('delSelected', W.batchDel);
        bind('retrySelected', W.batchRetry);
        bind('saveList', W.export);
        bind('exportResults', W.exportJson);
        bind('loadList', () => document.getElementById('filePick')?.click());
        bind('clearCache', () => { Cache.clear(); UI.msg('🗑 Xóa cache'); UI.addLog('🗑 Xóa cache'); });
        bind('crawlAllBtn', W.crawlAll);
        bind('showLogBtn', () => { UI.toggleLog(true); UI.addLog('📋 Mở log'); });
        bind('hideLogBtn', () => { UI.toggleLog(false); UI.addLog('📋 Đóng log'); });
        bind('clearLogBtn', W.clearLog);

        const fp = document.getElementById('filePick');
        if (fp) {
            fp.addEventListener('change', e => {
                W.import(e.target.files[0]);
                e.target.value = '';
            });
        }

        document.querySelectorAll('.f-btn').forEach(b => {
            b.addEventListener('click', () => {
                document.querySelectorAll('.f-btn').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                S.f = b.dataset.f;
                UI.render();
            });
        });

        const ap = document.getElementById('autoProxy');
        if (ap) ap.addEventListener('change', () => localStorage.setItem('autoProxy', ap.checked));
        const si = document.getElementById('spoofInfo');
        if (si) si.addEventListener('change', () => localStorage.setItem('spoofInfo', si.checked));
        const rf = document.getElementById('retryFail');
        if (rf) rf.addEventListener('change', () => localStorage.setItem('retryFail', rf.checked));
        const sm = document.getElementById('saveMode');
        if (sm) sm.addEventListener('change', () => localStorage.setItem('saveMode', sm.value));

        const uc = document.getElementById('userCount');
        if (uc) uc.textContent = localStorage.getItem('toolUse') || '1247';
        const bc = document.getElementById('bypassCount');
        if (bc) bc.textContent = S.bc;

        UI.render();
        UI.stats();
        UI.addLog('🚀 MiniSeres Dump Tool đã sẵn sàng!');
        UI.addLog('📌 Nhập 1 URL và bấm "Crawl ALL" để lấy toàn bộ file');

        const saved = localStorage.getItem('queueData');
        if (saved) {
            try {
                const p = JSON.parse(saved);
                if (Array.isArray(p) && p.length) {
                    S.q = p;
                    UI.render();
                    UI.stats();
                    UI.msg('📂 Khôi phục ' + S.q.length + ' mục');
                    UI.addLog('📂 Khôi phục ' + S.q.length + ' mục từ cache');
                }
            } catch {}
        }

        setInterval(() => {
            try {
                const save = S.q.filter(x => x.s === 'done' || x.s === 'fail' || x.s === 'pending').slice(0, 500);
                if (save.length) localStorage.setItem('queueData', JSON.stringify(save));
                localStorage.setItem('crawlState', JSON.stringify({
                    run: S.run,
                    pause: S.pause,
                    crawled: S.crawled,
                    total: S.q.length
                }));
            } catch {}
            UI.stats();
        }, 5000);

        const cd = document.getElementById('customDialog');
        if (cd) {
            cd.addEventListener('click', function(e) {
                if (e.target === this) Dialog.hide();
            });
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
