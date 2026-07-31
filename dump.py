import requests
import time
import os
import re
from datetime import datetime
from urllib.parse import urlparse, urljoin
from collections import deque

class MnsrCrawler:
    def __init__(self):
        self.R = '\033[0m'
        self.T = '\033[95m'
        self.I = '\033[94m'
        self.W = '\033[93m'
        self.S = '\033[92m'
        self.E = '\033[91m'

        self.total = self.ok = self.skip = self.fail = 0
        self.size = 0
        self.visited = set()
        self.queue = deque()
        self.max_file = 500
        self.max_depth = 5
        self.domain = ""
        self.root = "/storage/emulated/0/Download/MiniSeres/"
        self.min_size = 1024
        self.proxy = [None, 'https://corsproxy.io/?url=', 'https://api.allorigins.win/raw?url=']
        self.name_list = {}
        self.mode = "smart"

    def fsize(self, s):
        if s < 1024:
            return f"{s}B"
        if s < 1048576:
            return f"{s/1024:.0f}KB"
        return f"{s/1048576:.1f}MB"

    def fname(self, url):
        p = urlparse(url).path
        if not p or p.endswith('/'):
            base = "index.html"
        else:
            n = os.path.basename(p)
            if '.' not in n:
                n += ".html"
            n = re.sub(r'[<>:"/\\|?*]', '_', n.strip())
            base = re.sub(r'\s+', '_', n)[:150]
        name, ext = os.path.splitext(base)
        if base not in self.name_list:
            self.name_list[base] = 1
            return base
        new = f"{name}_{self.name_list[base]}{ext}"
        self.name_list[base] += 1
        return new

    def get_link(self, html, base):
        out = set()
        pat = [r'href=["\']([^"\'?#]+)', r'src=["\']([^"\'?#]+)', r'https?://[^\s<>"\']+']
        for p in pat:
            for m in re.findall(p, html):
                u = urljoin(base, m.split('#')[0])
                if u.startswith('http') and self.domain in u and u not in self.visited:
                    out.add(u)
        return list(out)

    def get(self, url):
        hd = {'User-Agent': 'Mozilla/5.0 Chrome/128.0.0.0'}
        for px in self.proxy:
            try:
                r = requests.get((px+url)if px else url, headers=hd, timeout=8, verify=False)
                if r.status_code == 200:
                    return {'ok':1, 'len':len(r.content), 'txt':r.text}
            except:
                pass
        return {'ok':0, 'len':0, 'txt':''}

    def sort_queue(self):
        if not self.queue:
            return None
        tmp = list(self.queue)
        if self.mode == "small":
            tmp.sort(key=lambda x:len(x[0]))
        elif self.mode == "big":
            tmp.sort(key=lambda x:-len(x[0]))
        elif self.mode == "deep":
            tmp.sort(key=lambda x:-x[1])
        self.queue = deque(tmp)
        return self.queue.popleft()

    def gui(self):
        print(f"\n{self.T}{'='*50}{self.R}")
        print(f"{self.T}        MNSR WEBSITE DUMPER v7.4{self.R}")
        print(f"{self.T}{'='*50}{self.R}")
        print(f"{self.I}[HƯỚNG DẪN SỬ DỤNG]{self.R}")
        print(f"{self.W}1. NHẬP URL:{self.R} Địa chỉ trang web cần lấy dữ liệu")
        print(f"{self.W}2. SỐ FILE TỐI ĐA:{self.R} Giới hạn số lượng file tải (mặc định 500)")
        print(f"{self.W}3. ĐỘ SÂU QUÉT:{self.R} Đi theo liên kết bao nhiêu lớp (mặc định 5)")
        print(f"{self.W}4. CHỌN KIỂU QUÉT [1-4]:{self.R}")
        print(f"   {self.W}1{self.R} → Thông minh: Cân bằng, phù hợp hầu hết trường hợp")
        print(f"   {self.W}2{self.R} → Link ngắn trước: Ưu tiên trang chính, danh mục trước")
        print(f"   {self.W}3{self.R} → Link dài trước: Ưu tiên trang chi tiết, nội dung sâu ")
        print(f"   {self.W}4{self.R} → Sâu trước: Quét hết một nhánh rồi mới sang nhánh khác")
        print(f"{self.I}[QUY TẮC LƯU DỮ LIỆU]{self.R}")
        print(f"• Tất cả file lưu chung 1 thư mục: Download/MiniSeres/")
        print(f"• Link không đuôi tự thêm .html")
        print(f"• Tên trùng tự đánh số _1 _2 _3...")
        print(f"• Tự bỏ file nhỏ hơn 1KB")
        print(f"{self.T}{'='*50}{self.R}\n")

    def run(self, url, maxf, maxd, mode):
        self.max_file = maxf
        self.max_depth = maxd
        self.mode = mode
        self.domain = urlparse(url).netloc
        start = time.time()

        if not os.path.exists(self.root):
            os.makedirs(self.root, exist_ok=True)
            print(f"{self.I}đã Tạo thư mục: Download/MiniSeres/{self.R}")
        save_dir = os.path.join(self.root, f"Dump_{self.domain}_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        os.makedirs(save_dir, exist_ok=True)

        print(f"{self.I}Đang xử lý: {self.W}{url}{self.R}")
        print(f"{self.I}Lưu tại: {self.W}{save_dir}{self.R}")
        print(f"{self.T}Live...{self.R}")

        self.queue.append((url, 0))
        while self.queue and len(self.visited) < self.max_file:
            item = self.sort_queue()
            if not item:
                break
            u, d = item
            if u in self.visited or d > self.max_depth:
                continue
            self.visited.add(u)
            self.total += 1

            res = self.get(u)
            name = self.fname(u)
            if res['ok']:
                if res['len'] < self.min_size:
                    self.skip += 1
                    print(f"  {self.W}[{self.total}/{self.max_file}] {name} → Bỏ qua {self.fsize(res['len'])}{self.R}")
                    if d < maxd:
                        for l in self.get_link(res['txt'], u):
                            if l not in self.visited and l not in [q[0] for q in self.queue]:
                                self.queue.append((l, d+1))
                    continue
                path = os.path.join(save_dir, name)
                with open(path, 'w', encoding='utf-8', errors='ignore')as f:
                    f.write(f'<!-- Nguồn: {u} -->\n\n{res["txt"]}')
                self.ok += 1
                self.size += res['len']
                print(f"  {self.S}[{self.total}/{self.max_file}] {name} → OK {self.fsize(res['len'])}{self.R}")
                if d < maxd and len(self.visited) < self.max_file:
                    for l in self.get_link(res['txt'], u):
                        if l not in self.visited and l not in [q[0] for q in self.queue]:
                            self.queue.append((l, d+1))
            else:
                self.fail += 1
                print(f"  {self.E}[{self.total}/{self.max_file}] {name} → LỖI TẢI{self.R}")

        tg = time.time() - start
        print(f"\n{self.T}{'='*50}{self.R}")
        print(f"{self.S}HOÀN THÀNH{self.R}")
        print(f"{self.I}Tổng: {self.W}{self.total}{self.R} | {self.S}OK:{self.ok}{self.R} | {self.W}Bỏ:{self.skip}{self.R} | {self.E}Lỗi:{self.fail}{self.R}")
        print(f"{self.I}Tổng dung lượng: {self.W}{self.fsize(self.size)}{self.R}")
        print(f"{self.I}Tổng thời gian: {self.W}{tg:.1f}s{self.R}")
        print(f"{self.I}Thư mục: {self.W}{save_dir}{self.R}")
        print(f"{self.T}{'='*50}{self.R}")

        with open(os.path.join(save_dir, 'ThongKe.txt'), 'w', encoding='utf-8')as f:
            f.write(f"Nguồn: {url}\n")
            f.write(f"Bắt đầu: {datetime.fromtimestamp(start).strftime('%d/%m/%Y %H:%M:%S')}\n")
            f.write(f"Hoàn thành: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}\n")
            f.write(f"Tổng: {self.total} | OK: {self.ok} | Bỏ: {self.skip} | Lỗi: {self.fail}\n")
            f.write(f"Tổng kích thước: {self.fsize(self.size)}\n")

if __name__ == "__main__":
    import urllib3
    urllib3.disable_warnings()
    app = MnsrCrawler()
    app.gui()

    url = input(f"{app.I}Nhập URL trang web: {app.R}").strip()
    if not url.startswith('http'):
        url = f"https://{url}"
    maxf = input(f"{app.I}Số file tối đa [500]: {app.R}").strip() or "500"
    maxd = input(f"{app.I}Độ sâu quét [5]: {app.R}").strip() or "5"
    sel = input(f"{app.I}Chọn kiểu quét [1-4] [1]: {app.R}").strip() or "1"
    map_sel = {"1":"smart", "2":"small", "3":"big", "4":"deep"}
    app.run(url, int(maxf), int(maxd), map_sel[sel])
