/* One saved, fitted GBDT in every scene. Only the last experiment retrains. */
window.mountInvestigation = function(scene,H){
'use strict';
const {app,C,$,fmt,esc,line,text,path,dot,chart,on,lin}=H;
const d=window.INVESTIGATION, q=new URLSearchParams(location.search);
const signed=(v,n=2)=>(v>0?'+':'')+fmt(v,n);
const val=(j,v)=>j===2?(v?'да':'нет'):fmt(v,j===4?0:1)+(j===0?' °C':j===1?' у.е.':'');
const stamp='<p class="foot">Та же модель спроса · 250 деревьев глубины 2 · 800 обучающих / 300 проверочных дней · синтетические данные.</p>';
app.classList.add('investigation-scene');window.DEMO={};
const state=s=>window.DEMO.state={modelId:d.model_id,...s};
function bars(id,values,title,unit,maxValue){
 const svg=$(id),order=values.map((v,j)=>j).sort((a,b)=>values[b]-values[a]),max=maxValue||Math.max(...values)*1.12||1;
 svg.setAttribute('viewBox','0 0 600 300');
 svg.innerHTML=text(10,23,title,'class="chart-title"')+order.map((j,i)=>{
  const y=64+i*45,w=Math.max(0,values[j])/max*320;
  return text(178,y+4,d.features[j],'text-anchor="end"')+`<rect x="190" y="${y-15}" width="${w}" height="26" fill="${j===3?C.orange:C.blue}"/>`+text(200+w,y+4,fmt(values[j],2)+unit);
 }).join('');
}
function drawTree(id,nodes,selected){
 const svg=$(id);svg.setAttribute('viewBox','0 0 540 290');
 let s='',leafNo=0;
 function visit(i,x,y,span){const n=nodes[i],isLeaf=n.left<0;
  if(!isLeaf){for(const [child,dx,answer] of [[n.left,-span,'да'],[n.right,span,'нет']]){
   s+=line(x,y+20,x+dx,y+80,C.line,'stroke-width="2"')+text(x+dx*.55,y+47,answer,'text-anchor="middle"');
   visit(child,x+dx,y+90,span/2);
  }}
  const width=isLeaf?94:(y===28?216:184),fill=isLeaf?'#e5f3ee':n.feature===3?'#fff0e5':'#eef5fc';
  s+=`<rect x="${x-width/2}" y="${y-13}" width="${width}" height="45" rx="5" fill="${fill}" stroke="${selected===i?C.orange:'#b7c4cd'}" stroke-width="${selected===i?3:1}"/>`;
  s+=text(x,y+7,isLeaf?signed(n.value,2):(n.feature===3?'Индекс':n.feature===4?'Номер':d.features[n.feature])+' ≤ '+fmt(n.threshold,1),'text-anchor="middle"');
  if(!isLeaf)s+=text(x,y+25,'выигрыш '+fmt(n.gain,0),'text-anchor="middle" class="node-sub"');
  else leafNo++;
 }
 visit(0,270,28,133);svg.innerHTML=s+text(270,280,'В листьях — поправки; к сумме прибавляем 5%','text-anchor="middle"');
}
function inspect(){
 const split=q.get('view')==='split';
 app.innerHTML=split?`<p class="investigation-lead">Первое дерево: ищем лучший порог <b>в каждом столбце</b>, затем сравниваем выигрыши.</p><div class="grid"><div><table class="mini-table" id="candidates"></table><p class="foot">Показан лучший порог каждого признака. SSE — ошибка подгонки остатков на 800 train-днях.</p></div><div><svg class="audit-tree" id="audit-tree"></svg></div></div><div class="readout" id="gain-result"></div><p class="hint">Сохраним имя признака и выигрыш каждого выбранного узла. Что получится по всему ансамблю?</p>${stamp}`:
 `<div class="toolbar"><label>Первые деревья <input id="count" type="range" min="1" max="250" value="1"><b id="count-label"></b></label><button id="all" class="primary">Все 250 деревьев</button><button id="reset">Одно дерево</button></div><div class="grid"><div><svg class="audit-tree" id="audit-tree"></svg><p class="foot" id="tree-caption"></p></div><div><svg id="gain-chart" class="plot"></svg></div></div><div class="readout" id="gain-result"></div><p class="hint">Это выигрыш при обучении. Зависит ли от индекса качество на новых днях?</p>${stamp}`;
 function update(){
  if(split){
   const best=d.trees[0][0].feature;
   $('candidates').innerHTML='<tr><th>Признак</th><th>Порог</th><th>Выигрыш SSE</th></tr>'+d.root_candidates.map(c=>`<tr class="${c.feature===best?'audit-best':''}"><td>${d.features[c.feature]}</td><td>≤ ${fmt(c.threshold,1)}</td><td>${fmt(c.gain,0)}</td></tr>`).join('');
   drawTree('audit-tree',d.trees[0],0);
   $('gain-result').textContent='Корень выбрал служебный индекс: на этих остатках он даёт наибольшее уменьшение SSE.';
   state({view:'split',best,tree:0});return;
  }
  const n=+$('count').value,g=d.features.map((_,j)=>d.gains.slice(0,n).reduce((s,r)=>s+r[j],0)),sum=g.reduce((a,b)=>a+b),values=g.map(v=>v/sum*100);
  $('count-label').textContent=n;drawTree('audit-tree',d.trees[n-1]);
  $('tree-caption').textContent=`Дерево № ${n}: один из ${n} участников подсчёта.`;
  bars('gain-chart',values,'Сумма выигрышей по признакам, доли','%',110);
  $('gain-result').textContent=`${fmt(values[3],1)}% накопленного выигрыша у индекса. Это не ${fmt(values[3],1)}% точности и не доля правильных ответов.`;
  state({view:'gain',n,values,sum});
 }
 if(!split){on(['count'],update);$('all').onclick=()=>{$('count').value=250;update();};$('reset').onclick=()=>{$('count').value=1;update();};}update();
}
function auditperm(){
 let repeat=-1;
 app.innerHTML=`<p class="investigation-lead">Индекс получил 97% выигрыша на train. Проверим зависимость на <b>тех же 300 validation-днях</b>.</p><div class="toolbar"><label>Перемешать <select id="feature">${d.features.map((f,j)=>`<option value="${j}" ${j===3?'selected':''}>${f}</option>`).join('')}</select></label><button id="shuffle" class="primary">Перемешать</button><button id="reset">Вернуть значения</button><button id="summary">Среднее 12 перестановок</button></div><div id="perm-body"></div><div class="readout" id="perm-result"></div><p class="hint" id="perm-next"></p>${stamp}`;
 let summary=false;
 function update(){const j=+$('feature').value,t=repeat<0?null:d.permutation[j].trials[repeat];
  if(summary){$('perm-body').innerHTML='<svg id="perm-chart" class="plot"></svg>';bars('perm-chart',d.permutation.map(r=>r.mean),'Рост RMSE на обычной validation','');
   $('perm-result').textContent='Индекс: +'+fmt(d.permutation[3].mean)+' заказа RMSE. Случайный номер: +'+fmt(d.permutation[4].mean)+'.';
  }else{
   $('perm-body').innerHTML='<table class="mini-table audit-perm"><tr><th>День</th><th>'+d.features[j]+' до → после</th><th>Прогноз до → после</th><th>Факт</th></tr>'+d.rows.slice(0,3).map((r,i)=>`<tr><td>${r.id}</td><td>${val(j,r.values[j])} → <b>${val(j,t?t.values[i]:r.values[j])}</b></td><td>${fmt(r.prediction,1)} → <b>${fmt(t?t.pred[i]:r.prediction,1)}</b></td><td>${fmt(r.actual,1)}</td></tr>`).join('')+'</table><p class="foot">Показаны первые 3 дня; метрика по всем 300. Остальные столбцы, факты и модель фиксированы.</p>';
   $('perm-result').textContent=`RMSE: ${fmt(d.base_rmse)} → ${fmt(t?t.rmse:d.base_rmse)} заказа. Изменение: ${signed(t?t.delta:0)}${t?' · перестановка '+(repeat+1)+'/12':''}.`;
  }
  $('perm-next').textContent=summary?'Индекс важен для качества на этой проверке. Но как именно он меняет прогноз? Рейтинг этого не показывает.':repeat<0?'Предскажите результат: вырастет ли ошибка, если перемешать только этот столбец?':j===3?'Без верных индексов качество упало. Повторим перестановку, затем сравним средние по всем столбцам.':'Сравните ущерб с индексом. Малая важность означает слабую зависимость этой модели, а не отсутствие сигнала в признаке.';
  state({repeat,summary,feature:j,delta:t?t.delta:0});
 }
 $('feature').oninput=()=>{repeat=-1;summary=false;update();};$('shuffle').onclick=()=>{repeat=(repeat+1)%12;summary=false;update();};$('reset').onclick=()=>{repeat=-1;summary=false;update();};$('summary').onclick=()=>{summary=true;update();};update();
}
function auditice(){
 app.innerHTML=`<div class="toolbar"><label>Меняем <select id="ice-feature"><option value="3">Служебный индекс</option><option value="0">Температуру</option></select></label><label><input id="many" type="checkbox"> 24 дня</label><label><input id="center" type="checkbox"> Отсчёт от левого края</label><label><input id="average" type="checkbox"> Среднее (PDP)</label></div><svg id="ice-chart" class="plot tall"></svg><div class="readout" id="ice-readout"></div><p class="hint">Меняем один столбец, остальные сохраняем. ICE — одна кривая на день; PDP — среднее по 300 дням.</p><p class="foot">Индекс связан с погодой и ценой: некоторые искусственные сочетания редки или невозможны. Кривая показывает реакцию модели, а не причинный эффект.</p>`;
 function update(){const j=+$('ice-feature').value,c=d.ice.find(c=>c.feature===j),many=$('many').checked,center=$('center').checked,avg=$('average').checked,n=many?24:1;
  const curves=c.curves.slice(0,n).map(r=>r.map(v=>v-(center?r[0]:0))),mean=c.pdp.map(v=>v-(center?c.pdp[0]:0)),values=[...curves.flat(),...(avg?mean:[])],min=Math.floor(Math.min(...values)/10)*10,max=Math.ceil(Math.max(...values)/10)*10;
  const a=chart('ice-chart',{xd:[c.grid[0],c.grid.at(-1)],yd:[min,max===min?min+10:max],width:1080,height:330,title:(center?'Изменение прогноза':'Прогноз')+', заказы',xlabel:d.features[j]+(j===0?', °C':'')});
  curves.forEach((r,i)=>a.add(path(c.grid.map(a.x),r.map(a.y),i===0?C.blue:C.muted,`opacity="${i===0?1:.35}" stroke-width="${i===0?4:1.5}"`)));
  if(avg)a.add(path(c.grid.map(a.x),mean.map(a.y),C.orange,'stroke-width="4"'));
  $('ice-readout').textContent='Синяя линия — день 1'+(many?'; серые — ещё 23 дня':'')+(avg?'; оранжевая — среднее по 300 дням':'')+'. Цена, выходной и остальные столбцы каждого дня фиксированы.';
  state({feature:j,many,center,avg,lines:n,first:curves[0][0],mean});
 }on(['ice-feature','many','center','average'],update);update();
}
function auditcalc(){
 const e=d.rows[0],v=d.shap.values;let step=0,averaged=false;
 app.innerHTML=`<div class="toolbar"><label>Порядок раскрытия <select id="order"><option value="0">Температура → цена → выходной → индекс → номер</option><option value="1">Индекс → выходной → цена → температура → номер</option></select></label><button id="next" class="primary">Раскрыть признак</button><button id="average">Все 120 порядков</button><button id="reset">Сначала</button></div><p class="investigation-lead">Тот же день 1: прогноз <b>${fmt(e.prediction,2)}</b>. «Не знаем столбец» — берём его из 64 фоновых train-дней и усредняем прогнозы.</p><table class="mini-table audit-calc" id="calc-table"></table><div class="readout" id="calc-result"></div><p class="hint" id="calc-hint"></p><p class="foot">Модель фиксирована. Неизвестные столбцы берём вместе из одной фоновой строки. Все 32 набора известных признаков рассчитаны точно для этого фона.</p>`;
 function update(){const order=+$('order').value===0?[0,1,2,3,4]:[3,2,1,0,4];let mask=0,contributions=[];
  if(averaged){$('calc-table').innerHTML='<tr><th>Признак</th><th>Средний вклад по 120 порядкам</th></tr>'+d.features.map((f,j)=>`<tr><td>${f}</td><td>${signed(e.shap[j])}</td></tr>`).join('');
   $('calc-result').textContent=`База ${fmt(e.base,2)} + сумма SHAP (${signed(e.shap.reduce((a,b)=>a+b))}) = прогноз ${fmt(e.prediction,2)}.`;
   $('calc-hint').textContent='Это и есть SHAP для выбранного фона: каждый признак получает среднюю прибавку от своего раскрытия.';
  }else{
   let rows='<tr><th>Что узнали о дне 1</th><th>Средний прогноз</th><th>Прибавка</th></tr><tr><td>Пока ничего: только фон</td><td>'+fmt(v[0],2)+'</td><td>—</td></tr>';
   order.slice(0,step).forEach(j=>{const next=mask|(1<<j),delta=v[next]-v[mask];contributions.push(delta);rows+=`<tr><td>${d.features[j]} = ${val(j,e.values[j])}</td><td>${fmt(v[next],2)}</td><td>${signed(delta)}</td></tr>`;mask=next;});
   for(let k=step;k<5;k++)rows+='<tr class="muted"><td>Ещё не раскрыт: '+d.features[order[k]]+'</td><td>—</td><td>—</td></tr>';
   $('calc-table').innerHTML=rows;
   $('calc-result').textContent=step===5?'Узнали все значения → получили тот же прогноз '+fmt(e.prediction,2)+'. Измените порядок: промежуточные прибавки могут отличаться.':`Раскрыто ${step} из 5 признаков. Прогноз с известными значениями: ${fmt(v[mask],2)}.`;
   $('calc-hint').textContent='Один порядок даёт одно распределение прибавок. Чтобы не предпочитать порядок, усредняем все 5! = 120 вариантов.';
  }
  $('next').disabled=averaged||step===5;
  state({step,averaged,mask,contributions,base:e.base,prediction:e.prediction,sum:e.base+e.shap.reduce((a,b)=>a+b)});
 }
 $('order').oninput=()=>{step=0;averaged=false;update();};$('next').onclick=()=>{step++;update();};$('average').onclick=()=>{averaged=true;update();};$('reset').onclick=()=>{step=0;averaged=false;update();};update();
}
function auditshap(){
 let view=q.get('view')||'summary',feature=0;
 const focused=()=>['row','color'].includes(view),color=t=>`rgb(${Math.round(38+190*t)},${Math.round(127-67*t)},${Math.round(208-103*t)})`;
 app.innerHTML=`<div class="toolbar"><label>День <select id="day">${d.rows.map((r,i)=>`<option value="${i}">${r.id}</option>`).join('')}</select></label><button id="counter" ${view==='color'?'':'hidden'}>Высокая цена: красный слева</button><button id="reset">День 1</button><button id="local" ${view==='summary'?'':'hidden'}>Объяснить выбранный день</button></div><div class="real-shap-layout"><svg id="shap-chart"></svg><div id="shap-guide"></div></div><div id="shap-readout" class="readout"></div><p class="foot" id="shap-foot"></p>`;
 function update(){const e=d.rows[+$('day').value],svg=$('shap-chart');svg.setAttribute('viewBox','0 0 780 385');let s='';
  if(focused()){
   const limit=Math.ceil(Math.max(...d.rows.map(r=>Math.abs(r.shap[feature])))),x=lin(-limit,limit,60,730),cy=170;
   s=text(25,32,d.features[feature]+' · одна точка = один проверочный день','class="chart-title"');
   for(const tick of [-limit,-limit/2,0,limit/2,limit])s+=line(x(tick),75,x(tick),270,tick===0?C.muted:C.line)+text(x(tick),296,fmt(tick,1),'text-anchor="middle"');
   d.rows.forEach((r,i)=>s+=`<circle data-day="${i}" cx="${x(r.shap[feature])}" cy="${cy+r.offset[feature]*170}" r="4" fill="${view==='row'?C.muted:color(r.colors[feature])}" opacity=".7"><title>День ${r.id}: ${esc(val(feature,r.values[feature]))}; вклад ${signed(r.shap[feature])}</title></circle>`);
   s+=`<circle cx="${x(e.shap[feature])}" cy="${cy+e.offset[feature]*170}" r="7" fill="none" stroke="${C.ink}" stroke-width="2"/>`+text(395,350,'SHAP-вклад, заказы: ← уменьшает прогноз · увеличивает →','text-anchor="middle"');
   $('shap-guide').innerHTML=view==='row'?'<h3>Сначала положение</h3><p>Ноль — нет вклада в отличие от базы.</p><p>Слева — минус.<br>Справа — плюс.</p><p>Дальше от нуля — больше модуль вклада.</p><p class="caption">Высота разделяет близкие точки, дополнительной величины здесь нет.</p>':'<h3>Цвет — значение</h3><div class="shap-color-scale"></div><div class="shap-scale-labels"><span>Низкое</span><span>Высокое</span></div><p>Горизонталь — вклад в прогноз.</p><p>Высокая цена может понижать прогноз: красная точка слева.</p><p class="caption">Цвет не показывает ошибку или правильность ответа.</p>';
   $('shap-readout').textContent=`День ${e.id}: ${d.features[feature].toLowerCase()} = ${val(feature,e.values[feature])}; вклад ${signed(e.shap[feature])} заказа.`;
  }else if(view==='summary'){
   const limit=Math.ceil(Math.max(...d.rows.flatMap(r=>r.shap.map(Math.abs)))/10)*10,x=lin(-limit,limit,205,745),order=d.shap.mean_abs.map((v,j)=>j).sort((a,b)=>d.shap.mean_abs[b]-d.shap.mean_abs[a]);
   for(const tick of [-limit,-limit/2,0,limit/2,limit])s+=line(x(tick),20,x(tick),325,tick===0?C.muted:C.line)+text(x(tick),350,fmt(tick,0),'text-anchor="middle"');
   order.forEach((j,rank)=>{const cy=52+rank*58;s+=text(192,cy+5,d.features[j],'text-anchor="end"');
    d.rows.forEach((r,i)=>s+=`<circle data-day="${i}" cx="${x(r.shap[j])}" cy="${cy+r.offset[j]*55}" r="3.3" fill="${color(r.colors[j])}" opacity=".7"/>`);
    s+=`<circle cx="${x(e.shap[j])}" cy="${cy+e.offset[j]*55}" r="6" fill="none" stroke="${C.ink}" stroke-width="1.8"/>`;
   });s+=text(475,381,'SHAP-вклад, заказы','text-anchor="middle"');
   $('shap-guide').innerHTML='<h3>Те же 300 дней</h3><p>Выше — больше средний |SHAP|.</p><p>Индекс доминирует и в объяснениях прогнозов.</p><p>Обводка — пять вкладов одного выбранного дня.</p><p class="caption">Цвет сравниваем внутри строки. Нажмите точку, чтобы выбрать день.</p>';
   $('shap-readout').textContent=`День ${e.id}: прогноз ${fmt(e.prediction,2)}. Чтобы восстановить его, сложим все пять вкладов и базу.`;
  }else{
   let current=e.base;const order=e.shap.map((v,j)=>j).sort((a,b)=>Math.abs(e.shap[b])-Math.abs(e.shap[a])),rows=[{label:'База',from:0,to:e.base,total:true}];
   order.forEach(j=>{rows.push({label:d.features[j],from:current,to:current+e.shap[j]});current+=e.shap[j];});rows.push({label:'Прогноз',from:0,to:e.prediction,total:true});
   const min=Math.min(0,...rows.flatMap(r=>[r.from,r.to])),max=Math.max(...rows.flatMap(r=>[r.from,r.to]))*1.18,x=lin(min,max,205,730);
   rows.forEach((r,i)=>{const cy=32+i*45;s+=text(193,cy+5,r.label,'text-anchor="end"')+`<rect x="${x(Math.min(r.from,r.to))}" y="${cy-12}" width="${Math.max(1,Math.abs(x(r.to)-x(r.from)))}" height="25" fill="${r.total?i===0?C.muted:C.green:r.to>r.from?C.orange:C.blue}"/>`+text(x(Math.max(r.from,r.to))+7,cy+5,r.total?fmt(r.to,2):signed(r.to-r.from));if(i&&!r.total)s+=line(x(r.from),cy-33,x(r.from),cy+12,C.muted,'stroke-dasharray="3 3"');});
   $('shap-guide').innerHTML=`<h3>День ${e.id}</h3><p>Прогноз: <b>${fmt(e.prediction,2)}</b><br>Факт: <b>${fmt(e.actual,2)}</b></p><p>Объясняем прогноз, поэтому не обязаны получить факт.</p><p><span class="orange">Оранжевый — плюс</span><br><span class="blue">Синий — минус</span></p><p class="caption">Здесь цвет — знак вклада. Порядок полос выбран для чтения; сумма от него не зависит.</p>`;
   $('shap-readout').textContent=`${fmt(e.base,2)} + (${signed(e.shap.reduce((a,b)=>a+b))}) = ${fmt(e.prediction,2)} заказа.`;
  }
  svg.innerHTML=s;svg.querySelectorAll('[data-day]').forEach(el=>el.onclick=()=>{$('day').value=el.dataset.day;update();});
  $('shap-foot').textContent='Та же модель · точные interventional SHAP для фона из 64 train-дней · все 300 validation-дней. База — средний прогноз по фону, не начальная константа бустинга.';
  state({view,feature,day:e.id,points:focused()?300:view==='summary'?1500:0,base:e.base,prediction:e.prediction,sum:e.base+e.shap.reduce((a,b)=>a+b),value:e.values[feature],contribution:e.shap[feature]});
 }
 $('day').oninput=update;$('counter').onclick=()=>{feature=1;$('day').value=d.shap.counterexample;update();};$('reset').onclick=()=>{view=q.get('view')||'summary';feature=0;$('day').value=0;update();};$('local').onclick=()=>{view='local';update();};update();
}
function audittransfer(){
 let stage=0;const t=d.transfer,metric=(m,s)=>fmt(t.metrics[m][s],2);
 app.innerHTML='<div class="toolbar"><button id="back">←</button><button id="next" class="primary">Проверить следующий шаг</button><b id="stage-label"></b></div><div id="audit-transfer"></div>'+stamp.replace('Та же модель спроса','Учебный спрос');
 function update(){
  $('back').disabled=stage===0;$('next').disabled=stage===3;$('stage-label').textContent=['1. Гипотеза до проверки','2. Перенос исходной модели','3. Переобучение без индекса','4. Независимая финальная проверка'][stage];
  if(stage===0){$('audit-transfer').innerHTML='<div class="grid"><div><h3>Что мы уже выяснили</h3><p>Индекс лидирует по выигрышам, перестановкам и SHAP. ICE показывает, как модель на него реагирует.</p><p>Обычная validation: RMSE <b>'+metric('all','usual')+'</b>.</p></div><div><h3>Что ещё не проверяли</h3><p>При смене системы сбора смысл индекса может измениться.</p><p><b>Гипотеза:</b> зависимость от индекса ухудшит перенос; обучение без него поможет.</p></div></div><div class="readout">План: новая validation → сравнение двух моделей → отдельная финальная партия.</div><p class="hint">До проверки не удаляем индекс по одному рейтингу.</p>';
  }else if(stage===1){$('audit-transfer').innerHTML='<div class="grid"><svg id="shift-old" class="plot"></svg><svg id="shift-new" class="plot"></svg></div><div class="readout">Та же исходная модель: RMSE '+metric('all','usual')+' → '+metric('all','transfer')+' заказа.</div><p class="hint">Правило индекса изменилось; закон спроса прежний. На графиках 70 из 300 дней, RMSE — по всем 300.</p>';
   ['usual','transfer'].forEach((key,i)=>{const s=t.scatter[key],a=chart(i?'shift-new':'shift-old',{xd:[50,200],yd:[40,200],width:540,height:300,title:i?'Новая validation: 300 дней':'Обычная validation: 300 дней',xlabel:'Служебный индекс',ylabel:'Факт, заказы'});a.add(s.index.map((x,k)=>dot(a.x(x),a.y(s.y[k]),i?C.orange:C.blue,3)).join(''));});
  }else if(stage===2){$('audit-transfer').innerHTML=`<h3>Теперь меняем обучение: исключаем только индекс</h3><table class="experiment-table"><tr><th>Модель</th><th>Обычная validation</th><th>Новая validation</th></tr><tr><td>Исходная</td><td>${metric('all','usual')}</td><td>${metric('all','transfer')}</td></tr><tr><td>Без индекса</td><td>${metric('without','usual')}</td><td>${metric('without','transfer')}</td></tr></table><p>RMSE, заказы; меньше — лучше. Те же 800 train-дней и параметры.</p><div class="readout">По новой validation выбираем вариант без индекса. Финальную партию пока не использовали.</div>`;
  }else{$('audit-transfer').innerHTML=`<div class="grid"><div><h3>Отдельные 300 дней нового режима</h3><p>Модель без индекса:</p><p class="stat green">RMSE ${metric(t.chosen,'final')}</p><p>Исходная модель: ${metric('all','final')}.</p></div><div><h3>Что подтверждено</h3><p>В этом эксперименте зависимость от изменившегося индекса мешала переносу.</p><p>Переобучение без него помогло на независимой партии.</p><p><b>Это не правило «удали самый важный признак».</b></p></div></div><div class="readout">Объяснения подсказали гипотезу. Выбор сделали по validation; результат проверили на финальных данных.</div>`;}
  state({stage,chosen:t.chosen,metrics:t.metrics,finalVisible:stage===3});
 }
 $('next').onclick=()=>{stage++;update();};$('back').onclick=()=>{stage--;update();};update();
}
({inspect,auditperm,auditice,auditcalc,auditshap,audittransfer})[scene]();
};
