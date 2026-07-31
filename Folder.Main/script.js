const output=document.getElementById('output');
const input=document.getElementById('cmd-input');
let history=[];
let historyIndex=-1;
let isProcessing=false;

function typeText(text,callback,delay=25){
let i=0;
isProcessing=true;
const interval=setInterval(()=>{
if(i<text.length){
output.textContent+=text[i];
output.scrollTop=output.scrollHeight;
i++;
}else{
clearInterval(interval);
isProcessing=false;
if(callback)callback();
}
},delay);
}

function addLine(text,className=''){
const line=document.createElement('div');
line.className=className;
line.textContent=text;
output.appendChild(line);
output.scrollTop=output.scrollHeight;
}

function showHelp(){
const help=`
╔═══════════════════════════════════════╗
║     TERMINAL DUMP TOOL v2.0          ║
╠═══════════════════════════════════════╣
║ help     - Hiển thị trợ giúp         ║
║ dump url - Tải source của website    ║
║ clear    - Xóa màn hình              ║
║ download - Tải file đã dump          ║
║ exit     - Thoát (reset)             ║
╚═══════════════════════════════════════╝
`;
addLine(help,'info');
}

let dumpedContent='';

function dumpWebsite(url){
addLine(`[+] Đang phân tích ${url}...`,'info');
const proxy='https://api.allorigins.win/raw?url=';
fetch(proxy+encodeURIComponent(url))
.then(r=>{
if(!r.ok)throw new Error('Không thể truy cập');
return r.text();
})
.then(html=>{
dumpedContent=html;
const lines=html.split('\n');
addLine(`[+] Thành công! ${lines.length} dòng`,'success');
typeText(html.slice(0,500)+'\n... (còn tiếp) ...\n',()=>{
addLine('[+] Dump hoàn tất! Gõ "download" để lưu file','success');
},5);
})
.catch(e=>{
addLine('[-] Lỗi: '+e.message,'error');
});
}

function downloadFile(){
if(!dumpedContent){
addLine('[-] Chưa có dữ liệu để tải. Hãy dump trước!','error');
return;
}
const blob=new Blob([dumpedContent],{type:'text/html'});
const a=document.createElement('a');
a.href=URL.createObjectURL(blob);
a.download='dump_'+Date.now()+'.html';
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
addLine('[+] Tải xuống thành công!','success');
}

function processCommand(cmd){
const parts=cmd.trim().split(/\s+/);
const command=parts[0].toLowerCase();
const arg=parts.slice(1).join(' ');

if(!cmd.trim()){
addLine('','');
return;
}

history.push(cmd);
historyIndex=history.length;

switch(command){
case 'help':
showHelp();
break;
case 'dump':
if(!arg){
addLine('[-] Cú pháp: dump <url>','error');
}else{
if(!arg.startsWith('http://')&&!arg.startsWith('https://')){
addLine('[-] URL phải bắt đầu bằng http:// hoặc https://','error');
}else{
dumpWebsite(arg);
}
}
break;
case 'download':
downloadFile();
break;
case 'clear':
output.innerHTML='';
break;
case 'exit':
dumpedContent='';
output.innerHTML='';
addLine('[+] Đã reset. Gõ help để xem hướng dẫn.','info');
break;
default:
addLine('[-] Lệnh không tồn tại: '+command,'error');
}
}

input.addEventListener('keydown',(e)=>{
if(e.key==='Enter'&&!isProcessing){
const cmd=input.value;
if(cmd.trim()){
addLine('$ '+cmd,'');
processCommand(cmd);
}
input.value='';
}
if(e.key==='ArrowUp'){
e.preventDefault();
if(historyIndex>0){
historyIndex--;
input.value=history[historyIndex]||'';
}
}
if(e.key==='ArrowDown'){
e.preventDefault();
if(historyIndex<history.length-1){
historyIndex++;
input.value=history[historyIndex]||'';
}else{
historyIndex=history.length;
input.value='';
}
}
});

document.addEventListener('click',()=>input.focus());
showHelp();
addLine('[+] Hệ thống sẵn sàng. Gõ help để bắt đầu.','success');
