window.mountFirstStump=function(H){
'use strict';
const {app,C,$,fmt,esc,line,text,path,dot,chart}=H;
const xs=[10,12,14,20,22,24],rs=[-4,-2,-3,2,3,4],candidates=[11,13,17,21,23];
function fit(t){const left=rs.filter((_,i)=>xs[i]<=t),right=rs.filter((_,i)=>xs[i]>t),a=left.reduce((s,v)=>s+v,0)/left.length,b=right.reduce((s,v)=>s+v,0)/right.length;return{threshold:t,left:a,right:b,sse:rs.reduce((s,r,i)=>s+(r-(xs[i]<=t?a:b))**2,0)};}
const best=candidates.map(fit).sort((a,b)=>a.sse-b.sse)[0];
app.classList.add('first-stump');
app.innerHTML=`<div class="toolbar"><label>Порог температуры <input id="threshold" type="range" min="10" max="23.9" step="0.1" value="13"> <b id="threshold-label"></b></label><button id="best" class="primary">Лучший порог</button></div><div class="stump-views"><svg id="stump-plot" class="plot"></svg><svg id="stump-nodes" class="plot"></svg></div><div class="stump-candidates" id="candidates"></div><div class="readout" id="stump-score"></div><p class="foot">Точки — остатки: ответ − начальный прогноз 6. В листе берём средний остаток.<br>Проверяем середины промежутков между соседними температурами. Любой порог от 14 включительно до 20 не включительно даёт лучший разрез.</p>`;
$('candidates').innerHTML=candidates.map(t=>`<button data-threshold="${t}"><b>${t} °C</b><span>SSE = ${fmt(fit(t).sse,1)}</span></button>`).join('');
function update(){const f=fit(+$('threshold').value),optimal=Math.abs(f.sse-best.sse)<1e-8;
$('threshold-label').textContent=fmt(f.threshold,1)+' °C';
const a=chart('stump-plot',{xd:[9,25],yd:[-5,5],width:650,height:285,title:'Остатки и ответы «решающего пня»',xlabel:'Температура, °C',ylabel:'Поправка, заказы'});
a.add(`<rect x="${a.x(14)}" y="36" width="${a.x(20)-a.x(14)}" height="212" fill="${C.green}" opacity=".08"/>`);
a.add(line(a.x(9),a.y(0),a.x(25),a.y(0),C.line));
rs.forEach((r,i)=>a.add(line(a.x(xs[i]),a.y(r),a.x(xs[i]),a.y(xs[i]<=f.threshold?f.left:f.right),C.orange,'stroke-dasharray="3 3"')));
a.add(path([a.x(9),a.x(f.threshold),a.x(f.threshold),a.x(25)],[a.y(f.left),a.y(f.left),a.y(f.right),a.y(f.right)],C.blue,'stroke-width="3"'));
rs.forEach((r,i)=>a.add(dot(a.x(xs[i]),a.y(r),C.ink,5)));
a.add(line(a.x(f.threshold),36,a.x(f.threshold),248,C.green,'stroke-dasharray="5 4" stroke-width="2"'));
a.add(dot(a.x(f.threshold),43,C.green,8));
const svg=$('stump-nodes');svg.setAttribute('viewBox','0 0 440 285');
function node(x,y,w,label,color){return `<rect x="${x-w/2}" y="${y}" width="${w}" height="54" rx="9" fill="white" stroke="${color}" stroke-width="2"/>`+text(x,y+33,label,'text-anchor="middle" style="font-size:19px"');}
svg.innerHTML=text(220,24,'Условие и два ответа','text-anchor="middle" class="chart-title"')+line(220,107,110,185,C.muted)+line(220,107,330,185,C.muted)+text(145,142,'да','text-anchor="middle"')+text(295,142,'нет','text-anchor="middle"')+node(220,53,330,`Температура ≤ ${fmt(f.threshold,1)} °C?`,C.blue)+node(110,185,180,`Поправка ${fmt(f.left,2)}`,C.green)+node(330,185,180,`Поправка ${fmt(f.right,2)}`,C.green)+text(220,268,'В каждом листе — среднее его остатков','text-anchor="middle" style="font-size:15px"');
$('candidates').querySelectorAll('button').forEach(b=>b.classList.toggle('selected',+b.dataset.threshold===f.threshold));
$('stump-score').textContent=`Сумма квадратов ошибок (SSE): ${fmt(f.sse,2)}. Минимум: ${fmt(best.sse,0)}.${optimal?' Лучшее разбиение: три холодных дня и три тёплых.':' Сдвиньте порог: изменятся группы, их средние и ошибка.'}`;
window.DEMO.state={...f,best,optimal,candidates:candidates.map(fit)};
}
window.DEMO={};$('threshold').oninput=update;$('best').onclick=()=>{$('threshold').value=best.threshold;update();};
$('candidates').querySelectorAll('button').forEach(b=>b.onclick=()=>{$('threshold').value=b.dataset.threshold;update();});
const plot=$('stump-plot');plot.style.touchAction='none';plot.style.cursor='ew-resize';
function drag(e){const p=plot.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const x=p.matrixTransform(plot.getScreenCTM().inverse()).x,t=9+(x-51)/(650-16-51)*16;$('threshold').value=Math.max(10,Math.min(23.9,t));update();}
plot.onpointerdown=e=>{plot.setPointerCapture(e.pointerId);drag(e);};plot.onpointermove=e=>{if(plot.hasPointerCapture(e.pointerId))drag(e);};plot.onpointerup=e=>{if(plot.hasPointerCapture(e.pointerId))plot.releasePointerCapture(e.pointerId);};update();
};
