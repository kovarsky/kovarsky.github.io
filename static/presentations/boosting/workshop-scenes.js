/* Computed model results are in workshop.js / examples.js. Gradient steps run here. */
window.mountWorkshop=function(scene,H){
'use strict';
const {app,C,$,fmt,esc,line,text,path,dot,chart,on}=H;
const W=window.WORKSHOP;
app.classList.add('workshop-scene');
window.DEMO={};
function comparison(){
 const d=W.comparison;
 app.innerHTML=`<div class="toolbar"><button id="back">←</button><label>Добавлено деревьев <input id="stage" type="range" min="1" max="8" value="1"><b id="count"></b></label><button id="next" class="primary">Добавить дерево</button><span>Те же 6 дней · «решающие пни»: глубина 1</span></div><div class="grid compare-grid"><div><h3>Лес усредняет прогнозы y</h3><svg id="rf-sum"></svg><div class="compare-fit"><svg id="rf-stump" role="img"></svg><svg id="rf-tree"></svg></div><p id="rf-rule"></p></div><div><h3>Бустинг прибавляет поправки</h3><svg id="gb-sum"></svg><div class="compare-fit"><svg id="gb-stump" role="img"></svg><svg id="gb-tree"></svg></div><p id="gb-rule"></p></div></div><p class="foot">Сверху: синий — ансамбль, пунктир — предыдущий прогноз. Снизу: новое дерево и его цели. Размер точек леса — число повторов дня в bootstrap (выборке с возвращением); у бустинга все 6 дней. Здесь один признак, поэтому виден только механизм бэггинга.</p>`;
 function drawStump(id,node){
  const svg=$(id);svg.setAttribute('viewBox','0 0 180 178');svg.setAttribute('aria-label',`Дерево глубины 1: температура ≤ ${node.threshold}; да — ${node.left}, нет — ${node.right}`);
  svg.innerHTML=text(90,19,'Новое дерево','text-anchor="middle" class="chart-title"')+
   line(90,68,42,112,C.green)+line(90,68,138,112,C.green)+
   text(52,91,'да','text-anchor="middle"')+text(130,91,'нет','text-anchor="middle"')+
   `<rect x="23" y="38" width="134" height="30" rx="4" fill="#f1f6f4" stroke="#98b9aa"/>`+
   text(90,58,'t ≤ '+fmt(node.threshold,0)+' °C?','text-anchor="middle"')+
   [42,138].map((cx,i)=>`<rect x="${cx-32}" y="112" width="64" height="31" rx="4" fill="#e5f3ee" stroke="#98b9aa"/>`+text(cx,133,fmt(i?node.right:node.left,2),'text-anchor="middle"')).join('');
 }
 function update(){
  const m=+$('stage').value,k=m-1;$('count').textContent=m;$('back').disabled=m===1;$('next').disabled=m===8;
  for(const type of ['rf','gb']){
   const p=type==='rf'?d.forest_means[k]:d.boost_sums[m],prev=type==='rf'?(k?d.forest_means[k-1]:null):d.boost_sums[m-1];
   const a=chart(type+'-sum',{xd:[9,25],yd:[0,12],height:178,width:540,title:'Текущий прогноз, заказы',xlabel:'Температура, °C',yticks:2});
   a.add(d.x.map((v,i)=>dot(a.x(v),a.y(d.y[i]),C.ink,3.5)).join(''));
   if(prev)a.add(path(d.grid.map(a.x),prev.map(a.y),C.muted,'stroke-dasharray="5 4"'));
   a.add(path(d.grid.map(a.x),p.map(a.y),C.blue));
   const targets=type==='rf'?d.y:d.residuals[k],node=type==='rf'?d.forest_nodes[k]:d.boost_nodes[k];
   drawStump(type+'-stump',node);
   const b=chart(type+'-tree',{xd:[9,25],yd:type==='rf'?[0,12]:[-5,5],height:178,width:350,title:type==='rf'?'Цели: исходные заказы':'Цели: новые остатки',xlabel:'Температура, °C',yticks:2,xticks:4});
   b.add(path([9,node.threshold,node.threshold,25].map(b.x),[node.left,node.left,node.right,node.right].map(b.y),C.green));
   b.add(d.x.map((v,i)=>type==='rf'&&!d.forest_counts[k][i]?'':dot(b.x(v),b.y(targets[i]),C.orange,type==='rf'?3+Math.sqrt(d.forest_counts[k][i]):4)).join(''));
  }
  $('rf-rule').textContent=m===1?'Прогноз = первое дерево':`Новый прогноз = (${m-1} × прежнее среднее + дерево ${m}) / ${m}`;
  $('gb-rule').textContent=`Новый прогноз = прежний прогноз + ${fmt(d.eta,1)} × дерево ${m}`;
  window.DEMO.state={m,depth:d.depth,rf:d.forest_means[k],gb:d.boost_sums[m],targets:d.residuals[k],rfNode:d.forest_nodes[k],gbNode:d.boost_nodes[k]};
 }
 on(['stage'],update);$('next').onclick=()=>{$('stage').value=+$('stage').value+1;update();};$('back').onclick=()=>{$('stage').value=+$('stage').value-1;update();};update();
}
function ice(){
 const d=window.TEACHING_EXAMPLES.orders.ice;
 app.innerHTML=`<div class="toolbar"><label>Дни <select id="group"><option value="all">Все</option><option value="0">Будни</option><option value="1">Выходные</option></select></label><label><input type="checkbox" id="center"> Отсчёт от 10 °C</label><label><input type="checkbox" id="average"> Показать среднее (PDP)</label></div><svg id="ice-chart" class="plot tall"></svg><div class="legend"><span class="blue">Синий — будний день</span><span class="orange">Оранжевый — выходной</span><span>ICE: одна линия — один объект</span></div><p class="hint">У каждого дня меняем температуру; цену, рекламу и остальные условия сохраняем.</p><p class="foot">Показаны первые 24 проверочных дня; среднее — по всем 240 или выбранной группе. Точную копию температуры меняем синхронно. Это реакция модели, не причинный эффект погоды.</p>`;
 function update(){const group=$('group').value,center=$('center').checked,avg=$('average').checked,
  rows=d.curves.map((p,i)=>({p:d.curves[i].map(v=>v-(center?p[0]:0)),w:d.weekends[i]})).filter(r=>group==='all'||r.w===+group),
  raw=group==='all'?d.pdp:d.group_means[+group],mean=raw.map(v=>v-(center?raw[0]:0)),values=[...rows.flatMap(r=>r.p),...mean];
  let a=chart('ice-chart',{xd:[10,32],yd:[Math.floor(Math.min(...values)/10)*10,Math.ceil(Math.max(...values)/10)*10],width:1080,height:330,title:center?'Изменение прогноза относительно 10 °C, заказы':'Прогноз заказов при изменении температуры',xlabel:'Температура, °C'});
  rows.forEach(r=>a.add(path(d.grid.map(a.x),r.p.map(a.y),r.w?C.orange:C.blue,'opacity=".4"')));
  if(avg)a.add(path(d.grid.map(a.x),mean.map(a.y),C.ink,'style="stroke-width:4"'));
  window.DEMO.state={group,center,avg,lines:rows.length,mean,first:rows[0].p[0]};
 }on(['group','center','average'],update);update();
}
function coalitions(){
 const d=W.shap_game,v=d.values;let stage=0;
 app.innerHTML=`<div class="toolbar"><button id="back">←</button><button id="next" class="primary">Раскрыть следующий шаг</button><b>Объект: жаркий выходной</b></div><div class="grid coalition-grid"><div><h3>Одна обученная модель</h3><p>Прогнозы на четырёх фоновых днях:</p><table class="mini-table"><tr><th></th><th>Будний</th><th>Выходной</th></tr><tr><th>Прохладный</th><td>50</td><td>70</td></tr><tr><th>Жаркий</th><td>80</td><td>120</td></tr></table><p class="hint">«Не знаем признак» — подставляем фоновые значения и усредняем прогнозы. Модель не переобучаем.</p><p class="foot">Точное дерево глубины 2. Четыре сочетания равновероятны; независимый фон. Объясняем 120 заказов.</p></div><div id="coalition-work"></div></div><div class="readout" id="coalition-result"></div><p class="foot">У двух признаков два порядка раскрытия. В общем случае SHAP усредняет предельные вклады по порядкам; результат зависит от выбранного фона и определения «не знать».</p>`;
 function update(){const A=v['1']-v['0'],B=v['3']-v['1'],Br=v['2']-v['0'],Ar=v['3']-v['2'];
  $('back').disabled=stage===0;$('next').disabled=stage===3;
  $('coalition-work').innerHTML=`<h3>База: ничего не раскрыто</h3><p>(50 + 70 + 80 + 120) / 4 = <b>${fmt(v['0'],1)}</b></p>`+
   (stage>=1?`<div class="coalition-path"><b>Температура → выходной</b><p>${fmt(v['0'],1)} → ${fmt(v['1'],1)} → ${fmt(v['3'],1)}</p><p>Вклады: температура +${fmt(A,1)}; выходной +${fmt(B,1)}.</p><small>Знаем «жарко»: (80 + 120) / 2 = ${v['1']}.</small></div>`:'<p class="hint">Предскажите средний ответ, если узнать только температуру.</p>')+
   (stage>=2?`<div class="coalition-path"><b>Выходной → температура</b><p>${fmt(v['0'],1)} → ${fmt(v['2'],1)} → ${fmt(v['3'],1)}</p><p>Вклады: выходной +${fmt(Br,1)}; температура +${fmt(Ar,1)}.</p><small>Знаем «выходной»: (70 + 120) / 2 = ${v['2']}.</small></div>`:'');
  $('coalition-result').innerHTML=stage===3?`<span>Температура: (${fmt(A,1)} + ${fmt(Ar,1)}) / 2 = <b>${fmt(d.phi[0],1)}</b></span><span>Выходной: (${fmt(B,1)} + ${fmt(Br,1)}) / 2 = <b>${fmt(d.phi[1],1)}</b></span><b>${fmt(v['0'],1)} + ${fmt(d.phi[0],1)} + ${fmt(d.phi[1],1)} = 120</b>`:stage>=2?'Порядок меняет вклад. Как разделить прибавку без предпочтения одного порядка?':'Сначала выясним, от какой базы отличается прогноз.';
  window.DEMO.state={stage,base:v['0'],phi:d.phi,prediction:v['3'],sum:v['0']+d.phi[0]+d.phi[1]};
 }$('next').onclick=()=>{stage++;update();};$('back').onclick=()=>{stage--;update();};update();
}
function transfer(){
 const d=W.shift;let stage=0;
 app.innerHTML=`<div class="toolbar"><button id="back">←</button><button id="next" class="primary">Дальше</button><b id="transfer-title"></b></div><div class="phase-tabs" id="transfer-phases"></div><div id="transfer-body"></div><p class="foot">Синтетический эксперимент: 800 train; по 300 объектов на обычной validation, проверке переноса и финальном тесте. На кнопках раскрываются заранее рассчитанные результаты; модели в браузере не переобучаются.</p>`;
 const names=['Важность','Гипотеза','Перенос','Переобучение','Финальная проверка'];
 const metric=(model,set)=>fmt(d.metrics[model][set],2);
 function update(){
  $('back').disabled=stage===0;$('next').disabled=stage===4;$('transfer-title').textContent=names[stage];$('transfer-phases').innerHTML=names.map((n,i)=>`<span class="${stage===i?'active':''}">${i+1}. ${n}</span>`).join('');
  const body=$('transfer-body');
  if(stage===0){body.innerHTML=`<div class="grid"><div><svg id="transfer-importance" class="plot"></svg><p class="foot">PVC — встроенная важность CatBoost: вклад признака в изменения прогнозов внутри ансамбля. Это не доля точности и не перестановочная важность.</p></div><div class="experiment-card"><h3>Новый учебный эксперимент со спросом</h3><p>Температура, цена, выходной и служебный индекс партии.</p><p>Обычная validation: RMSE <b>${metric('all','usual')}</b> заказа.</p><p>Индекс технический: его смысл может измениться при смене системы сбора.</p><b>Что настораживает? Как проверить?</b></div></div>`;
   const svg=$('transfer-importance');svg.setAttribute('viewBox','0 0 540 300');svg.innerHTML=text(10,23,'CatBoost PredictionValuesChange, %','class="chart-title"')+d.features.map((f,i)=>text(175,65+i*55,f,'text-anchor="end"')+`<rect x="185" y="${48+i*55}" width="${d.pvc[i]*2.8}" height="24" fill="${i===3?C.orange:C.blue}"/>`+text(195+d.pvc[i]*2.8,65+i*55,fmt(d.pvc[i],1))).join('');
  }else if(stage===1){body.innerHTML=`<div class="experiment-card"><h3>Гипотеза: модель опирается на неустойчивый служебный индекс</h3><p>Высокая важность показывает зависимость модели, но ещё не доказывает проблему.</p><p><b>Предсказание гипотезы:</b> на новой партии с другим правилом кодирования качество ухудшится.</p><p><b>Проверка:</b> зафиксировать модель и оценить её на отдельной новой партии.</p><p><b>Если подтвердится:</b> обучить модель без индекса на том же train, с теми же параметрами. Сравнить на обеих validation; финальный тест пока закрыт.</p></div>`;
  }else if(stage===2){body.innerHTML=`<div class="grid"><svg id="usual-scatter" class="plot"></svg><svg id="transfer-scatter" class="plot"></svg></div><div class="readout"><span>Та же модель: RMSE ${metric('all','usual')} → <b>${metric('all','transfer')}</b> заказа</span><b>Связь индекса и спроса изменилась.</b></div>`;
   for(const set of ['usual','transfer']){const a=chart(set+'-scatter',{xd:[50,200],yd:[40,190],height:275,title:set==='usual'?'Обычная validation':'Новая партия: validation переноса',xlabel:'Служебный индекс',ylabel:'Заказы'});const q=d.scatter[set];a.add(q.index.map((v,i)=>dot(a.x(v),a.y(q.y[i]),set==='usual'?C.blue:C.orange,3)).join(''));}
  }else if(stage===3){body.innerHTML=`<h3>Переобучили на том же train, убрав только индекс</h3><table class="experiment-table"><tr><th>Модель</th><th>Обычная validation</th><th>Новая партия</th></tr><tr><td>Все признаки</td><td>${metric('all','usual')}</td><td>${metric('all','transfer')}</td></tr><tr><td>Без служебного индекса</td><td>${metric('without','usual')}</td><td>${metric('without','transfer')}</td></tr></table><p class="hint">RMSE в заказах; меньше — лучше. На обычной проверке модели близки; на новой зависимость от индекса мешает.</p><div class="readout">Для переноса выбираем модель без индекса по новой validation. Параметры обеих моделей одинаковы: 250 деревьев, глубина 3, η = 0,05.</div>`;
  }else{body.innerHTML=`<div class="grid"><div class="experiment-card"><h3>Ещё одна новая партия</h3><p>Её ответы не использовали для выбора признаков или параметров.</p><p>Выбранная модель без индекса:</p><p class="stat green">RMSE ${metric(d.chosen,'final')}</p><p>Зафиксированный исходный baseline: ${metric('all','final')}.</p></div><div class="experiment-card"><h3>Что установили</h3><p>График подсказал гипотезу; проверка переноса обнаружила проблему; переобучение улучшило результат в новых условиях.</p><p>Удалять самый важный признак всегда — неверное правило.</p><p>Ищем признаки с устойчивым смыслом и проверяем на нужных будущих данных.</p></div></div>`;}
  window.DEMO.state={stage,chosen:d.chosen,metrics:d.metrics,finalVisible:stage===4};
 }$('next').onclick=()=>{stage++;update();};$('back').onclick=()=>{stage--;update();};update();
}
function realshap(){
 const d=window.REAL_SHAP,view=new URLSearchParams(location.search).get('view'),focused=['row','color'].includes(view);
 app.innerHTML=`<div class="toolbar"><label ${focused?'hidden':''}>График <select id="real-mode"><option value="summary">Все дни: beeswarm</option><option value="local" ${view==='local'?'selected':''}>Один день: waterfall</option></select></label><label ${view==='color'?'':'hidden'}>Строка <select id="real-feature"><option value="0">Температура</option><option value="1">Влажность</option></select></label><label>Выбранный день <select id="real-day">${d.rows.map((r,i)=>`<option value="${i}" ${i===d.default?'selected':''}>${r.date}</option>`).join('')}</select></label><button id="real-counterexample" ${view==='color'?'':'hidden'}>Контрпример: высокая влажность</button><button id="real-reset">Сначала</button></div><div class="real-shap-layout"><svg id="real-chart" role="img"></svg><div id="real-guide"></div></div><div id="real-readout" class="readout"></div><p class="foot" id="real-foot"></p>`;
 const color=t=>`rgb(${Math.round(38+190*t)},${Math.round(127-67*t)},${Math.round(208-103*t)})`;
 const valueLabel=(j,v)=>[3,6,7].includes(j)?(v?'да':'нет'):[4,5].includes(j)?fmt(v,0):fmt(v,j===1?1:2);
 function update(){const i=+$('real-day').value,e=d.rows[i],mode=focused?view:$('real-mode').value,j=mode==='color'?+$('real-feature').value:0,svg=$('real-chart');svg.setAttribute('viewBox','0 0 780 385');let s='';
  const signed=v=>(v>0?'+':'')+fmt(v,0);
  if(focused){
   const x=v=>60+(v+d.xlim)/(2*d.xlim)*670,cy=170,pointColor=r=>mode==='row'?'#727d89':color(r.colors[j]);
   s+=text(25,32,d.features[j]+' · одна точка = один день','class="chart-title"')+text(25,58,'Все 147 проверочных дней; обводка — выбранный день');
   for(const tick of [-d.xlim,-d.xlim/2,0,d.xlim/2,d.xlim])s+=line(x(tick),90,x(tick),270,tick===0?'#626d78':'#edf0f4',tick===0?'stroke-width="2"':'')+text(x(tick),296,fmt(tick,0),'text-anchor="middle"');
   d.rows.forEach((r,k)=>{s+=`<circle class="shap-point" data-day="${k}" data-feature="${j}" cx="${x(r.shap[j])}" cy="${cy+r.offset[j]*135}" r="4.8" fill="${pointColor(r)}" opacity=".8"><title>${esc(r.date+' · '+d.features[j]+': '+valueLabel(j,r.values[j])+' · SHAP '+signed(r.shap[j]))}</title></circle>`;});
   s+=`<circle cx="${x(e.shap[j])}" cy="${cy+e.offset[j]*135}" r="7" fill="${pointColor(e)}" stroke="#1a1c1f" stroke-width="2" pointer-events="none"/>`;
   s+=text(x(-1550),326,'← Понижает прогноз','text-anchor="middle"')+text(x(1550),326,'Повышает прогноз →','text-anchor="middle"')+text(x(0),365,'SHAP-вклад признака, поездок за день','text-anchor="middle"');
   svg.setAttribute('aria-label',`${d.features[j]}: 147 дней, горизонталь — SHAP-вклад, ${mode==='row'?'все точки серые':'цвет — значение признака'}`);
   $('real-guide').innerHTML=mode==='row'?`<h3>Сначала только положение</h3><p><b>Ноль:</b> у признака нет вклада в отличие прогноза от базы.</p><p><b>Слева:</b> вклад отрицательный.<br><b>Справа:</b> положительный.</p><p><b>Дальше от нуля</b> — сильнее вклад этого признака.</p><p class="caption">Высота точек внутри строки нужна, чтобы они не сливались. Это не значение температуры.</p>`:`<h3>Цвет = значение признака</h3><div class="shap-color-scale"></div><div class="shap-scale-labels"><span>Низкое</span><span>Высокое</span></div><p>У температуры: прохладнее → теплее.<br>У влажности: суше → влажнее.</p><h3>Знак = сторона от нуля</h3><p>Слева — минус.<br>Справа — плюс.</p><p><b>Красная точка может быть слева.</b> Проверьте на влажности.</p>`;
   $('real-readout').textContent=mode==='row'?`${e.date}: вклад температуры ${signed(e.shap[0])}. Это слагаемое прогноза, а не число поездок за день.`:`${e.date} · ${d.features[j]} = ${valueLabel(j,e.values[j])}${j===1?'%':' (индекс)'} · SHAP ${signed(e.shap[j])} поездок. Цвет описывает признак; сторона — вклад.`;
  }else if(mode==='summary'){
   const x=v=>205+(v+d.xlim)/(2*d.xlim)*540;
   for(const tick of [-d.xlim,-d.xlim/2,0,d.xlim/2,d.xlim])s+=line(x(tick),20,x(tick),335,tick===0?'#8a929b':'#edf0f4')+text(x(tick),355,fmt(tick,0),'text-anchor="middle"');
   d.order.forEach((j,rank)=>{const cy=38+rank*40;s+=text(192,cy+5,d.features[j],'text-anchor="end"');
    d.rows.forEach((r,k)=>{s+=`<circle class="shap-point" data-day="${k}" data-feature="${j}" cx="${x(r.shap[j])}" cy="${cy+r.offset[j]*40}" r="3.2" fill="${color(r.colors[j])}" opacity=".8"><title>${esc(r.date+' · '+d.features[j]+': '+valueLabel(j,r.values[j])+' · SHAP '+fmt(r.shap[j],1))}</title></circle>`;});
    s+=`<circle cx="${x(e.shap[j])}" cy="${cy+e.offset[j]*40}" r="5" fill="${color(e.colors[j])}" stroke="#1a1c1f" stroke-width="1.5" pointer-events="none"/>`;
   });s+=text(475,381,'SHAP-вклад: ← понижает прогноз · повышает →','text-anchor="middle"');
   $('real-guide').innerHTML=`<h3>Теперь все признаки</h3><p>В каждой строке <b>те же 147 дней</b>.</p><p><b>Выше</b> — больше средний модуль вклада. У этой модели лидирует температура.</p><p><b>Цвет сравниваем внутри строки:</b><br><span style="color:#267fd0">● низкое</span> → <span style="color:#e43c69">● высокое</span>.</p><p><b>Обводка:</b> один выбранный день во всех восьми строках.</p><p class="caption">Точки разных строк не стоят друг под другом: каждая имеет свой вклад. Нажмите точку, чтобы открыть этот день.</p>`;
   svg.setAttribute('aria-label','SHAP beeswarm: восемь признаков и 147 проверочных дней');
  }else{
   const order=e.shap.map((v,j)=>j).sort((a,b)=>Math.abs(e.shap[b])-Math.abs(e.shap[a]));let current=e.base;
   const bars=[{label:'База',from:0,to:e.base,total:true}];
   order.forEach(j=>{bars.push({label:d.features[j]+' = '+valueLabel(j,e.values[j]),from:current,to:current+e.shap[j]});current+=e.shap[j];});bars.push({label:'Прогноз',from:0,to:e.prediction,total:true});
   const min=Math.min(0,...bars.flatMap(b=>[b.from,b.to])),max=Math.max(...bars.flatMap(b=>[b.from,b.to]))*1.03,x=v=>270+(v-min)/(max-min)*425;
   bars.forEach((b,k)=>{const y=12+k*33,v=b.to-b.from;s+=text(258,y+16,b.label,'text-anchor="end" style="font-size:14px"')+`<rect x="${Math.min(x(b.from),x(b.to))}" y="${y}" width="${Math.max(1,Math.abs(x(b.to)-x(b.from)))}" height="23" fill="${b.total?(k?C.green:'#8b98a4'):v>0?'#e43c69':C.blue}"/>`+text(773,y+16,(b.total?'':v>0?'+':'')+fmt(v,0),'text-anchor="end" style="font-size:14px"');
    if(k<bars.length-2)s+=line(x(b.to),y+23,x(b.to),y+33,C.muted,'stroke-dasharray="3 2"');});
   for(let k=0;k<4;k++){const v=min+(max-min)*k/3;s+=text(x(v),360,fmt(v,0),'text-anchor="middle"');}s+=text(690,381,'Поездок за день','text-anchor="end"');
   $('real-guide').innerHTML=`<h3>${e.date}</h3><p>Прогноз: <b>${fmt(e.prediction,0)}</b><br>Фактически: <b>${e.actual}</b></p><p>Каждая полоса продолжает сумму после предыдущей.</p><p><span style="color:#e43c69">■ Красный</span> — прибавляем.<br><span class="blue">■ Синий</span> — вычитаем.</p><p><b>Здесь цвет означает знак!</b><br>В beeswarm он означал значение признака.</p><p class="caption">Сумма объясняет прогноз модели, а не фактическое число поездок.</p>`;
   svg.setAttribute('aria-label',`SHAP waterfall для ${e.date}: база ${fmt(e.base,0)} и восемь вкладов дают прогноз ${fmt(e.prediction,0)}`);
  }
  svg.innerHTML=s;svg.querySelectorAll('[data-day]').forEach(el=>el.onclick=()=>{$('real-day').value=el.dataset.day;if(!focused)$('real-mode').value='local';update();});
  if(!focused)$('real-readout').textContent=mode==='summary'?`${e.date}: восемь точек с обводкой — восемь вкладов одного дня. На следующем слайде сложим их с базой.`:`База ${fmt(e.base,0)} + сумма вкладов (${fmt(e.shap.reduce((a,b)=>a+b),0)}) = прогноз ${fmt(e.prediction,0)}. Числа округлены.`;
  $('real-foot').textContent='UCI Bike Sharing · одна и та же модель CatBoost, 147 проверочных дней. '+(mode==='row'?'Нажмите точку или выберите день. Здесь объясняется только вклад температуры.':mode==='color'?'Температура — исходный индекс 0–1; влажность — %. «Сначала» возвращает температуру и 04.01.2012.':mode==='summary'?'Средний |SHAP| — средняя сила вклада, без знака; это не оценка причинного влияния.':'База определяется TreeSHAP модели, не средним по этим 147 дням. Температура и ветер — индексы 0–1.');
  window.DEMO.state={mode,feature:j,date:e.date,colored:mode!=='row',points:focused?d.rows.length:mode==='summary'?d.rows.length*d.features.length:0,base:e.base,sum:e.base+e.shap.reduce((a,b)=>a+b),prediction:e.prediction,actual:e.actual};
 }on(['real-mode','real-day','real-feature'],update);
 $('real-counterexample').onclick=()=>{$('real-feature').value='1';$('real-day').value=d.rows.findIndex(r=>r.date==='2011-05-14');update();};
 $('real-reset').onclick=()=>{$('real-feature').value='0';$('real-day').value=d.default;$('real-mode').value=view==='local'?'local':'summary';update();};update();
}
({comparison,ice,coalitions,transfer,realshap})[scene]();
};
