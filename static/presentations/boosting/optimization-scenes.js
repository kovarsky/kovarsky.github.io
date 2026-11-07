/* Teaching computations on the same six days. Growth diagrams illustrate policies,
   not fitted outputs from the three libraries. */
window.mountOptimization=function(scene,H){
'use strict';
const {app,C,$,fmt,esc,line,text,path,dot,chart,on,lin}=H;
app.classList.add('optimization-scene');window.DEMO={};
function descent(){
 const x=[10,12,14,20,22,24],y=[2,4,3,8,9,10];let p=x.map(()=>6),phase=0,steps=0;
 const sum=a=>a.reduce((s,v)=>s+v,0),signed=v=>(v>0?'+':'')+fmt(v,2);
 function fit(targets){return x.slice(1).map((v,k)=>{const n=k+1,l=sum(targets.slice(0,n))/n,r=sum(targets.slice(n))/(6-n),h=targets.map((_,i)=>i<n?l:r);return {threshold:(x[k]+v)/2,h,error:sum(targets.map((v,i)=>(v-h[i])**2))};}).reduce((a,b)=>a.error<=b.error?a:b);}
 app.innerHTML=`<div class="toolbar"><button id="next" class="primary">Показать направление</button><button id="reset">Сначала</button><label>η (скорость обучения) <select id="eta"><option value="0.1">0,1</option><option value="0.25">0,25</option><option value="0.5" selected>0,5</option><option value="1">1</option></select></label><label>Вес ошибки дня 24 °C <select id="weight"><option value="1">1 — обычный квадрат</option><option value="4">4 — важнее в четыре раза</option></select></label></div><div class="descent-layout"><svg id="prediction-plane" role="img"></svg><div id="descent-story"></div></div><table id="descent-table" class="mini-table"></table><div id="descent-result" class="readout"></div><p class="foot">Оси — прогнозы двух дней, не признаки. Контуры — их потеря; итог — сумма по всем шести.</p>`;
 function update(){
  const w=+$('weight').value,eta=+$('eta').value,weights=[1,1,1,1,1,w],loss=z=>sum(z.map((v,i)=>weights[i]*(v-y[i])**2/2)),targets=p.map((v,i)=>weights[i]*(y[i]-v)),tree=fit(targets),raw=p.map((v,i)=>v+eta*targets[i]),after=p.map((v,i)=>v+eta*tree.h[i]);
  const z=phase===3?after:p,limit=Math.ceil(Math.max(12,...p,...(phase>=1?raw:[]),...(phase>=2?after:[]))/4)*4;
  const svg=$('prediction-plane'),a=lin(0,limit,80,390),b=lin(0,limit,340,30),L2=f=>.5*((f[0]-2)**2+w*(f[5]-10)**2);
  svg.setAttribute('viewBox','0 0 480 400');
  let s='<defs><clipPath id="plane-clip"><rect x="80" y="30" width="310" height="310"/></clipPath></defs>';
  s+=text(80,18,'Положение = пара прогнозов','class="chart-title"');
  for(let i=0;i<=4;i++){const tick=limit*i/4;s+=line(a(tick),30,a(tick),340)+line(80,b(tick),390,b(tick))+text(a(tick),360,fmt(tick,0),'text-anchor="middle"')+text(68,b(tick)+5,fmt(tick,0),'text-anchor="end"');}
  s+='<g clip-path="url(#plane-clip)">';
  for(const level of [2,8,16,32,64,128]){const rx=Math.sqrt(2*level)*310/limit,ry=Math.sqrt(2*level/w)*310/limit;s+=`<ellipse cx="${a(2)}" cy="${b(10)}" rx="${rx}" ry="${ry}" fill="none" stroke="#b8cbdc" stroke-width="1.4"/>`;}
  function arrow(from,to,color,dashed=false){const ax=a(from[0]),ay=b(from[5]),bx=a(to[0]),by=b(to[5]),angle=Math.atan2(by-ay,bx-ax),sz=9;
   return line(ax,ay,bx,by,color,`stroke-width="3" ${dashed?'stroke-dasharray="6 4"':''}`)+`<path d="M${bx} ${by}L${bx-sz*Math.cos(angle-.5)} ${by-sz*Math.sin(angle-.5)}L${bx-sz*Math.cos(angle+.5)} ${by-sz*Math.sin(angle+.5)}Z" fill="${color}"/>`;
  }
  if(phase>=1)s+=arrow(p,raw,C.orange,true);
  if(phase>=2)s+=arrow(p,after,C.green);
  s+=dot(a(2),b(10),C.ink,5)+dot(a(p[0]),b(p[5]),C.blue,6);
  if(phase===3)s+=dot(a(after[0]),b(after[5]),C.green,6);
  s+='</g>'+text(a(2)+9,b(10)-10,'Ответы (2; 10)')+text(235,392,'Прогноз дня 10 °C, заказы','text-anchor="middle"')+`<text x="19" y="190" text-anchor="middle" transform="rotate(-90 19 190)">Прогноз дня 24 °C, заказы</text>`;
  svg.innerHTML=s;
  const descriptions=[
   `<h3>Меняем прогнозы</h3><p>Сейчас: <b>(${fmt(p[0],1)}; ${fmt(p[5],1)})</b>.</p><p>Синим показана одна точка: два текущих ответа модели.</p><p>Ближе к центру контуров — меньше ошибка этих дней.</p><p><b>В какую сторону шагнуть?</b></p>`,
   `<h3>Производная задаёт направление</h3><p>Для 10 °C наклон: <b>${signed(-targets[0])}</b>.<br>Для 24 °C: <b>${signed(-targets[5])}</b>.</p><p>Меняем знаки и берём ${fmt(eta*100,0)}%.</p><p class="orange">Пунктир — шаг по антиградиенту.</p><p>Такую поправку хотим для каждого дня.</p>`,
   `<h3>Нужно общее правило по x</h3><p>Шесть отдельных поправок не дадут прогноз новому дню.</p><p>Приблизим их «решающим пнём».<br>Порог: <b>${fmt(tree.threshold,0)} °C</b>.</p><p class="green">Зелёная стрелка — шаг дерева.</p><p>Числа в одном листе одинаковы: дерево приближает цели.</p>`,
   `<h3>Прибавили поправку дерева</h3><p>Теперь: <b>(${fmt(z[0],2)}; ${fmt(z[5],2)})</b>.</p><p>Старые деревья не меняем. Следующие цели считаем от новой суммы.</p><p>${loss(after)>loss(p)?'<b class="orange">Этот шаг слишком велик: потеря выросла. Уменьшите долю поправки.</b>':'Потеря уменьшилась. Следующая кнопка пересчитает направление.'}</p>`
  ];
  $('descent-story').innerHTML=descriptions[phase];
  const row=(title,values)=>'<tr><th>'+title+'</th>'+values.map(v=>'<td>'+v+'</td>').join('')+'</tr>';
  $('descent-table').innerHTML=row('Температура',x.map(v=>v+' °C'))+row('Нужная поправка −градиент',targets.map(v=>phase>=1?signed(v):'…'))+row('Что выдаёт дерево',tree.h.map(v=>phase>=2?signed(v):'…'));
  $('descent-result').textContent=phase===3?`Потеря всех шести дней: ${fmt(loss(p))} → ${fmt(loss(after))}. Следующий шаг начнётся с обновлённых прогнозов.`:phase===2?`Шесть целей, два листа. Ошибка приближения целей: ${fmt(tree.error)}. Перебор порогов разберём на следующем слайде.`:`Потеря всех шести дней: ${fmt(loss(p))}. ${w===4?'Вес изменил потерю, поэтому изменятся производные.':'Для половины квадрата отрицательная производная равна остатку.'}`;
  $('next').textContent=['Показать направление','Приблизить деревом','Прибавить поправку','Следующая итерация'][phase];
  window.DEMO.state={phase,steps,weights,eta,p,targets,tree,raw,after,loss:loss(p),nextLoss:loss(after),pairLoss:L2(p),nextPairLoss:L2(after)};
 }
 $('next').onclick=()=>{if(phase===3){p=[...window.DEMO.state.after];phase=0;steps++;}else phase++;update();};
 $('reset').onclick=()=>{p=x.map(()=>6);phase=0;steps=0;update();};
 $('eta').oninput=update;$('weight').oninput=()=>{p=x.map(()=>6);phase=0;steps=0;update();};update();
}
function growth(){
 let stage=1;
 app.innerHTML=`<div class="toolbar"><button id="back">←</button><button id="next" class="primary">Продолжить рост</button><button id="reset">Сначала</button><b id="growth-step"></b></div><div class="growth-grid">${['XGBoost · depthwise','LightGBM · leaf-wise','CatBoost · SymmetricTree'].map((name,i)=>`<div><h3>${name}</h3><svg id="policy-${i}" role="img"></svg><div id="policy-note-${i}" class="policy-note"></div></div>`).join('')}</div><div id="growth-result" class="readout"></div><p class="foot">Схема политик, не обучение пакетов. У XGBoost есть также lossguide; у CatBoost — Depthwise и Lossguide.</p>`;
 function renderTree(id,kind){
  const svg=$(id);svg.setAttribute('viewBox','0 0 360 320');let s='';
  const root={label:'t ≤ 20?',children:[{},{}]};
  if(stage>=2){
   if(kind===1)root.children[0]={label:'цена ≤ 5?',children:[{},{}]};
   else root.children=[{label:'цена ≤ 5?',children:[{},{}]},{label:kind===2?'цена ≤ 5?':'t ≤ 28?',children:[{},{}]}];
  }
  if(stage>=3&&kind===1)root.children[0].children[0]={label:'t ≤ 14?',children:[{},{}]};
  let count=0,maxDepth=0;
  function walk(node,x,y,spread,depth){maxDepth=Math.max(maxDepth,depth);const leaf=!node.children;
   if(!leaf){node.children.forEach((c,i)=>{const cx=x+(i?1:-1)*spread;s+=line(x,y+15,cx,y+67,C.muted)+text(x+(i?1:-1)*spread*.6,y+42,i?'нет':'да','text-anchor="middle" style="font-size:14px"');walk(c,cx,y+82,spread/2,depth+1);});}
   else count++;
   const same=kind===2&&depth===1&&!leaf,ww=leaf?34:104;
   s+=`<rect x="${x-ww/2}" y="${y-14}" width="${ww}" height="29" rx="4" fill="${same?'#fff0e5':leaf?'#e6f1ed':'#eef4fc'}" stroke="${same?C.orange:'#9eafbd'}"/>`+text(x,y+5,leaf?'лист':node.label,'text-anchor="middle" style="font-size:16px"');
  }
  walk(root,180,25,89,0);svg.innerHTML=s;
  return {leaves:count,depth:maxDepth};
 }
 function update(){const stats=[0,1,2].map(i=>renderTree('policy-'+i,i));
  $('growth-step').textContent='Этап '+stage+' из 3';$('next').disabled=stage===3;$('back').disabled=stage===1;
  $('policy-note-0').innerHTML='<b>Узлы ближайшего уровня.</b><p>У каждой ветви своё условие.<br>Здесь ограничили глубину: 2.</p>';
  $('policy-note-1').innerHTML='<b>Лист с лучшим выигрышем.</b><p>Одна ветвь может расти глубже.<br>Здесь ограничили листья: 4.</p>';
  $('policy-note-2').innerHTML='<b>Один предикат на весь уровень.</b><p>Условия повторяются в обеих ветвях.<br>Здесь ограничили глубину: 2.</p>';
  $('growth-result').textContent=stage===1?'Одинаковый первый вопрос. Дальше политики определяют, какие листья делить и можно ли выбирать разные условия.':stage===2?'XGBoost: два разных условия на уровне. CatBoost: одно общее. LightGBM: делим только один лучший лист.':'У всех по четыре листа; у LightGBM здесь глубина 3. Одинаковое число листьев не означает одинаковую форму.';
  window.DEMO.state={stage,stats};
 }
 $('next').onclick=()=>{stage++;update();};$('back').onclick=()=>{stage--;update();};$('reset').onclick=()=>{stage=1;update();};update();
}
({descent,growth})[scene]();
};
