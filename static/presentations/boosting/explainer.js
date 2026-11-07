/* Actual stump fitting in the first scene; recorded model predictions elsewhere. */
(() => {
'use strict';
const D=window.LECTURE_DATA, app=document.getElementById('app');
const scene=new URLSearchParams(location.search).get('scene')||'boost';
const C={blue:'#267fd0',orange:'#d5673d',green:'#217d68',ink:'#1a1c1f',muted:'#66707c',line:'#dfe3e8'};
const $=id=>document.getElementById(id), fmt=(v,n=2)=>Number(v).toLocaleString('ru-RU',{minimumFractionDigits:n,maximumFractionDigits:n});
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lin=(a,b,c,d)=>x=>c+(x-a)/(b-a)*(d-c);
const line=(x1,y1,x2,y2,color=C.line,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" ${extra}/>`;
const text=(x,y,t,extra='')=>`<text x="${x}" y="${y}" ${extra}>${esc(t)}</text>`;
const path=(x,y,color,extra='')=>`<path d="${x.map((v,i)=>(i?'L':'M')+v.toFixed(2)+','+y[i].toFixed(2)).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" ${extra}/>`;
const dot=(x,y,color,r=4)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" fill-opacity=".8"/>`;
function chart(id,{xd,yd,title='',xlabel='',ylabel='',width=540,height=300,xticks=4,yticks=4}){
 const svg=$(id); svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
 const x=lin(...xd,51,width-16), y=lin(...yd,height-37,36); let s=text(15,20,title,'class="chart-title"');
 for(let i=0;i<=yticks;i++){const v=yd[0]+i*(yd[1]-yd[0])/yticks; s+=line(51,y(v),width-16,y(v))+text(43,y(v)+5,fmt(v,Number.isInteger(v)?0:1),'text-anchor="end"');}
 for(let i=0;i<=xticks;i++){const v=xd[0]+i*(xd[1]-xd[0])/xticks;s+=text(x(v),height-17,fmt(v,Number.isInteger(v)?0:1),'text-anchor="middle"');}
 s+=text(width-16,height-1,xlabel,'text-anchor="end"')+text(51,35,ylabel);
 svg.innerHTML=s;return {x,y,add:t=>svg.insertAdjacentHTML('beforeend',t)};
}
function on(ids,fn){ids.forEach(id=>$(id).addEventListener('input',fn));}

function boosting(){
 app.classList.add('boost-scene');
 app.innerHTML=`<div class="toolbar"><button id="reset">Сначала</button><button id="next" class="primary">Добавить дерево</button><label>Уже добавлено деревьев <input id="step" type="range" min="0" max="12" value="0"><b id="step-label">0</b></label><label>η (скорость обучения) <select id="eta"><option value="0.2">0,2</option><option value="0.5" selected>0,5</option><option value="1">1</option></select></label></div><div class="grid"><svg class="plot" id="boost-fit"></svg><svg class="plot" id="boost-res"></svg></div><div class="readout" id="boost-stats"></div><table class="mini-table" id="res-table"></table><p class="foot">Слева: чёрные точки — ответы учебного примера, синяя линия — текущий прогноз. Справа: оранжевые точки — нужные поправки, зелёная линия — предложение следующего дерева.</p>`;
 const x=[10,12,14,20,22,24],y=[2,4,3,8,9,10];
 function stump(res){let best=null;for(let k=1;k<x.length;k++){const left=res.slice(0,k).reduce((a,b)=>a+b,0)/k,right=res.slice(k).reduce((a,b)=>a+b,0)/(x.length-k);const h=x.map((_,i)=>i<k?left:right),sse=h.reduce((s,v,i)=>s+(res[i]-v)**2,0);if(!best||sse<best.sse-1e-12)best={t:(x[k-1]+x[k])/2,left,right,h,sse};}return best;}
 function fit(m,eta){let p=x.map(()=>6),trees=[];for(let i=0;i<m;i++){let h=stump(y.map((v,j)=>v-p[j]));trees.push(h);p=p.map((v,j)=>v+eta*h.h[j]);}return {p,trees,next:stump(y.map((v,j)=>v-p[j]))};}

 function update(){const m=+$('step').value,eta=+$('eta').value,{p,trees,next}=fit(m,eta);$('step-label').textContent=m;$('next').disabled=m===12;
  const grid=[9,...x.slice(1).map((v,i)=>(v+x[i])/2),25],xx=grid.flatMap((v,i)=>i<grid.length-1?[v+1e-6,grid[i+1]-1e-6]:[]);
  const predict=z=>6+eta*trees.reduce((s,t)=>s+(z<=t.t?t.left:t.right),0);
  const a=chart('boost-fit',{xd:[9,25],yd:[0,12],height:240,title:m===0?'До деревьев: прогноз = 6 заказов':`Текущий прогноз: деревьев ${m}`,xlabel:'Температура, °C'});
  a.add(path(xx.map(a.x),xx.map(z=>a.y(predict(z))),C.blue));
  a.add(x.map((v,i)=>line(a.x(v),a.y(y[i]),a.x(v),a.y(p[i]),C.orange,'stroke-dasharray="3 3"')+dot(a.x(v),a.y(y[i]),C.ink,5)).join(''));
  const b=chart('boost-res',{xd:[9,25],yd:[-5,5],height:240,title:`Поправка следующего дерева (№ ${m+1})`,xlabel:'Температура, °C'});
  b.add(line(b.x(9),b.y(0),b.x(25),b.y(0),'#9aa6b1')+path([9,next.t,next.t,25].map(b.x),[next.left,next.left,next.right,next.right].map(b.y),C.green));
  b.add(x.map((v,i)=>dot(b.x(v),b.y(y[i]-p[i]),C.orange,5)).join(''));
  $('boost-stats').innerHTML=`<span>Добавим <b>${fmt(eta*100,0)}%</b> зелёной поправки</span><span>До ${fmt(next.t,0)} °C: <b>${fmt(eta*next.left)}</b> заказа; выше: <b>${eta*next.right>=0?'+':''}${fmt(eta*next.right)}</b></span><span>Сумма квадратов ошибок: <b>${fmt(p.reduce((s,v,i)=>s+(v-y[i])**2,0),2)}</b></span>`;
  const row=(label,values)=>'<tr><th>'+label+'</th>'+values.map(v=>`<td>${fmt(v,2)}</td>`).join('')+'</tr>';
  $('res-table').innerHTML=row('Температура, °C',x)+row('Число заказов',y)+row('Текущий прогноз, заказы',p)+row('Нужная поправка = факт − прогноз',y.map((v,i)=>v-p[i]));
  window.DEMO.state={m,eta,p,next};
 }window.DEMO={fit,stump,x,y};on(['step','eta'],update);$('next').onclick=()=>{$('step').value=+$('step').value+1;update();};$('reset').onclick=()=>{$('step').value=0;update();};update();
}
function curves(){
 app.innerHTML=`<div class="toolbar"><label>Глубина <select id="depth"><option>1</option><option selected>3</option><option>6</option></select></label><label>Скорость обучения <select id="eta"><option value="0.03">0,03</option><option value="0.1" selected>0,1</option><option value="0.3">0,3</option></select></label><label>Деревьев <input class="wide-range" id="step" type="range" min="0" max="180" value="10"><b id="m">10</b></label><button id="best">Минимум на validation</button></div><div class="grid"><svg class="plot tall" id="curve-fit"></svg><svg class="plot tall" id="curve-loss"></svg></div><div class="readout" id="curve-stats"></div><p class="hint">Найдите режим, в котором train улучшается, а validation уже ухудшается.</p><p class="foot">Учебная синтетика: 65 train / 240 validation, один зафиксированный набор. Модель — sklearn GradientBoostingRegressor.</p>`;
 const r=D.regression;
 function run(){return r.runs[$('depth').value+'/'+$('eta').value];}
 function update(){const m=+$('step').value,q=run();$('m').textContent=m;
  let a=chart('curve-fit',{xd:[-3.2,3.2],yd:[-4,4],title:'Сумма деревьев и train',xlabel:'x'});
  a.add(path(r.grid.map(a.x),r.truth.map(a.y),'#a7b0b8','stroke-dasharray="5 4"'));
  a.add(r.x.map((v,i)=>dot(a.x(v),a.y(r.y[i]),C.ink,3)).join(''));
  // A step display of predictions evaluated on the fixed grid (161 positions).
  const px=[],py=[];r.grid.forEach((v,i)=>{if(i){const mid=(r.grid[i-1]+v)/2;px.push(a.x(mid),a.x(mid));py.push(a.y(q.pred[m][i-1]),a.y(q.pred[m][i]));}px.push(a.x(v));py.push(a.y(q.pred[m][i]));});a.add(path(px,py,C.blue));
  let b=chart('curve-loss',{xd:[0,180],yd:[0,Math.ceil(Math.max(q.train[0],q.valid[0]))],title:'MSE: меньше — лучше',xlabel:'Число деревьев'});
  const steps=q.train.map((_,i)=>i);b.add(path(steps.map(b.x),q.train.map(b.y),C.blue)+path(steps.map(b.x),q.valid.map(b.y),C.orange));
  b.add(line(b.x(m),b.y(0),b.x(m),b.y(Math.max(q.train[0],q.valid[0])),C.muted,'stroke-dasharray="4 4"')+dot(b.x(m),b.y(q.train[m]),C.blue,5)+dot(b.x(m),b.y(q.valid[m]),C.orange,5));
  b.add(dot(b.x(q.best),b.y(q.valid[q.best]),C.green,6));
  $('curve-stats').innerHTML=`<span class="blue">Train MSE: <b>${fmt(q.train[m],3)}</b></span><span class="orange">Validation MSE: <b>${fmt(q.valid[m],3)}</b></span><span class="green">Лучший шаг: <b>${q.best}</b></span><span class="muted">Серый пунктир: функция без шума</span>`;window.DEMO.state={m,key:$('depth').value+'/'+$('eta').value,train:q.train[m],valid:q.valid[m],best:q.best};
 }window.DEMO={};on(['depth','eta','step'],update);$('best').onclick=()=>{$('step').value=run().best;update();};update();
}
function logit(){
 app.innerHTML=`<div class="toolbar"><label>Правильный y <select id="y"><option value="1">1</option><option value="0">0</option></select></label><label>Score F <input class="wide-range" id="score" type="range" min="-6" max="6" step="0.01" value="0"><b id="f-label">0</b></label><button id="grad-step" class="primary">F ← F + 0,5 · (y − p)</button><button id="reset">Сначала</button></div><div class="logit-layout"><svg class="plot tall" id="sigmoid"></svg><div class="logit-card" id="logit-stats"></div></div><div class="readout" id="direction"></div><p class="hint">Одинаковая метка, разная уверенность: у кого сильнее сигнал для исправления?</p><p class="foot">Здесь меняем score одного объекта. В бустинге дерево приближает сигналы сразу многих объектов; значения листьев могут дополнительно оптимизироваться.</p>`;
 const sig=x=>1/(1+Math.exp(-x));
 function update(){const f=+$('score').value,y=+$('y').value,p=sig(f),g=y-p,loss=-(y*Math.log(p)+(1-y)*Math.log(1-p));$('f-label').textContent=fmt(f);
  let a=chart('sigmoid',{xd:[-6,6],yd:[0,1],title:'p = 1 / (1 + exp(−F))',xlabel:'Сумма деревьев F',yticks:2,xticks:6});
  const xs=Array.from({length:121},(_,i)=>-6+i*.1);a.add(path(xs.map(a.x),xs.map(x=>a.y(sig(x))),C.blue)+line(a.x(f),a.y(0),a.x(f),a.y(p),C.orange,'stroke-dasharray="5 4"')+dot(a.x(f),a.y(p),C.orange,7));
  $('logit-stats').innerHTML=`<h3>Один обучающий объект: y = ${y}</h3><p>Вероятность p<br><b class="stat blue">${fmt(p,3)}</b></p><p>Сигнал y − p<br><b class="stat orange">${g>0?'+':''}${fmt(g,3)}</b></p><p>Logloss: <b>${fmt(loss,3)}</b></p>`;
  $('direction').innerHTML=`<b>Нужно ${g>0?'увеличить':'уменьшить'} F</b><span>Следующий учебный шаг: ${fmt(f)} → ${fmt(f+.5*g)}</span>`;window.DEMO.state={f,y,p,g,loss};
 }window.DEMO={};on(['score','y'],update);$('grad-step').onclick=()=>{const s=window.DEMO.state;$('score').value=Math.max(-6,Math.min(6,s.f+.5*s.g));update();};$('reset').onclick=()=>{$('score').value=0;update();};update();
}

function boundary(){
 const d=window.TEACHING_EXAMPLES.boundary;
 app.innerHTML=`<div class="toolbar"><label>Число деревьев <input id="stage" type="range" min="0" max="9" value="1"><b id="count"></b></label><button id="next" class="primary">Добавить деревья</button><label>Глубина <select id="depth"><option>1</option><option selected>2</option><option>5</option></select></label><label>Точки <select id="points"><option value="train">Обучение</option><option value="valid">Проверка</option></select></label></div><div class="boundary-layout"><canvas id="boundary-canvas" width="740" height="430" aria-label="Карта вероятностей и граница классов"></canvas><div><svg id="boundary-loss" class="plot"></svg><p class="caption">Фон: вероятность класса 1.<br>Синий → 0, оранжевый → 1.<br>Чёрная линия: p = 0,5.<br>Цвет точки: настоящий класс.</p></div></div><div class="readout" id="boundary-stats"></div><p class="foot">Учебные данные «две луны»: 200 обучающих и 120 проверочных объектов. Скорость обучения 0,1. Граница приближена по сетке; в нуле деревьев всем назначается p = 0,5.</p>`;
 function update(){const k=+$('stage').value,depth=$('depth').value,runs=d.runs[depth],r=runs[k],set=$('points').value;$('count').textContent=r.n;$('next').disabled=k===9;
  const canvas=$('boundary-canvas'),ctx=canvas.getContext('2d'),W=740,H=430,L=45,T=25,PW=675,PH=365,nx=d.gx.length,ny=d.gy.length;
  const sx=v=>L+(v-d.gx[0])/(d.gx[nx-1]-d.gx[0])*PW,sy=v=>T+PH-(v-d.gy[0])/(d.gy[ny-1]-d.gy[0])*PH;
  ctx.clearRect(0,0,W,H);ctx.font='17px system-ui';let segments=0;
  for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){
   const values=[r.p[j*nx+i],r.p[j*nx+i+1],r.p[(j+1)*nx+i+1],r.p[(j+1)*nx+i]],p=values.reduce((a,b)=>a+b)/4;
   ctx.fillStyle=`rgb(${Math.round(202+43*p)},${Math.round(222-27*p)},${Math.round(245-76*p)})`;
   ctx.fillRect(sx(d.gx[i]),sy(d.gy[j+1]),PW/(nx-1)+.5,PH/(ny-1)+.5);
  }
  ctx.strokeStyle='#29343f';ctx.lineWidth=1.8;ctx.beginPath();
  for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){
   const ps=[[d.gx[i],d.gy[j]],[d.gx[i+1],d.gy[j]],[d.gx[i+1],d.gy[j+1]],[d.gx[i],d.gy[j+1]]],v=[r.p[j*nx+i],r.p[j*nx+i+1],r.p[(j+1)*nx+i+1],r.p[(j+1)*nx+i]],cross=[];
   for(let a=0;a<4;a++){let b=(a+1)%4;if((v[a]<.5)!==(v[b]<.5)){let t=(.5-v[a])/(v[b]-v[a]);cross.push([sx(ps[a][0]+t*(ps[b][0]-ps[a][0])),sy(ps[a][1]+t*(ps[b][1]-ps[a][1]))]);}}
   for(let a=0;a+1<cross.length;a+=2){ctx.moveTo(...cross[a]);ctx.lineTo(...cross[a+1]);segments++;}
  }ctx.stroke();
  d[set].forEach((p,i)=>{ctx.beginPath();ctx.arc(sx(p[0]),sy(p[1]),3.8,0,2*Math.PI);ctx.fillStyle=d['y'+set][i]?C.orange:C.blue;ctx.fill();ctx.strokeStyle='white';ctx.lineWidth=.9;ctx.stroke();});
  ctx.fillStyle=C.ink;ctx.fillText('Признак 2',L,18);ctx.fillText('Признак 1',W-100,H-5);ctx.fillStyle=C.muted;
  for(const v of [-1,0,1,2])ctx.fillText(v,sx(v)-4,T+PH+22);for(const v of [-1,0,1])ctx.fillText(v,12,sy(v)+5);
  const a=chart('boundary-loss',{xd:[0,100],yd:[0,.8],title:'Logloss: меньше — лучше',xlabel:'Деревьев',width:420,height:285});
  a.add(path(runs.map(z=>a.x(z.n)),runs.map(z=>a.y(z.train_loss)),C.blue)+path(runs.map(z=>a.x(z.n)),runs.map(z=>a.y(z.valid_loss)),C.orange)+dot(a.x(r.n),a.y(r.valid_loss),C.orange,5));
  $('boundary-stats').innerHTML=`<span class="blue">Обучение: точность <b>${fmt(100*r.train_acc,1)}%</b></span><span class="orange">Проверка: точность <b>${fmt(100*r.valid_acc,1)}%</b></span><span>Проверочная Logloss: <b>${fmt(r.valid_loss,3)}</b></span>`;
  window.DEMO.state={n:r.n,depth:+depth,segments,train:r.train_acc,valid:r.valid_acc};
 }window.DEMO={};on(['stage','depth','points'],update);$('next').onclick=()=>{$('stage').value=Math.min(9,+$('stage').value+1);update();};update();
}
function permutation(){
 const d=window.TEACHING_EXAMPLES.orders;let repeat=-1;app.classList.add('permutation-scene');
 app.innerHTML=`<p class="permutation-intro">Учебный спрос: CatBoost обучен на 600 днях, проверяем на других 240. Среди признаков есть точная копия температуры и случайный номер.</p><div class="toolbar"><label>Перемешать <select id="feature">${d.permutation.map((r,i)=>`<option value="${i}" ${i===1?'selected':''}>${esc(r.label)}</option>`).join('')}</select></label><button id="shuffle" class="primary">Перемешать значения</button><button id="reset">Исходные данные</button></div><p class="permutation-steps"><b>Ошибка до → перемешать столбец → ошибка после.</b> Разность — перестановочная важность.<br>Модель и настоящие заказы фиксированы. При выборе пары переносим оба значения вместе.</p><table id="perm-table" class="mini-table permutation-table"></table><div class="readout" id="perm-stats"></div><p id="perm-explain" class="hint"></p><p class="foot" id="perm-caveat"></p><p class="foot">Показаны 3 из 240 дней; RMSE — по всем 240, в заказах. 12 перестановок рассчитаны заранее. Далее эта же модель — в ICE.</p>`;
 function update(){const g=d.permutation[+$('feature').value],t=repeat<0?null:g.trials[repeat],value=row=>g.columns.map(c=>fmt(row[c],1)).join(' / ');
  $('perm-table').innerHTML=`<tr><th>День</th><th>Признак: было → стало</th><th>Настоящие заказы</th><th>Прогноз: был → стал</th></tr>`+d.rows.slice(0,3).map((r,i)=>`<tr><td>${i+1}</td><td>${value(r)} → <b>${value(t?t.after[i]:r)}</b></td><td>${fmt(d.actual[i],1)}</td><td>${fmt(d.pred[i],1)} → <b>${fmt(t?t.pred[i]:d.pred[i],1)}</b></td></tr>`).join('');
  $('perm-stats').innerHTML=`<span>RMSE до: <b>${fmt(d.base_rmse,2)}</b></span><span>После: <b>${fmt(t?t.rmse:d.base_rmse,2)}</b></span><span>Увеличение ошибки: <b>${fmt(t?t.delta:0,2)}</b> заказа</span>`;
  $('perm-explain').textContent=t?`Перестановка ${repeat+1} из 12. Среднее увеличение RMSE для этой группы: ${fmt(g.mean,2)} заказа.`:'Сначала сравните исходные значения. Затем нарушьте их связь с правильными ответами.';
  $('perm-caveat').textContent=g.columns.length>1?'Температура и копия меняются согласованно. Совместный ущерб не обязан равняться сумме индивидуальных.':'Один столбец может подменяться другим. Сравните температуру, её копию и пару вместе; перемешивание одного нарушает их связь.';
  window.DEMO.state={repeat,group:g.label,delta:t?t.delta:0,base:d.base_rmse,mean:g.mean};
 }window.DEMO={};$('feature').oninput=()=>{repeat=-1;update();};$('shuffle').onclick=()=>{repeat=(repeat+1)%12;update();};$('reset').onclick=()=>{repeat=-1;update();};update();
}
function importance(){
 const d=window.TEACHING_EXAMPLES.orders;
 app.innerHTML=`<div class="toolbar"><label>Вопрос к модели <select id="method"><option value="pvc">Встроенная важность CatBoost</option><option value="permutation">Ухудшение RMSE при перестановке</option><option value="shap">Средний размер вклада SHAP</option></select></label></div><svg class="plot" id="importance-chart"></svg><div class="readout" id="imp-stats"></div><p class="hint" id="imp-hint"></p><p class="foot">Одна модель CatBoost, 600 обучающих и 240 проверочных дней. Дублирующая температура равна исходной. Случайный номер с целевой функцией не связан.</p>`;
 function update(){const key=$('method').value;let rows=key==='permutation'?d.permutation.map(g=>({label:g.label,v:g.mean})):d.features.map((f,i)=>({label:f,v:(key==='pvc'?d.pvc:d.mean_abs_shap)[i]}));rows.sort((a,b)=>b.v-a.v);
  const max=Math.max(...rows.map(r=>r.v))*1.18,min=Math.min(0,...rows.map(r=>r.v)),x=lin(min,max,350,1030),svg=$('importance-chart');svg.setAttribute('viewBox','0 0 1100 348');let s='';
  for(let i=0;i<=4;i++){const v=min+(max-min)*i/4;s+=line(x(v),15,x(v),310)+text(x(v),337,fmt(v,1),'text-anchor="middle"');}
  rows.forEach((r,i)=>{const y=25+i*39;s+=text(330,y+17,r.label,'text-anchor="end"')+`<rect x="${Math.min(x(0),x(r.v))}" y="${y}" width="${Math.max(1,Math.abs(x(r.v)-x(0)))}" height="23" fill="${r.label.includes('Температура')?C.orange:C.blue}" rx="3"/>`+text(x(r.v)+9,y+17,fmt(r.v,2));});svg.innerHTML=s;
  $('imp-stats').textContent=key==='pvc'?'PredictionValuesChange: доли суммы важностей, %':key==='permutation'?'Увеличение RMSE на проверке, заказы; среднее 12 перестановок':'Среднее |SHAP| по 240 проверочным дням, заказы';
  $('imp-hint').textContent=key==='permutation'?'Сравните температуру, её копию и их совместную перестановку.':key==='pvc'?'Это характеристика обученной модели. Она не измеряет долю правильных прогнозов.':'Модуль берём до усреднения: положительные и отрицательные вклады не гасят друг друга.';
  window.DEMO.state={method:key,rows};
 }window.DEMO={};on(['method'],update);update();
}
function shap(){
 const d=window.TEACHING_EXAMPLES.orders;
 app.innerHTML=`<div class="toolbar"><label>Проверочный день <select id="object">${d.examples.map((r,i)=>`<option value="${i}">${r.id}</option>`).join('')}</select></label></div><div class="shap-layout"><svg class="plot" id="shap-chart"></svg><div id="shap-details"></div></div><div class="readout" id="shap-sum"></div><p class="foot">Native CatBoost SHAP для регрессии: база и вклады выражены в заказах. Сумма объясняет прогноз модели; настоящий результат дня показан отдельно.</p>`;
 function update(){const e=d.examples[+$('object').value],parts=d.features.map((label,i)=>({label,v:e.shap[i]})).sort((a,b)=>Math.abs(b.v)-Math.abs(a.v));let current=e.base,rows=[{label:'Базовый прогноз',from:0,to:e.base,total:true}];
  for(const r of parts){rows.push({label:r.label,from:current,to:current+r.v});current+=r.v;}rows.push({label:'Итоговый прогноз',from:0,to:e.prediction,total:true});
  const min=Math.min(0,...rows.flatMap(r=>[r.from,r.to])),max=Math.max(...rows.flatMap(r=>[r.from,r.to]))*1.1,x=lin(min,max,215,655),svg=$('shap-chart');svg.setAttribute('viewBox','0 0 700 365');let s=text(12,22,'Вклады в прогноз количества заказов','class="chart-title"');
  rows.forEach((r,i)=>{const y=42+i*35,v=r.to-r.from,color=r.total?(i?C.green:'#8b98a4'):(v>=0?C.orange:C.blue);s+=text(204,y+17,r.label,'text-anchor="end" style="font-size:14px"')+`<rect x="${Math.min(x(r.from),x(r.to))}" y="${y}" width="${Math.max(1,Math.abs(x(r.to)-x(r.from)))}" height="23" fill="${color}"/>`+text(695,y+17,(i&& !r.total&&v>0?'+':'')+fmt(v,1),'text-anchor="end" style="font-size:13px"');if(i<rows.length-2)s+=line(x(r.to),y+23,x(r.to),y+35,C.muted,'stroke-dasharray="2 2"');});
  for(let i=0;i<=4;i++){let v=min+(max-min)*i/4;s+=text(x(v),357,fmt(v,0),'text-anchor="middle"');}svg.innerHTML=s;
  $('shap-details').innerHTML=`<div class="muted">Прогноз модели, заказы</div><div class="prob">${fmt(e.prediction,1)}</div><div>Настоящий результат: <b>${fmt(e.actual,1)}</b></div><div class="features">${d.features.slice(0,4).map((f,i)=>`<div><span>${f}:</span> ${fmt(e.values[i],1)}</div>`).join('')}</div><div class="bar-note"><span class="orange">■ Повышает прогноз</span><br><span class="blue">■ Понижает прогноз</span></div>`;
  $('shap-sum').textContent=`База ${fmt(e.base,2)} + сумма вкладов ${fmt(e.prediction-e.base,2)} = прогноз ${fmt(e.prediction,2)} заказа`;
  window.DEMO.state={id:e.id,sum:current,prediction:e.prediction,base:e.base};
 }window.DEMO={};on(['object'],update);update();
}
const advanced=()=>window.mountWorkshop(scene,{app,C,$,fmt,esc,line,text,path,dot,chart,on,lin});
const treeScene=()=>window.mountTreeScene(scene,{app,C,$,fmt,esc,line,text,path,dot,chart,on,lin});
const investigation=()=>window.mountInvestigation(scene,{app,C,$,fmt,esc,line,text,path,dot,chart,on,lin});
const optimization=()=>window.mountOptimization(scene,{app,C,$,fmt,esc,line,text,path,dot,chart,on,lin});
const bikeLesson=()=>window.mountBikeLesson(scene,{app,C,$,fmt,esc,line,text,path,dot,chart,on,lin});
const modelInspection=()=>window.mountModelInspection(scene,{app,C,$,fmt,esc,line,text,path,dot,chart,on,lin});
const catboostImportance=()=>window.mountCatboostImportance({app,$,fmt,esc,C,line,text});
const firstStump=()=>window.mountFirstStump({app,C,$,fmt,esc,line,text,path,dot,chart});
const classificationBoost=()=>window.mountClassificationBoost({app,$,fmt,C});
const scenes={classboost:classificationBoost,firststump:firstStump,bikefour:bikeLesson,catboostpvc:catboostImportance,catboosttree:modelInspection,biketree:modelInspection,forest:modelInspection,bikerank:bikeLesson,bikeperm:bikeLesson,bikeablation:bikeLesson,bikeice:bikeLesson,bikecalc:bikeLesson,bikeshap:bikeLesson,descent:optimization,growth:optimization,inspect:investigation,auditperm:investigation,auditice:investigation,auditcalc:investigation,auditshap:investigation,audittransfer:investigation,boost:boosting,curves,logit,boundary,permutation,importance,shap,comparison:advanced,gradient:treeScene,depth:treeScene,ice:advanced,coalitions:advanced,transfer:advanced,realshap:advanced};
if(!scenes[scene])throw new Error('Unknown scene: '+scene);
scenes[scene]();document.documentElement.dataset.ready='true';

})();
