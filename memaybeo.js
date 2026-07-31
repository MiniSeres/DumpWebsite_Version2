/* ==================== MEMAYBEO.JS ==================== */
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
        logs: [],
        maxLogs: 500,
        failCount: 0
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
        sz: b => { if (!b || b <= 0) return '0B'; const u = ['B', 'KB', 'MB', 'GB']; let i = 0; while (b >= 1024 && i < 3) { b /= 1024;
                i++; } return b.toFixed(i === 0 ? 0 : 1) + u[i]; },
        dm: u => { try { return new URL(u).hostname.replace(/^www\./, '').replace(/[^a-zA-Z0-9_\-.]/g, '_'); } catch { return 'unknown'; } },
        ts: () => { const d = new Date(); return '' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '_' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + String(d.getSeconds()).padStart(2, '0'); },
        ip: () => `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,
        id: () => { const a = new Uint8Array(8);
            crypto.getRandomValues(a); return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join(''); },
        sha256: async d => { const e = new TextEncoder(),
                b = await crypto.subtle.digest('SHA-256', e.encode(d)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); },
        dedupe: a => { const s = new Set(); return a.filter(i => { const k = typeof i === 'object' ? JSON.stringify(i) : i; if (s.has(k)) return false;
                s.add(k); return true; }); },
        sleep: ms => new Promise(r => setTimeout(r, ms)),
        norm: u => { try { const p = new URL(u);
                p.search = '';
                p.hash = ''; return p.toString(); } catch { return u; } },
        valid: u => { try { const p = new URL(u); return p.protocol === 'http:' || p.protocol === 'https:'; } catch { return false; } },
        fmt: ms => ms < 1000 ? ms + 'ms' : ms < 60000 ? (ms / 1000).toFixed(1) + 's' : Math.floor(ms / 60000) + 'm ' + Math.floor((ms % 60000) / 1000) + 's',
        getFileExt: u => { try { const p = new URL(u); const path = p.pathname; const ext = path.split('.').pop().toLowerCase(); return ext || 'html'; } catch { return 'html'; } }
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
                    } catch (e) { last = e;
                        await U.sleep(100 * t); }
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
            document.getElementById('customDialog').style.display = 'flex';
            document.getElementById('dialogContent').innerHTML = content;
        },
        hide: () => {
            document.getElementById('customDialog').style.display = 'none';
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
            document.getElementById('dlgConfirmBtn').onclick = () => { Dialog.hide(); if (callback) callback(); };
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
            let total = 0,
                totalSize = 0;
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
            document.getElementById('selectAllExt').addEventListener('change', function() {
                document.querySelectorAll('.ext-check').forEach(cb => cb.checked = this.checked);
            });
            document.getElementById('dlgDownloadBtn').onclick = () => {
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
    };
    window.Dialog = Dialog;
    const UI = {
        msg: (t) => {
            const w = document.getElementById('msgArea');
            const el = document.createElement('div');
            el.className = 'msg';
            el.textContent = t;
            w.appendChild(el);
            setTimeout(() => { el.style.opacity = '0';
                setTimeout(() => el.remove(), 250); }, 3200);
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
        },
        render: () => {
            const w = document.getElementById('queueList');
            const t = document.getElementById('totalCount');
            const d = document.getElementById('doneCount');
            const v = S.f === 'all' ? S.q : S.q.filter(x => x.s === S.f);
            t.textContent = S.q.length;
            const dc = S.q.filter(x => x.s === 'done').length;
            d.textContent = dc + ' xong';
            if (S.q.length) {
                const p = Math.round((dc / S.q.length) * 100);
                document.getElementById('progressBar').style.width = p + '%';
                document.getElementById('progressText').textContent = p + '%';
                document.getElementById('progressPercent').textContent = p + '%';
            }
            if (!v.length) {
                w.innerHTML = '<div class="empty-txt">Không có mục</div>';
                return;
            }
            w.innerHTML = v.map((it, i) => {
                const idx = S.q.indexOf(it);
                const cls = it.s === 'pending' ? 'pend' : it.s === 'run' ? 'run' : it.s === 'done' ? 'ok' : 'no';
                const txt = it.s === 'pending' ? 'Chờ' : it.s === 'run' ? 'Đang xử lý' : it.s === 'done' ? 'Xong' : 'Lỗi';
                const rt = it.retries > 0 ? `(${it.retries}/${C.RL})` : '';
                return `<div class="queue-item">
                    <div class="item-top">
                        <div style="display:flex;align-items:flex-start;gap:8px;flex:1;min-width:0;">
                            <input type="checkbox" class="chk" data-i="${idx}">
                            <span class="item-url" title="${it.url}">${it.url}</span>
                        </div>
                        <span class="tag tag-${cls}">${txt}${rt}</span>
                    </div>
                    <div class="item-foot">
                        <span>${U.sz(it.size)}</span>
                        <span>${it.tm||'--'}</span>
                        <span>${it.checksum?it.checksum.substring(0,8)+'...':''}</span>
                        <span style="color:#64748b;">${it.fileType||'html'}</span>
                        <div style="display:flex;gap:4px;">
                            <button class="s-btn" onclick="window._v(${idx})">Xem</button>
                            <button class="s-btn" onclick="window._d(${idx})">Tải</button>
                            <button class="s-btn" onclick="window._r(${idx})">Thử lại</button>
                            <button class="s-btn danger" onclick="window._del(${idx})">Xóa</button>
                        </div>
                    </div>
                </div>`;
            }).join('');
            document.querySelectorAll('.chk').forEach(cb => cb.addEventListener('change', UI.updSel));
        },
        updSel: () => {
            const c = document.querySelectorAll('.chk:checked');
            document.getElementById('selectedCount').textContent = c.length;
            document.getElementById('batchActions').style.display = c.length ? 'flex' : 'none';
        },
        stats: () => {
            const t = S.q.length;
            const d = S.q.filter(x => x.s === 'done').length;
            const f = S.q.filter(x => x.s === 'fail').length;
            const p = S.q.filter(x => x.s === 'pending').length;
            const r = S.q.filter(x => x.s === 'run').length;
            document.getElementById('totalCount').textContent = t;
            document.getElementById('doneCount').textContent = d + ' xong';
            document.getElementById('pendingCount').textContent = p;
            document.getElementById('runningCount').textContent = r;
            document.getElementById('failedCount').textContent = f;
            document.getElementById('crawledCount').textContent = S.crawled;
            document.getElementById('processingCount').textContent = S.proc.size;
            document.getElementById('duplicateCount').textContent = S.duplicates;
            document.getElementById('successCount').textContent = S.dc || 0;
            document.getElementById('failCount').textContent = S.failCount || 0;
            if (d > 0) {
                document.getElementById('avgTime').textContent = U.fmt(Math.round(S.tt / d));
            }
            if (S.start > 0 && S.run) {
                const e = Date.now() - S.start;
                document.getElementById('elapsedTime').textContent = U.fmt(e);
                const rem = S.q.filter(x => x.s === 'pending' || x.s === 'fail').length;
                if (rem > 0 && d > 0) {
                    const rate = d / (e / 1000);
                    document.getElementById('etaTime').textContent = U.fmt((rem / rate) * 1000);
                }
            }
            if (S.start > 0 && S.run) {
                const elapsed = (Date.now() - S.start) / 1000;
                if (elapsed > 0) {
                    const speed = S.crawled / elapsed;
                    document.getElementById('speedDisplay').textContent = speed.toFixed(1);
                }
            }
            if (S.q.length > 0) {
                const dc = S.q.filter(x => x.s === 'done').length;
                const pct = Math.min(100, Math.round((dc / S.q.length) * 100));
                document.getElementById('progressPercent').textContent = pct + '%';
            }
        },
        show: t => { document.getElementById('codeView').textContent = t || '--'; },
        clear: () => { document.getElementById('codeView').textContent = ''; },
        toggleLog: (show) => {
            document.getElementById('logContainer').style.display = show ? 'block' : 'none';
        }
    };
    const W = {
        process: async () => {
            if (S.run || S.pause) return;
            const crawlOn = document.getElementById('crawlToggle').checked;
            if (!crawlOn) {
                S.run = false;
                S.start = 0;
                UI.msg('⏸ Crawl đang tắt');
                UI.addLog('⏸ Crawl đang tắt');
                return;
            }
            const items = S.q.map((it, i) => ({ it, i })).filter(({ it }) => it.s === 'pending' || (it.s === 'fail' && it.retries < C.RL));
            if (!items.length) {
                S.run = false;
                S.start = 0;
                UI.msg('✅ Hoàn thành');
                UI.addLog('✅ Hoàn thành tất cả');
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
            UI.render();
            const st = performance.now();
            UI.addLog('⏳ Đang xử lý: ' + it.url);
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
                    UI.addLog('⚡ Cache: ' + it.url);
                    S.proc.delete(idx);
                    UI.render();
                    UI.stats();
                    return;
                }
                const raw = await Net.fetch(it.url);
                const mode = document.getElementById('saveMode').value;
                const content = mode === 'raw' ? raw : C.H + raw;
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
                UI.addLog('✅ Xong: ' + it.url + ' (' + U.sz(it.size) + ')');
            } catch (e) {
                it.s = 'fail';
                it.err = e.message;
                it.retries = (it.retries || 0) + 1;
                S.failCount++;
                UI.addLog('❌ Lỗi: ' + it.url);
                if (it.retries < C.RL) {
                    setTimeout(() => {
                        if (!S.pause && it.s === 'fail') {
                            it.s = 'pending';
                            UI.render();
                            W.process();
                        }
                    }, 500 * it.retries);
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
            const val = document.getElementById('urlInput').value.trim();
            const urls = Net.extract(val);
            if (!urls.length) {
                Dialog.alert('⚠️ Không có URL hợp lệ!');
                return;
            }
            const maxFiles = parseInt(document.getElementById('maxFiles').value) || 50;
            const timeout = parseInt(document.getElementById('timeoutSec').value) || 10;
            const speedMode = document.getElementById('speedMode').value;
            C.TO = timeout * 1000;
            const speedMap = { fast: 10, medium: 5, slow: 2 };
            C.MC = speedMap[speedMode] || 5;
            Dialog.alert(`🔍 Đang crawl tối đa ${maxFiles} file...`);
            UI.addLog(`🔍 Bắt đầu crawl, max ${maxFiles} files, timeout ${timeout}s`);
            let total = 0,
                dupCount = 0;
            let fileCount = 0;
            for (const u of urls) {
                if (fileCount >= maxFiles) break;
                try {
                    UI.addLog('📄 Đang crawl: ' + u);
                    const html = await Net.fetch(u);
                    const files = Net.extractAllFiles(html, u);
                    for (const file of files) {
                        if (fileCount >= maxFiles) break;
                        const n = U.norm(file.url);
                        const existing = S.q.find(x => x.url === n);
                        if (!existing) {
                            S.q.push({
                                url: n,
                                txt: null,
                                size: 0,
                                s: 'pending',
                                tm: null,
                                err: null,
                                retries: 0,
                                checksum: null,
                                fileType: file.ext
                            });
                            total++;
                            fileCount++;
                        } else {
                            dupCount++;
                        }
                    }
                    if (fileCount < maxFiles) {
                        S.q.push({
                            url: u,
                            txt: null,
                            size: 0,
                            s: 'pending',
                            tm: null,
                            err: null,
                            retries: 0,
                            checksum: null,
                            fileType: 'html'
                        });
                        total++;
                        fileCount++;
                    }
                    UI.addLog(`✅ Crawl xong: ${u} (${fileCount}/${maxFiles})`);
                    UI.render();
                    UI.stats();
                } catch (e) {
                    UI.addLog('❌ Lỗi crawl ' + u + ': ' + e.message);
                }
            }
            S.duplicates += dupCount;
            UI.msg(`🔍 Tìm thấy ${total} file (bỏ qua ${dupCount} trùng)`);
            UI.addLog(`🔍 Tổng: ${total} file, trùng ${dupCount}`);
            UI.render();
            UI.stats();
            if (total > 0) {
                S.pause = false;
                await W.process();
            }
        },
        start: async () => {
            if (S.run) {
                Dialog.alert('⚠️ Đang crawl, vui lòng đợi!');
                return;
            }
            const val = document.getElementById('urlInput').value.trim();
            const urls = Net.extract(val);
            if (!urls.length) {
                Dialog.alert('⚠️ Không có URL hợp lệ!');
                return;
            }
            let used = Number(localStorage.getItem('toolUse') || 1247);
            used += urls.length;
            localStorage.setItem('toolUse', used);
            document.getElementById('userCount').textContent = used;
            let added = 0;
            for (const u of urls) {
                const n = U.norm(u);
                if (!S.q.some(x => x.url === n) && U.valid(n)) {
                    S.q.push({
                        url: n,
                        txt: null,
                        size: 0,
                        s: 'pending',
                        tm: null,
                        err: null,
                        retries: 0,
                        checksum: null,
                        fileType: 'html'
                    });
                    added++;
                }
            }
            if (!added) {
                Dialog.alert('⚠️ Không có URL mới để crawl!');
                return;
            }
            UI.msg('📥 Thêm ' + added + ' mục');
            UI.addLog('📥 Thêm ' + added + ' URL vào hàng đợi');
            UI.render();
            UI.stats();
            S.pause = false;
            document.getElementById('pauseBtn').textContent = '⏸ Tạm dừng';
            if (window._timerInterval) clearInterval(window._timerInterval);
            window._timerInterval = setInterval(() => { UI.stats(); }, 1000);
            await W.process();
        },
        pause: () => {
            S.pause = !S.pause;
            document.getElementById('pauseBtn').textContent = S.pause ? '▶ Tiếp tục' : '⏸ Tạm dừng';
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
                document.getElementById('pauseBtn').textContent = '▶ Tiếp tục';
                if (window._timerInterval) { clearInterval(window._timerInterval);
                    window._timerInterval = null; }
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
            UI.msg('🔄 Đặt lại: ' + it.url);
            UI.addLog('🔄 Đặt lại: ' + it.url);
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
            UI.msg('📥 Tải: ' + it.url);
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
            Dialog.chooseFiles(items, (selected) => {
                if (selected.length === 1) {
                    const idx = S.q.indexOf(selected[0]);
                    W.download(idx);
                    return;
                }
                const zip = new JSZip();
                for (const it of selected) {
                    const ext = it.fileType || 'txt';
                    zip.file(`dump_${U.dm(it.url)}.${ext}`, it.txt);
                }
                zip.generateAsync({ type: 'blob' }).then(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `MiniSeres_${U.ts()}.zip`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 5000);
                    UI.msg('📦 ZIP ' + selected.length + ' file');
                    UI.addLog('📦 Tải ZIP ' + selected.length + ' file');
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
            Dialog.chooseFiles(items, (selected) => {
                if (selected.length === 1) {
                    const idx = S.q.indexOf(selected[0]);
                    W.download(idx);
                    return;
                }
                const zip = new JSZip();
                for (const it of selected) {
                    const ext = it.fileType || 'txt';
                    zip.file(`dump_${U.dm(it.url)}.${ext}`, it.txt);
                }
                zip.generateAsync({ type: 'blob' }).then(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `MiniSeres_${U.ts()}.zip`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 5000);
                    UI.msg('📦 ZIP ' + selected.length + ' file');
                    UI.addLog('📦 Tải ZIP ' + selected.length + ' file');
                }).catch(e => {
                    Dialog.alert('❌ Lỗi tạo ZIP: ' + e.message);
                });
            });
        },
        copy: () => {
            const t = document.getElementById('codeView').textContent;
            if (!t.trim()) {
                Dialog.alert('Không có nội dung để sao chép!');
                return;
            }
            navigator.clipboard.writeText(t).then(() => UI.msg('📋 Đã sao chép')).catch(() => Dialog.alert('❌ Lỗi sao chép!'));
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
                document.getElementById('urlInput').value = e.target.result;
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
            document.getElementById('logView').textContent = '';
            UI.msg('🗑 Xóa log');
        }
    };
    window._v = W.view;
    window._d = W.download;
    window._r = W.retry;
    window._del = W.clearAll;

    const init = () => {
        const load = () => {
            document.getElementById('autoProxy').checked = localStorage.getItem('autoProxy') === 'true';
            document.getElementById('spoofInfo').checked = localStorage.getItem('spoofInfo') === 'true';
            document.getElementById('retryFail').checked = localStorage.getItem('retryFail') === 'true';
            const m = localStorage.getItem('saveMode');
            if (m) document.getElementById('saveMode').value = m;
        };
        load();

        document.getElementById('startBtn').addEventListener('click', W.start);
        document.getElementById('pauseBtn').addEventListener('click', W.pause);
        document.getElementById('stopBtn').addEventListener('click', W.stop);
        document.getElementById('resetAll').addEventListener('click', W.clearAll);
        document.getElementById('clearDone').addEventListener('click', W.clearDone);
        document.getElementById('clearFailed').addEventListener('click', W.clearFailed);
        document.getElementById('copyTxt').addEventListener('click', W.copy);
        document.getElementById('packZip').addEventListener('click', W.downloadAll);
        document.getElementById('downloadSelected').addEventListener('click', W.downloadSelected);
        document.getElementById('redoFail').addEventListener('click', W.retryAll);
        document.getElementById('selAll').addEventListener('click', W.selAll);
        document.getElementById('selNone').addEventListener('click', W.selNone);
        document.getElementById('selInvert').addEventListener('click', W.selInv);
        document.getElementById('delSelected').addEventListener('click', W.batchDel);
        document.getElementById('retrySelected').addEventListener('click', W.batchRetry);
        document.getElementById('saveList').addEventListener('click', W.export);
        document.getElementById('exportResults').addEventListener('click', W.exportJson);
        document.getElementById('loadList').addEventListener('click', () => document.getElementById('filePick').click());
        document.getElementById('filePick').addEventListener('change', e => {
            W.import(e.target.files[0]);
            e.target.value = '';
        });
        document.getElementById('clearCache').addEventListener('click', () => {
            Cache.clear();
            UI.msg('🗑 Xóa cache');
            UI.addLog('🗑 Xóa cache');
        });
        document.getElementById('crawlAllBtn').addEventListener('click', W.crawlAll);
        document.getElementById('showLogBtn').addEventListener('click', () => {
            UI.toggleLog(true);
            UI.addLog('📋 Mở log');
        });
        document.getElementById('hideLogBtn').addEventListener('click', () => {
            UI.toggleLog(false);
            UI.addLog('📋 Đóng log');
        });
        document.getElementById('clearLogBtn').addEventListener('click', W.clearLog);

        document.querySelectorAll('.f-btn').forEach(b => {
            b.addEventListener('click', () => {
                document.querySelectorAll('.f-btn').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                S.f = b.dataset.f;
                UI.render();
            });
        });

        document.getElementById('autoProxy').addEventListener('change', () => localStorage.setItem('autoProxy', document.getElementById('autoProxy').checked));
        document.getElementById('spoofInfo').addEventListener('change', () => localStorage.setItem('spoofInfo', document.getElementById('spoofInfo').checked));
        document.getElementById('retryFail').addEventListener('change', () => localStorage.setItem('retryFail', document.getElementById('retryFail').checked));
        document.getElementById('saveMode').addEventListener('change', () => localStorage.setItem('saveMode', document.getElementById('saveMode').value));

        document.getElementById('userCount').textContent = localStorage.getItem('toolUse') || '1247';
        document.getElementById('bypassCount').textContent = S.bc;

        UI.render();
        UI.stats();
        UI.addLog('🚀 Khởi động MiniSeres Dump Tool');

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

        document.getElementById('customDialog').addEventListener('click', function(e) {
            if (e.target === this) Dialog.hide();
        });
    };

    document.addEventListener('DOMContentLoaded', init);
})();
