/* Exact fitted trees for depth; first-order boosting is computed live below. */
window.mountTreeScene=function(scene,H){
'use strict';
const {app,C,$,fmt,esc,line,text,path,dot,chart,on}=H;
app.classList.add('workshop-scene',scene+'-scene');
window.DEMO={};

function depth(){
 const cb=window.CLASSIFICATION_BOOST,d={regression:window.TREE_DEPTH.regression,classification:{x:cb.train,y:cb.ytrain,bounds:cb.bounds,models:[1,2,3].map(depth=>cb.runs[depth].trees[0])}},task=new URLSearchParams(location.search).get('task')==='classification'?'classification':'regression';let selected={type:task,depth:3},rx=5.5,cp=[.5,.5];
 app.innerHTML=`<div class="toolbar"><label>Показать <select id="depth-view"><option value="regression">Регрессия: дерево + функция</option><option value="classification">Классификация: дерево поправок</option><option value="plots">Оба примера: графики</option><option value="trees">Оба примера: деревья</option></select></label><b>Глубина = максимум проверок на пути до листа</b></div><div class="depth-grid">${[1,2,3].map(n=>`<div><h3>Глубина ${n} · до ${2**n} листьев</h3><svg id="depth-reg-${n}" role="img"></svg><svg id="depth-cls-${n}" role="img"></svg></div>`).join('')}</div><div class="readout" id="depth-path"></div><p class="foot" id="depth-legend"></p>`;
 $('depth-view').value=task;
 function leafFor(model,point){return model.leaves.find(l=>l.rules.every(r=>r.left?point[r.feature]<=r.threshold:point[r.feature]>r.threshold));}
 function treeSvg(svg,model,isClass,selectedLeaf){
  svg.setAttribute('viewBox','0 0 360 180');let s=text(8,20,(isClass?'Поправки к F':'Регрессия')+' · листьев '+model.leaf_count,'class="chart-title"');
  const active=new Set([0]);let node=0,pt=isClass?cp:[rx];
  while(model.nodes[node].left>=0){const n=model.nodes[node];node=pt[n.feature]<=n.threshold?n.left:n.right;active.add(node);}
  function walk(i,left,right){const n=model.nodes[i],xx=(left+right)/2,yy=42+n.depth*40,isLeaf=n.left<0;
   if(!isLeaf){for(const [child,a,b] of [[n.left,left,xx],[n.right,xx,right]]){const cx=(a+b)/2,cy=42+model.nodes[child].depth*40;s+=line(xx,yy+12,cx,cy-13,active.has(child)?C.green:'#ced5dc',active.has(child)?'stroke-width="2.5"':'');}walk(n.left,left,xx);walk(n.right,xx,right);}
   const label=isLeaf?(isClass?(n.value>0?'+':'')+fmt(n.value,2):fmt(n.value,1)):(isClass?'x'+(n.feature+1):'x')+' ≤ '+fmt(n.threshold,isClass?2:1)+'?';
   s+=`<g ${isLeaf?'class="depth-leaf" data-leaf="'+i+'"':''}><rect x="${xx-(isLeaf?20:40)}" y="${yy-12}" width="${isLeaf?40:80}" height="24" rx="3" fill="${active.has(i)?'#e5f3ee':'#f4f6f8'}" stroke="${i===selectedLeaf.node?C.green:'#cbd4dc'}"/>`+text(xx,yy+5,label,'text-anchor="middle" style="font-size:14px;fill:#25323e"')+`<title>${esc(isLeaf?'Лист: '+label:'Проверка: '+label+'; влево — да, вправо — нет')}</title></g>`;
  }walk(0,3,357);svg.innerHTML=s;
  svg.querySelectorAll('[data-leaf]').forEach(el=>el.onclick=()=>{const l=model.leaves.find(l=>l.node===+el.dataset.leaf),p=l.bounds.filter((_,i)=>i%2===0).map((v,i)=>(v+l.bounds[2*i+1])/2);if(isClass)cp=p;else rx=p[0];selected={type:isClass?'classification':'regression',depth:model.depth};update();});
 }
 function regPlot(svg,reg){
   const rl=leafFor(reg,[rx]),a=chart(svg.id,{xd:[0,8],yd:[0,12],height:180,width:360,title:'Функция этого дерева',xlabel:'x',ylabel:'y',xticks:4,yticks:2});
   a.add(d.regression.x.map((v,i)=>dot(a.x(v),a.y(d.regression.y[i]),'#8d97a2',2.4)).join(''));
   const xs=[],ys=[];reg.leaves.forEach(l=>{xs.push(l.bounds[0],l.bounds[1]);ys.push(l.value,l.value);});
   a.add(path(xs.map(a.x),ys.map(a.y),C.blue)+dot(a.x(rx),a.y(rl.value),C.green,5));
   svg.onclick=ev=>{const point=new DOMPoint(ev.clientX,ev.clientY).matrixTransform(svg.getScreenCTM().inverse());rx=Math.max(0,Math.min(8,(point.x-51)/(360-16-51)*8));selected={type:'regression',depth:reg.depth};update();};
 }
 function classPlot(cs,cls){
   const b=d.classification.bounds,x=v=>43+(v-b[0])/(b[1]-b[0])*300,y=v=>145-(v-b[2])/(b[3]-b[2])*109;
   cs.setAttribute('viewBox','0 0 360 180');let s=text(8,20,'Области поправок h(x)','class="chart-title"');
   cls.leaves.forEach(l=>{const z=l.bounds;s+=`<rect x="${x(z[0])}" y="${y(z[3])}" width="${x(z[1])-x(z[0])}" height="${y(z[2])-y(z[3])}" fill="${l.value>=0?'#f8ddcc':'#d9e9fa'}" stroke="#83919f" stroke-dasharray="3 3" stroke-width=".8"/>`;});
   s+=d.classification.x.map((p,i)=>`<circle cx="${x(p[0])}" cy="${y(p[1])}" r="2.8" fill="${d.classification.y[i]?C.orange:C.blue}" stroke="white" stroke-width=".6"/>`).join('');
   s+=`<circle cx="${x(cp[0])}" cy="${y(cp[1])}" r="5" fill="none" stroke="#1a1c1f" stroke-width="2"/>`+text(12,42,'x₂')+text(342,175,'x₁','text-anchor="end"');
   for(const v of [-1,0,1,2])if(v>b[0]&&v<b[1])s+=text(x(v),162,String(v),'text-anchor="middle"');
   for(const v of [-1,0,1])if(v>b[2]&&v<b[3])s+=text(34,y(v)+4,String(v),'text-anchor="end"');cs.innerHTML=s;
   cs.onclick=ev=>{const point=new DOMPoint(ev.clientX,ev.clientY).matrixTransform(cs.getScreenCTM().inverse());cp=[b[0]+Math.max(0,Math.min(1,(point.x-43)/300))*(b[1]-b[0]),b[2]+Math.max(0,Math.min(1,(145-point.y)/109))*(b[3]-b[2])];selected={type:'classification',depth:cls.depth};update();};
 }
 function update(){const view=$('depth-view').value;
  if(view==='regression'||view==='classification')selected.type=view;
  [1,2,3].forEach(n=>{
   const reg=d.regression.models[n-1],cls=d.classification.models[n-1],rs=$('depth-reg-'+n),cs=$('depth-cls-'+n);
   rs.onclick=cs.onclick=null;
   if(view==='regression'){treeSvg(rs,reg,false,leafFor(reg,[rx]));regPlot(cs,reg);}
   else if(view==='classification'){treeSvg(rs,cls,true,leafFor(cls,cp));classPlot(cs,cls);}
   else if(view==='trees'){treeSvg(rs,reg,false,leafFor(reg,[rx]));treeSvg(cs,cls,true,leafFor(cls,cp));}
   else{regPlot(rs,reg);classPlot(cs,cls);}
  });
  const isClass=selected.type==='classification',m=d[selected.type].models[selected.depth-1],l=leafFor(m,isClass?cp:[rx]);
  $('depth-path').textContent=`Путь в дереве глубины ${selected.depth}: `+l.rules.map(r=>(isClass?'x'+(r.feature+1):'x')+(r.left?' ≤ ':' > ')+fmt(r.threshold,2)).join(' → ')+` → ${isClass?'поправка h(x) = '+fmt(l.value,3)+', p: 0,5 → '+fmt(1/(1+Math.exp(-cb.eta*l.value)),3):'прогноз '+fmt(l.value,1)}. Проверок: ${l.rules.length}.`;
  $('depth-legend').innerHTML=view==='regression'?'Сверху — условия и ответы в листьях; снизу — функция того же дерева. Влево — «да», вправо — «нет». Серые точки — обучающие ответы. Нажмите график или лист: зелёным выделяется объект и его путь.':view==='classification'?'Первые деревья трёх бустингов на одних данных: p₀ = 0,5, цели y − p₀ = ±0,5. В листьях — числовые поправки h к F, после уточнения по Logloss.<br>Фон: синий — отрицательная поправка, оранжевый — положительная. Цвет точки — настоящий класс 0/1. η = 0,3; новый p = σ(ηh).':'Сверху — одномерная регрессия, снизу — первые деревья бустинга для бинарной классификации. Каждая колонка задаёт предел глубины. В узле условие: влево — «да», вправо — «нет». Нажмите график или лист, чтобы прочитать путь.';
  window.DEMO.state={view,selected,pathLength:l.rules.length,regLeaves:d.regression.models.map(m=>m.leaf_count),classLeaves:d.classification.models.map(m=>m.leaf_count),classValues:d.classification.models.map(m=>m.leaves.map(l=>l.value)),classModel:"gradient-boosting-first-tree",selectedValue:l.value};
 }on(['depth-view'],update);update();
}

function gradient(){
 const x=[10,12,14,20,22,24],y=[2,4,3,8,9,10],eta=.5;
 let p=x.map(()=>6),tick=0,iteration=1,progress=1,frame=0,timer=0,history=[],focus=0;
 const phases=['1. Прогноз','2. Производные','3. Сменить знак','4. Подобрать порог','5. Выбрать дерево','6. Добавить поправку'];
 const phaseOf=t=>t===0?0:t<=6?1:t===7?2:t<=12?3:t===13?4:5;
 const loss=q=>q.reduce((s,v,i)=>s+.5*(v-y[i])**2,0);
 function fit(r){return x.slice(1).map((v,k)=>{const split=k+1,left=r.slice(0,split).reduce((a,b)=>a+b,0)/split,right=r.slice(split).reduce((a,b)=>a+b,0)/(x.length-split),h=r.map((_,i)=>i<split?left:right);return {t:(x[k]+v)/2,left,right,h,sse:r.reduce((s,v,i)=>s+(v-h[i])**2,0)};});}
 app.innerHTML=`<div class="toolbar"><button id="reset">Сначала</button><button id="back">←</button><button id="next" class="primary">Следующий шаг</button><button id="play">▶ Анимация</button><label><span id="grad-point-label">День</span> <select id="point">${x.map((v,i)=>`<option value="${i}">${v} °C</option>`).join('')}</select></label><b id="iteration"></b></div><div class="phase-tabs" id="phases"></div><div class="gradient-grid"><svg id="grad-loss" role="img"></svg><svg id="grad-target" role="img"></svg><svg id="grad-ensemble" role="img"></svg></div><div id="split-work" hidden></div><div id="grad-readout" class="readout" aria-live="polite"></div><table id="grad-table" class="mini-table"></table><p class="foot">ℓ = ½(y − F)²; F — текущий прогноз. Производная по F задаёт цели для дерева; новое дерево имеет глубину 1, порог выбираем перебором. η = 0,5 — скорость обучения. Один цикл анимации добавляет одно дерево.</p>`;
 function render(){
  const phase=phaseOf(tick),i=phase===1?tick-1:focus,r=y.map((v,k)=>v-p[k]),g=r.map(v=>-v),candidates=fit(r),best=candidates.reduce((a,b)=>a.sse<=b.sse?a:b),candidate=phase===3?candidates[tick-8]:best,after=p.map((v,k)=>v+eta*best.h[k]),animated=p.map((v,k)=>v+(phase===5?progress:0)*eta*best.h[k]);
  $('point').value=i;$('point').disabled=phase===1;$('grad-point-label').textContent=phase===1?'Дни по очереди':'День';
  $('iteration').textContent='Дерево № '+iteration;$('back').disabled=tick===0;$('next').textContent=tick===14?'Следующее дерево':'Следующий шаг';$('play').textContent=timer?'Ⅱ Пауза':'▶ Анимация';
  $('phases').innerHTML=phases.map((s,j)=>`<span class="${j===phase?'active':''}">${s}</span>`).join('');
  const a=chart('grad-loss',{xd:[0,12],yd:[0,55],height:215,width:360,title:`Потеря дня ${x[i]} °C · y = ${y[i]}`,xlabel:'Прогноз F',yticks:2,xticks:3});
  const grid=Array.from({length:121},(_,k)=>k/10),one=f=>.5*(y[i]-f)**2;
  a.add(path(grid.map(a.x),grid.map(v=>a.y(Math.min(55,one(v)))),C.blue));
  if(phase>=1){const lo=Math.max(0,p[i]-.8),hi=Math.min(12,p[i]+.8);a.add(line(a.x(lo),a.y(one(p[i])+g[i]*(lo-p[i])),a.x(hi),a.y(one(p[i])+g[i]*(hi-p[i])),'#8952b2','stroke-width="3"'));}
  a.add(dot(a.x(p[i]),a.y(one(p[i])),C.orange,5));
  if(phase===5)a.add(dot(a.x(animated[i]),a.y(one(animated[i])),C.green,6));
  const middleTitle=phase===0?'Скоро здесь появятся цели':phase===1?'Производные g = F − y':'Цели для дерева: −g = y − F';
  const b=chart('grad-target',{xd:[9,25],yd:[-5,5],height:215,width:360,title:middleTitle,xlabel:'Температура, °C',xticks:4,yticks:2});
  b.add(line(b.x(9),b.y(0),b.x(25),b.y(0),'#9aa6b1'));
  if(phase>=1){const visible=phase===1?tick:6;x.forEach((v,k)=>{if(k>=visible)return;const z=phase===1?g[k]*(k===i?progress:1):phase===2?g[k]+progress*(r[k]-g[k]):r[k];b.add(dot(b.x(v),b.y(z),phase===1?'#8952b2':C.orange,k===i?5:3.7));});}
  if(phase>=3){const h=candidate;b.add(line(b.x(h.t),b.y(-5),b.x(h.t),b.y(5),C.muted,'stroke-dasharray="4 3"')+path([9,h.t,h.t,25].map(b.x),[h.left,h.left,h.right,h.right].map(b.y),C.green,phase===3?`opacity="${.4+.6*progress}"`:'')+text(b.x(h.t)+4,45,'t = '+fmt(h.t,0),'style="font-size:13px"'));x.forEach((v,k)=>b.add(line(b.x(v),b.y(r[k]),b.x(v),b.y(h.h[k]),'#a5b4bd','stroke-dasharray="2 2"')));}
  const c=chart('grad-ensemble',{xd:[9,25],yd:[0,12],height:215,width:360,title:phase===5?'Обновляем сумму деревьев':'Текущая сумма деревьев',xlabel:'Температура, °C',xticks:4,yticks:2});
  function ensembleLine(values){const edges=[9,11,13,17,21,23,25],xx=[],yy=[];values.forEach((v,k)=>{xx.push(edges[k],edges[k+1]);yy.push(v,v);});return {xx,yy};}
  const old=ensembleLine(p),next=ensembleLine(animated);
  c.add(path(old.xx.map(c.x),old.yy.map(c.y),C.blue,phase===5?'stroke-dasharray="4 3"':''));
  c.add(x.map((v,k)=>dot(c.x(v),c.y(y[k]),'#7f8b96',3.5)).join(''));
  if(phase===5)c.add(path(next.xx.map(c.x),next.yy.map(c.y),C.green));
  c.add(dot(c.x(x[i]),c.y(animated[i]),phase===5?C.green:C.orange,5));
  const messages=[`У всех дней есть прогноз. Для ${x[i]} °C: F = ${fmt(p[i],1)}, ответ y = ${y[i]}. Сумма потерь = ${fmt(loss(p),2)}.`,
   `День ${tick} из 6: ∂ℓ/∂F = F − y = ${fmt(p[i],1)} − ${y[i]} = ${fmt(g[i],1)}. ${g[i]>0?'Наклон положительный: прогноз нужно уменьшать.':g[i]<0?'Наклон отрицательный: прогноз нужно увеличивать.':'Наклон нулевой: этот прогноз уже верен.'}`,
   `Меняем знак всех производных. Получаем шесть целей: [${r.map(v=>fmt(v,1)).join('; ')}]. По ним обучим новое дерево.`,
   `Порог ${fmt(candidate.t,0)} °C: средние цели в листьях ${fmt(candidate.left,2)} и ${fmt(candidate.right,2)}. Сумма квадратов отклонений от целей = ${fmt(candidate.sse,2)}.`,
   `Из пяти порогов выбран ${fmt(best.t,0)} °C: ошибка подгонки целей ${fmt(best.sse,2)} — минимальная. Дерево приближает антиградиент двумя значениями листьев.`,
   `Для ${x[i]} °C: ${fmt(p[i],2)} + 0,5 × (${fmt(best.h[i],2)}) = ${fmt(after[i],2)}. Сумма исходных потерь: ${fmt(loss(p),2)} → ${fmt(loss(after),2)}.`];
  const splitting=phase===3||phase===4;
  app.querySelector('.gradient-grid').style.display=splitting?'none':'';
  $('split-work').hidden=!splitting;
  if(splitting){
   const cut=x.filter(v=>v<=candidate.t).length,lo=r.slice(0,cut),hi=r.slice(cut);
   const sum=z=>z.reduce((a,b)=>a+b,0),sse=(z,m)=>sum(z.map(v=>(v-m)**2));
   const leaf=(name,z,m)=>`<div><b>${name}: среднее целей</b><p>(${z.map(v=>fmt(v,2)).join(' + ')}) / ${z.length} = <strong>${fmt(m,2)}</strong></p><p class="split-error">Первый день: (${fmt(z[0],2)} − (${fmt(m,2)}))² = ${fmt((z[0]-m)**2,2)}.<br>Квадраты отклонений: ${z.map(v=>fmt((v-m)**2,2)).join(' + ')} = <b>${fmt(sse(z,m),2)}</b></p></div>`;
   $('split-work').innerHTML=`<p class="split-caption">1. Дни отсортированы по температуре. Порог ${fmt(candidate.t,0)} °C — между ${x[cut-1]} и ${x[cut]} °C.</p><table class="split-days"><tr><th>Температура</th>${x.map((v,k)=>`<td class="${k<cut?'split-left':'split-right'} ${k===cut-1?'split-cut':''}">${v} °C</td>`).join('')}</tr><tr><th>Цель дерева</th>${r.map((v,k)=>`<td class="${k<cut?'split-left':'split-right'} ${k===cut-1?'split-cut':''}">${fmt(v,2)}</td>`).join('')}</tr></table><div class="split-leaves">${leaf('2. Левый лист',lo,candidate.left)}${leaf('Правый лист',hi,candidate.right)}</div><p class="split-caption">3. Для каждого дня считаем (цель − среднее его листа)². Складываем: <b>${fmt(sse(lo,candidate.left),2)} + ${fmt(sse(hi,candidate.right),2)} = ${fmt(candidate.sse,2)}</b>.</p>`;
   if(phase===3)messages[phase]='Проверяем пять промежутков между соседними температурами: 11, 13, 17, 21, 23 °C. Другой порог внутри того же промежутка не изменит группы дней.';
  }
  $('grad-readout').textContent=messages[phase];
  const row=(label,values,attrs=[])=>`<tr><th>${label}</th>${values.map((v,k)=>`<td class="${attrs[k]||''}">${v===null?'…':fmt(v,2)}</td>`).join('')}</tr>`;
  if(phase===3||phase===4){$('grad-table').innerHTML=row('Проверяем порог, °C',candidates.map(c=>c.t))+row('Ошибка подгонки целей ↓',candidates.map((c,k)=>phase===4||k<=tick-8?c.sse:null),candidates.map((c,k)=>phase===4&&c===best?'best-cell':phase===3&&k===tick-8?'active-cell':''));}
  else{$('grad-table').innerHTML=row('Температура, °C',x)+row(phase<2?'Производная F − y':'Цель −градиент',x.map((_,k)=>phase===0||phase===1&&k>=tick?null:phase<2?g[k]:r[k]))+row(phase===5?'Поправка дерева × 0,5':'Ответ нового дерева',phase>=4?best.h.map(v=>phase===5?eta*v:v):x.map(()=>null));}
  window.DEMO.state={tick,phase,iteration,focus:i,progress,animating:progress<1,playing:!!timer,before:p,gradients:g,negative:r,tree:best.h,after,loss:loss(p),nextLoss:loss(after),bestT:best.t,candidates,history};
 }
 function drawTick(){cancelAnimationFrame(frame);progress=matchMedia('(prefers-reduced-motion: reduce)').matches?1:0;const start=performance.now();render();
  if(progress===1)return;
  function animate(now){progress=Math.min(1,(now-start)/500);render();if(progress<1)frame=requestAnimationFrame(animate);}frame=requestAnimationFrame(animate);
 }
 function pause(){clearInterval(timer);timer=0;}
 function advance(){if(tick===14){history.push({before:[...p],tree:[...window.DEMO.state.tree],threshold:window.DEMO.state.bestT});p=[...window.DEMO.state.after];iteration++;tick=0;}else tick++;if(tick===14)pause();drawTick();}
 $('next').onclick=()=>{pause();advance();};$('back').onclick=()=>{pause();tick=Math.max(0,tick-1);drawTick();};
 $('reset').onclick=()=>{pause();p=x.map(()=>6);tick=0;iteration=1;history=[];focus=0;drawTick();};
 $('play').onclick=()=>{if(timer){pause();render();return;}if(tick===14)advance();timer=setInterval(advance,1050);render();};
 $('point').oninput=()=>{pause();focus=+$('point').value;cancelAnimationFrame(frame);progress=1;render();};
 window.addEventListener('pagehide',()=>{pause();cancelAnimationFrame(frame);});
 render();
}
({depth,gradient})[scene]();
};
