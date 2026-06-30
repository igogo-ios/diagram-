let DATA=null, current=null, historyStack=[], route=[], selected=new Set(), dharmaProfile=null;
const $=id=>document.getElementById(id);
const canvas=$('chart'), ctx=canvas.getContext('2d');

async function init(){
  DATA=await fetch('./data/diagrams.json').then(r=>r.json());
  current=DATA.start;
  bind(); render();
  if('serviceWorker' in navigator){navigator.serviceWorker.register('./service-worker.js').catch(()=>{});}
}
function bind(){
  $('nextBtn').onclick=next;
  $('backBtn').onclick=back;
  $('finishBtn').onclick=finish;
  $('reportBtn').onclick=showReport;
  $('newBtn').onclick=()=>{route=[];historyStack=[];current=DATA.start;selected.clear();render();};
  $('closeModal').onclick=()=>$('modal').classList.add('hidden');
  $('copyReport').onclick=()=>navigator.clipboard?.writeText($('report').innerText);
  $('calcDharma').onclick=calcDharma;
  canvas.addEventListener('click',clickCanvas);
  canvas.addEventListener('touchstart',e=>{e.preventDefault(); const t=e.touches[0]; clickCanvas({clientX:t.clientX,clientY:t.clientY});},{passive:false});
  window.addEventListener('resize',draw);
}
function diag(){return DATA.diagrams.find(d=>d.id===current)}
function render(){
  selected.clear(); const d=diag(); if(!d){showReport();return;}
  $('code').textContent=d.id; $('title').textContent=d.title; $('desc').textContent=d.description||'';
  $('progress').textContent=(DATA.diagrams.findIndex(x=>x.id===d.id)+1)+' / '+DATA.diagrams.length;
  $('info').innerHTML='<b>Пояснение:</b> '+(d.info||'Можно выбрать один или несколько секторов. Кнопка Далее сохранит выбор и откроет следующую диаграмму.');
  renderButtons(d); draw(); renderRoute();
}
function renderButtons(d){
  $('sectorButtons').innerHTML='';
  d.sectors.forEach((s,i)=>{const b=document.createElement('button');b.className='sectorBtn';b.textContent=(i+1)+'. '+s;b.onclick=()=>toggle(i);$('sectorButtons').appendChild(b);});
}
function toggle(i){ selected.has(i)?selected.delete(i):selected.add(i); updateSelected(); draw(); }
function updateSelected(){ [...document.querySelectorAll('.sectorBtn')].forEach((b,i)=>b.classList.toggle('selected',selected.has(i))); }
function resizeCanvas(){ const r=canvas.parentElement.getBoundingClientRect(); const scale=window.devicePixelRatio||1; canvas.width=Math.max(800,r.width*scale); canvas.height=Math.max(360,r.height*scale); canvas.style.width=r.width+'px'; canvas.style.height=r.height+'px'; ctx.setTransform(scale,0,0,scale,0,0); return {w:r.width,h:r.height}; }
function draw(){
  const d=diag(); if(!d)return; const {w,h}=resizeCanvas(); ctx.clearRect(0,0,w,h);
  const cx=w/2, cy=h-38, R=Math.min(w*0.46,h*0.92), r=58, n=d.sectors.length;
  ctx.lineWidth=2; ctx.strokeStyle='#141414'; ctx.fillStyle='#fff';
  for(let i=0;i<n;i++){
    const a1=Math.PI - i*Math.PI/n, a2=Math.PI - (i+1)*Math.PI/n;
    pathSector(cx,cy,r,R,a1,a2); ctx.fillStyle=selected.has(i)?'#f2eadb':'#fff'; ctx.fill(); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(cx,cy,R,Math.PI,0,false); ctx.strokeStyle='#111'; ctx.lineWidth=2.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,r,Math.PI,0,false); ctx.strokeStyle='#111'; ctx.lineWidth=2; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx-R,cy); ctx.lineTo(cx-r,cy); ctx.moveTo(cx+r,cy); ctx.lineTo(cx+R,cy); ctx.stroke();
  d.sectors.forEach((s,i)=>drawLabel(cx,cy,R*0.78,Math.PI-(i+0.5)*Math.PI/n,(i+1)+'. '+s));
}
function pathSector(cx,cy,r,R,a1,a2){ctx.beginPath();ctx.arc(cx,cy,R,a1,a2,true);ctx.lineTo(cx+r*Math.cos(a2),cy-r*Math.sin(a2));ctx.arc(cx,cy,r,a2,a1,false);ctx.closePath();}
function drawLabel(cx,cy,rad,a,text){
  const x=cx+rad*Math.cos(a), y=cy-rad*Math.sin(a); let rot=-(a-Math.PI/2);
  ctx.save(); ctx.translate(x,y);
  if(a<Math.PI/2){ rot+=Math.PI; ctx.textAlign='right'; } else { ctx.textAlign='left'; }
  ctx.rotate(rot); ctx.fillStyle='#111'; ctx.font='700 16px Georgia, serif'; ctx.textBaseline='middle';
  const max=34; const t=text.length>max?text.slice(0,max-1)+'…':text; ctx.fillText(t,0,0); ctx.restore();
}
function clickCanvas(e){
  const d=diag(); if(!d)return; const rect=canvas.getBoundingClientRect(); const x=e.clientX-rect.left,y=e.clientY-rect.top;
  const w=rect.width,h=rect.height,cx=w/2,cy=h-38,R=Math.min(w*0.46,h*0.92),r=58;
  const dx=x-cx, dy=cy-y, dist=Math.hypot(dx,dy); if(dist<r||dist>R||dy<0)return;
  let ang=Math.atan2(dy,dx); if(ang<0||ang>Math.PI)return; const idx=Math.floor((Math.PI-ang)/(Math.PI/d.sectors.length)); if(idx>=0&&idx<d.sectors.length)toggle(idx);
}
function next(){
  const d=diag(); if(!d)return; const answers=[...selected].sort((a,b)=>a-b).map(i=>d.sectors[i]);
  route.push({id:d.id,title:d.title,answers}); historyStack.push(d.id);
  if(d.next==='REPORT'||answers.includes('Завершить')){showReport();return;}
  current=d.next; render();
}
function back(){ if(!historyStack.length)return; const last=historyStack.pop(); route.pop(); current=last; render(); }
function finish(){showReport();}
function renderRoute(){ $('routeList').innerHTML=route.map(r=>`<div class="routeItem"><b>${r.id}</b> ${r.title}<br>${r.answers.length?r.answers.join(', '):'без выбора'}</div>`).join(''); }
function calcDharma(){
  const date=$('birthDate').value, time=$('birthTime').value, place=$('birthPlace').value;
  if(!date){alert('Введи дату рождения');return;}
  const dt=new Date(date+'T'+(time||'12:00'));
  const m=dt.getMonth()+1, day=dt.getDate();
  const signs=['Козерог','Водолей','Рыбы','Овен','Телец','Близнецы','Рак','Лев','Дева','Весы','Скорпион','Стрелец'];
  const idx=Math.floor(((m*30+day)%360)/30); const moon=signs[(idx+3)%12]; const sun=signs[idx];
  const nak=['Ашвини','Бхарани','Криттика','Рохини','Мригашира','Ардра','Пунарвасу','Пушья','Ашлеша','Магха','Пурва-Пхалгуни','Уттара-Пхалгуни','Хаста','Читра','Свати','Вишакха','Анурадха','Джйештха','Мула','Пурва-Ашадха','Уттара-Ашадха','Шравана','Дхаништха','Шатабхиша','Пурва-Бхадрапада','Уттара-Бхадрапада','Ревати'];
  const n=nak[(m*2+day)%27];
  dharmaProfile={date,time,place,sun,moon,nakshatra:n,lagna:signs[(idx+6)%12],summary:`Первичный автономный профиль Дхармы: Лагна ${signs[(idx+6)%12]}, Солнце ${sun}, Луна ${moon}, накшатра ${n}. Это не точный PyJHora-расчет, а офлайн-ориентир для PWA. Точная версия требует серверного Astro Engine.`};
  $('info').innerHTML='<b>Джйотиш-Дхарма:</b> '+dharmaProfile.summary;
}
function buildReport(){
  const client=$('clientName').value||'Клиент'; const req=$('clientRequest').value||'не указан';
  const flat=route.flatMap(r=>r.answers.map(a=>a));
  const counts={}; flat.forEach(a=>counts[a]=(counts[a]||0)+1);
  const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>`${k} (${v})`).join(', ')||'нет данных';
  const full=route.map((r,i)=>`${i+1}) ${r.id} - ${r.title}: ${r.answers.length?r.answers.join(', '):'без выбора'}`).join('\n');
  return `ЗАКЛЮЧЕНИЕ ATLAS CORE\n\nКлиент: ${client}\nЗапрос: ${req}\nДата: ${new Date().toLocaleString('ru-RU')}\nКоличество диаграмм: ${route.length}\n\n1. Версия для клиента\n\nДиагностика маятником показала несколько рабочих тем. Главные повторяющиеся маркеры: ${top}. Это стоит рассматривать как основные направления внимания, а не как окончательный приговор.\n\n${dharmaProfile?`Блок Джйотиш-Дхарма: ${dharmaProfile.summary}\n\n`:''}Главная задача после диагностики - выбрать один практический шаг, который можно выполнить без дополнительных ресурсов, и проверить состояние через выбранный срок. Если в маршруте появились темы Дхармы, Каббалы, И-Цзин, Рун или Таро, они используются как язык интерпретации, а не как замена решению клиента.\n\n2. Версия для диагноста\n\nПовторяющиеся темы: ${top}.\n\nРекомендация: в устной консультации отделить факты диагностики от интерпретации. Маятник выбрал сектора, ИИ только оформляет вывод. Если есть противоречия между системами, трактовать их как разные уровни: Дхарма - направление, Каббала - поток, И-Цзин - момент, Руны - действие, Таро - архетип, повреждения ауры - энергетический слой.\n\n3. Полный маршрут\n\n${full}\n\nПримечание: отчет является консультационным инструментом и не заменяет медицинские, юридические или финансовые решения специалистов.`;
}
function showReport(){ $('report').innerHTML='<div class="reportBlock">'+escapeHtml(buildReport())+'</div>'; $('modal').classList.remove('hidden'); }
function escapeHtml(s){return s.replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));}
init();
