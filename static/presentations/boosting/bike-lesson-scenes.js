/* Real daily Capital Bikeshare observations; one fixed baseline across explanations. */
window.mountBikeLesson=function(scene,H){
'use strict';
const {app,C,$,fmt,esc,line,text,path,dot,chart,on,lin}=H,d=window.BIKE_LESSON,q=new URLSearchParams(location.search),N=d.features.length;
app.classList.add('bike-scene');window.DEMO={};
const state=s=>window.DEMO.state={modelId:d.model_id,...s},signed=v=>(v>0?'+':'')+fmt(v,1);
const val=(j,v)=>j===4?(v?'да':'нет'):[5,6,7].includes(j)?fmt(v,0):fmt(v,[0,1,3,8].includes(j)?2:1);
const opts=(labels=d.features,selected=0)=>labels.map((f,j)=>`<option value="${j}" ${j===selected?'selected':''}>${f}</option>`).join('');
const stamp=`<p class="foot">Capital Bikeshare · ${d.counts.valid} validation-дней · исходная модель: ${d.params.n_estimators} деревьев, глубина ${d.params.max_depth}. Шумовой признак: U(0, 1), seed=2026.</p>`;
function bars(id,values,labels,title,errors){
 const svg=$(id),order=values.map((_,j)=>j).sort((a,b)=>values[b]-values[a]),low=Math.min(0,...values.map((v,j)=>v-(errors?.[j]||0))),high=Math.max(1,...values.map((v,j)=>v+(errors?.[j]||0))),x=lin(low<0?low*1.15:0,high*1.28,205,560),step=300/values.length;
 svg.setAttribute('viewBox','0 0 610 360');let s=text(8,24,title,'class="chart-title"')+line(x(0),40,x(0),340,C.muted);
 order.forEach((j,i)=>{let y=55+i*step;s+=text(192,y+4,labels[j],'text-anchor="end"')+`<rect x="${Math.min(x(0),x(values[j]))}" y="${y-10}" height="20" width="${Math.max(1,Math.abs(x(values[j])-x(0)))}" fill="${j===8?C.muted:j===5?C.orange:C.blue}"/>`;
 if(errors){s+=line(x(values[j]-errors[j]),y,x(values[j]+errors[j]),y,C.ink)+line(x(values[j]-errors[j]),y-4,x(values[j]-errors[j]),y+4,C.ink)+line(x(values[j]+errors[j]),y-4,x(values[j]+errors[j]),y+4,C.ink);}
 s+=text(x(values[j]+(errors?.[j]||0))+7,y+4,fmt(values[j],1));});svg.innerHTML=s;
}
function bikerank(){
 app.innerHTML=`<div class="toolbar"><label>Первые деревья <input id="count" type="range" min="1" max="${d.trees.length}" value="1"><b id="count-label"></b></label><button id="all" class="primary">Весь ансамбль</button><button id="reset">Одно дерево</button></div><div class="grid"><svg id="split-bars" class="bike-bars"></svg><svg id="gain-bars" class="bike-bars"></svg></div><div class="readout" id="rank-result"></div><p class="foot">Capital Bikeshare · статистика разбиений на 438 train-днях · полный ансамбль: 200 деревьев глубины 3. Шумовой признак: U(0, 1), seed=2026.</p>`;
 function update(){const n=+$('count').value,counts=d.features.map((_,j)=>d.split_counts.slice(0,n).reduce((s,r)=>s+r[j],0)),g=d.features.map((_,j)=>d.gains.slice(0,n).reduce((s,r)=>s+r[j],0)),sum=g.reduce((a,b)=>a+b),gain=g.map(x=>x/sum*100);$('count-label').textContent=n;bars('split-bars',counts,d.features,'Split count · число условий');bars('gain-bars',gain,d.features,'Gain · доля суммы выигрышей, %');$('rank-result').textContent=`Шумовой признак: ${counts[8]} условий, но ${fmt(gain[8],2)}% выигрыша. Частота условий и выигрыш на train — разные величины.`;state({n,counts,gain});}
 on(['count'],update);$('all').onclick=()=>{$('count').value=d.trees.length;update();};$('reset').onclick=()=>{$('count').value=1;update();};update();
}
function bikeperm(){
 let rep=-1,summary=false;
 app.innerHTML=`<div class="toolbar"><label>Перемешать <select id="feature">${opts(d.labels)}</select></label><button id="shuffle" class="primary">Перемешать</button><button id="summary">Рейтинг: 20 повторов</button><button id="reset">Сначала</button></div><div id="perm-body"></div><div class="readout" id="perm-result"></div><p class="foot">Рейтинг: среднее ± стандартное отклонение 20 перестановок, не доверительный интервал. Для пары температур используем одну перестановку строк.</p>${stamp}`;
 function update(){const j=+$('feature').value,t=rep<0?null:d.permutation[j].trials[rep];
 if(summary){$('perm-body').innerHTML='<svg id="perm-chart" class="bike-bars wide"></svg>';bars('perm-chart',d.permutation.map(p=>p.mean),d.labels,'Рост RMSE, поездки за день',d.permutation.map(p=>p.std));}
 else{$('perm-body').innerHTML='<p class="bike-lead">Меняем значения столбца; модель и правильные ответы остаются прежними.</p><table class="mini-table"><tr><th>Дата</th><th>'+esc(d.features[d.groups[j][0]])+'<br>до → после</th><th>Прогноз<br>до → после</th><th>Факт</th></tr>'+d.rows.slice(0,3).map((r,i)=>`<tr><td>${r.date}</td><td>${val(d.groups[j][0],r.values[d.groups[j][0]])} → ${val(d.groups[j][0],t?t.values[i]:r.values[d.groups[j][0]])}</td><td>${fmt(r.prediction,0)} → ${fmt(t?t.pred[i]:r.prediction,0)}</td><td>${fmt(r.actual,0)}</td></tr>`).join('')+'</table><p class="foot">Здесь первые три дня. RMSE считаем по всем 146 дням; значения второй температуры при выборе пары тоже перемешиваются.</p>';}
 $('perm-result').textContent=summary?`Температура: +${fmt(d.permutation[0].mean,0)}; обе температуры: +${fmt(d.permutation[9].mean,0)}; шумовой признак: +${fmt(d.permutation[8].mean,1)} RMSE.`:`RMSE ${fmt(d.base_rmse,1)} → ${fmt(t?t.rmse:d.base_rmse,1)} · изменение ${signed(t?t.delta:0)}${rep>=0?' · повтор '+(rep+1)+'/20':''}`;state({rep,summary,feature:j,delta:t?t.delta:0});}
 $('feature').oninput=()=>{rep=-1;summary=false;update();};$('shuffle').onclick=()=>{summary=false;rep=(rep+1)%20;update();};$('summary').onclick=()=>{summary=true;update();};$('reset').onclick=()=>{rep=-1;summary=false;update();};update();
}
function bikeablation(){
 app.innerHTML=`<div class="toolbar"><label>Проверяем <select id="feature">${opts(d.labels)}</select></label><button id="all">Все удаления</button></div><div id="ablation-body"></div><div class="readout" id="ablation-result"></div><p class="foot">Новые модели: те же 438 train-дней, параметры и seed; убран только выбранный столбец или пара. Изменение на одном validation-разбиении не гарантирует улучшение.</p>`;let all=false;
 function update(){const j=+$('feature').value,p=d.permutation[j],a=d.ablation[j];
 if(all){$('ablation-body').innerHTML='<svg id="ablation-chart" class="bike-bars wide"></svg>';bars('ablation-chart',d.ablation.map(a=>a.delta),d.labels,'Удаление и переобучение · изменение RMSE');}
 else $('ablation-body').innerHTML=`<p class="bike-lead">${esc(d.labels[j])}: сравниваем разные эксперименты на одной validation.</p><table class="mini-table"><tr><th>Эксперимент</th><th>Модель</th><th>RMSE</th><th>Изменение</th></tr><tr><td>Исходные данные</td><td>Исходная</td><td>${fmt(d.base_rmse,1)}</td><td>—</td></tr><tr><td>Перемешать значения</td><td>Исходная</td><td>${fmt(d.base_rmse+p.mean,1)}</td><td>${signed(p.mean)}</td></tr><tr><td>Удалить и обучить заново</td><td>Новая</td><td>${fmt(a.rmse,1)}</td><td>${signed(a.delta)}</td></tr></table>`;
 $('ablation-result').textContent=`Корреляция температур: ${fmt(d.corr_temp,3)}. Без одной температуры: +${fmt(d.ablation[0].delta,1)} RMSE; без обеих: +${fmt(d.ablation[9].delta,1)}.`;state({all,feature:j,delta:a.delta});}
 $('feature').oninput=()=>{all=false;update();};$('all').onclick=()=>{all=!all;update();};update();
}
function bikefour(){
 const counts=d.features.map((_,j)=>d.split_counts.reduce((s,r)=>s+r[j],0)),g=d.features.map((_,j)=>d.gains.reduce((s,r)=>s+r[j],0)),gain=g.map(v=>v/g.reduce((a,b)=>a+b)*100),perm=d.permutation.slice(0,N).map(r=>r.mean),drop=d.ablation.slice(0,N).map(r=>r.delta);
 const panels=[{title:'Split count',unit:'Число условий · train',values:counts,digits:0},{title:'Gain',unit:'Доля суммарного выигрыша, % · train',values:gain,digits:1},{title:'Permutation importance',unit:'ΔRMSE на validation · среднее 20 перестановок',values:perm,digits:1},{title:'Feature elimination',unit:'ΔRMSE на validation · после нового обучения',values:drop,digits:1}];
 app.innerHTML=`<svg id="four-chart" class="bike-four-chart" role="img" aria-label="Четыре диаграммы важности всех девяти признаков"></svg><p class="foot">Один порядок признаков, но разные единицы и масштабы. Серый — шумовой признак.<br>Температура: перестановка +833 RMSE, удаление с новым обучением +10. Дальше разберём вклады в прогноз одного дня.</p>`;
 const svg=$('four-chart');svg.setAttribute('viewBox','0 0 1160 456');let s='';
 const order=[0,1,2,3,4,5,6,7,8];
 panels.forEach((p,k)=>{const ox=(k%2)*590,oy=Math.floor(k/2)*230,low=Math.min(0,...p.values),high=Math.max(...p.values),x=lin(low<0?low*2:0,high*1.03,185,480);
 s+=`<g transform="translate(${ox},${oy})">`+text(0,19,p.title,'style="font-size:21px;font-weight:650"')+text(0,40,p.unit,'style="font-size:14px;fill:#66707c"')+line(x(0),50,x(0),210,C.line);
 order.forEach((j,i)=>{const y=61+i*18,v=p.values[j];s+=text(177,y+4,d.features[j],'text-anchor="end" style="font-size:16px"')+`<rect x="${Math.min(x(0),x(v))}" y="${y-6}" width="${Math.max(1,Math.abs(x(v)-x(0)))}" height="12" fill="${j===8?C.muted:C.blue}"/>`+text(540,y+4,fmt(v,p.digits),'text-anchor="end" style="font-size:15px"');});
 s+=line(185,212,480,212,C.line)+text(x(0),226,'0','text-anchor="middle" style="font-size:12px;fill:#66707c"')+text(x(high),226,fmt(high,p.digits),'text-anchor="middle" style="font-size:12px;fill:#66707c"')+'</g>';
 });svg.innerHTML=s;state({counts,gain,permutation:perm,elimination:drop,features:N});
}
function bikeice(){
 app.innerHTML=`<div class="toolbar"><label>Признак <select id="feature">${d.ice.map(c=>`<option value="${c.feature}">${d.features[c.feature]}</option>`).join('')}</select></label><label><input id="many" type="checkbox"> 24 дня</label><label><input id="center" type="checkbox"> Отсчёт от начала</label><label><input id="average" type="checkbox"> Среднее (PDP)</label></div><div class="ice-legend"><span><i style="border-color:#267fd0"></i>ICE: 1 января 2012</span><span><i style="border-color:#9ba1aa"></i>ICE: остальные 23 дня</span><span><i style="border-color:#d5673d"></i>PDP: среднее 146 дней</span></div><svg id="ice-chart" class="plot tall"></svg><div class="readout" id="ice-result"></div><p class="foot">Меняем один столбец, остальные фиксируем. При связанных признаках получаются и нетипичные сочетания.<br>Это реакция модели, не причинный эффект. Для категорий показаны только допустимые значения.</p>`;
 function update(){const j=+$('feature').value,c=d.ice.find(c=>c.feature===j),n=$('many').checked?24:1,center=$('center').checked,avg=$('average').checked,curves=c.curves.slice(0,n).map(r=>r.map(v=>v-(center?r[0]:0))),mean=c.pdp.map(v=>v-(center?c.pdp[0]:0)),values=[...curves.flat(),...(avg?mean:[])],lo=Math.floor(Math.min(...values)/500)*500,hi=Math.ceil(Math.max(...values)/500)*500,categorical=[4,5,6,7].includes(j);
 const a=chart('ice-chart',{xd:[c.grid[0],c.grid.at(-1)],yd:[lo,Math.max(hi,lo+500)],width:1080,height:310,xticks:categorical?c.grid.length-1:4,title:(center?'Изменение прогноза':'Прогноз')+', поездки за день',xlabel:d.features[j]+([0,1].includes(j)?' (исходный индекс)':'')});
 function draw(r,color,opacity,width){if(![4,5,7].includes(j))a.add(path(c.grid.map(a.x),r.map(a.y),color,`opacity="${opacity}" stroke-width="${width}"`));if(categorical)c.grid.forEach((x,i)=>a.add(`<g opacity="${opacity}">${dot(a.x(x),a.y(r[i]),color,width+1)}</g>`));}
 curves.slice(1).forEach(r=>draw(r,C.muted,.35,1.5));draw(curves[0],C.blue,1,4);if(avg)draw(mean,C.orange,1,4);
 $('ice-result').textContent=`${center?'Из каждого прогноза вычтено значение в начале его кривой. ':''}${n===24?'24 ICE-кривые. ':'Одна ICE-кривая. '}${avg?'PDP: среднее всех 146 дней.':'PDP можно включить сверху.'}`;state({feature:j,n,center,avg,first:curves[0][0],grid:c.grid,categorical});}
 on(['feature','many','center','average'],update);update();
}
function bikecalc(){
 const e=d.rows[d.default],v=d.shap.values;let step=0,averaged=false;
 app.innerHTML=`<div class="toolbar"><label>Порядок <select id="order"><option value="0">Температура первой</option><option value="1">Год первым</option></select></label><button id="next" class="primary">Раскрыть признак</button><button id="average">Среднее по всем порядкам</button><button id="reset">Сначала</button></div><p class="foot">${e.date} · фон: 32 train-дня. Неизвестные признаки берём вместе из фоновой строки; прогнозы усредняем.</p><table class="mini-table bike-calc" id="calc-table"></table><div class="readout" id="calc-result"></div><p class="foot">Для 9 признаков: 9! = 362 880 порядков. Точный средний вклад вычислен через 512 наборов известных признаков.</p>`;
 function update(){const order=+$('order').value?[5,6,7,4,2,3,1,0,8]:[0,1,2,3,4,5,6,7,8];let mask=0,contributions=[];
 if(averaged){$('calc-table').innerHTML='<tr><th>Признак</th><th>Средний вклад (SHAP)</th></tr>'+d.features.map((f,j)=>`<tr><td>${f}</td><td>${signed(e.shap[j])}</td></tr>`).join('');}
 else {let rows='<tr><th>Известный признак</th><th>Средний прогноз</th><th>Прибавка</th></tr>';
 order.forEach((j,k)=>{if(k<step){const next=mask|(1<<j),delta=v[next]-v[mask];contributions.push(delta);rows+=`<tr><td>${d.features[j]} = ${val(j,e.values[j])}</td><td>${fmt(v[next],1)}</td><td>${signed(delta)}</td></tr>`;mask=next;}else rows+=`<tr class="muted"><td>${d.features[j]}: пока неизвестен</td><td>—</td><td>—</td></tr>`;});$('calc-table').innerHTML=rows;}
 $('calc-result').textContent=averaged?`База ${fmt(e.base,1)} + сумма SHAP ${signed(e.shap.reduce((a,b)=>a+b))} = прогноз ${fmt(e.prediction,1)}.`:`База ${fmt(v[0],1)} → раскрыто ${step}/9 → прогноз ${fmt(v[mask],1)}. Поменяйте порядок и сравните прибавки.`;
 $('next').disabled=averaged||step===N;state({step,averaged,mask,contributions,prediction:e.prediction,sum:e.base+e.shap.reduce((a,b)=>a+b)});}
 $('order').oninput=()=>{step=0;averaged=false;update();};$('next').onclick=()=>{step++;update();};$('average').onclick=()=>{averaged=true;update();};$('reset').onclick=()=>{step=0;averaged=false;update();};update();
}
function bikeshap(){
 let view=q.get('view')||'summary',feature=0;
 const focused=()=>['row','color'].includes(view),color=t=>`rgb(${Math.round(38+190*t)},${Math.round(127-67*t)},${Math.round(208-103*t)})`;
 app.innerHTML=`<div class="toolbar"><label>День <select id="day">${d.rows.map((r,i)=>`<option value="${i}" ${i===d.default?'selected':''}>${r.date}</option>`).join('')}</select></label><button id="counter" ${view==='color'?'':'hidden'}>Влажность: красный слева</button><button id="reset">Исходный день</button><button id="local" ${view==='summary'?'':'hidden'}>Объяснить выбранный день</button></div><div class="real-shap-layout"><svg id="shap-chart"></svg><div id="shap-guide"></div></div><div id="shap-readout" class="readout"></div><p class="foot" id="shap-foot"></p>`;
 function update(){const e=d.rows[+$('day').value],svg=$('shap-chart');svg.setAttribute('viewBox','0 0 780 385');let s='';
  if(focused()){
   const limit=Math.ceil(Math.max(...d.rows.map(r=>Math.abs(r.shap[feature])))),x=lin(-limit,limit,60,730),cy=170;
   s=text(25,32,d.features[feature]+' · одна точка = один проверочный день','class="chart-title"');
   for(const tick of [-limit,-limit/2,0,limit/2,limit])s+=line(x(tick),75,x(tick),270,tick===0?C.muted:C.line)+text(x(tick),296,fmt(tick,1),'text-anchor="middle"');
   d.rows.forEach((r,i)=>s+=`<circle data-day="${i}" cx="${x(r.shap[feature])}" cy="${cy+r.offset[feature]*170}" r="4" fill="${view==='row'?C.muted:color(r.colors[feature])}" opacity=".7"><title>${r.date}: ${esc(val(feature,r.values[feature]))}; вклад ${signed(r.shap[feature])}</title></circle>`);
   s+=`<circle cx="${x(e.shap[feature])}" cy="${cy+e.offset[feature]*170}" r="7" fill="none" stroke="${C.ink}" stroke-width="2"/>`+text(395,350,'SHAP-вклад, поездки: ← уменьшает прогноз · увеличивает →','text-anchor="middle"');
   $('shap-guide').innerHTML=view==='row'?'<h3>Сначала положение</h3><p>Ноль — нет вклада в отличие от базы.</p><p>Слева — минус.<br>Справа — плюс.</p><p>Дальше от нуля — больше модуль вклада.</p><p class="caption">Высота разделяет близкие точки, дополнительной величины здесь нет.</p>':'<h3>Цвет — значение</h3><div class="shap-color-scale"></div><div class="shap-scale-labels"><span>Низкое</span><span>Высокое</span></div><p>Горизонталь — вклад в прогноз.</p><p>Высокая влажность может понижать прогноз: красная точка слева.</p><p class="caption">Цвет не показывает ошибку или правильность ответа.</p>';
   $('shap-readout').textContent=`${e.date}: ${d.features[feature].toLowerCase()} = ${val(feature,e.values[feature])}; вклад ${signed(e.shap[feature])} поездки.`;
  }else if(view==='summary'){
   const limit=Math.ceil(Math.max(...d.rows.flatMap(r=>r.shap.map(Math.abs)))/10)*10,x=lin(-limit,limit,205,745),order=d.shap.mean_abs.map((v,j)=>j).sort((a,b)=>d.shap.mean_abs[b]-d.shap.mean_abs[a]);
   for(const tick of [-limit,-limit/2,0,limit/2,limit])s+=line(x(tick),20,x(tick),325,tick===0?C.muted:C.line)+text(x(tick),350,fmt(tick,0),'text-anchor="middle"');
   order.forEach((j,rank)=>{const cy=40+rank*33;s+=text(192,cy+5,d.features[j],'text-anchor="end"');
    d.rows.forEach((r,i)=>s+=`<circle data-day="${i}" cx="${x(r.shap[j])}" cy="${cy+r.offset[j]*30}" r="3.3" fill="${color(r.colors[j])}" opacity=".7"/>`);
    s+=`<circle cx="${x(e.shap[j])}" cy="${cy+e.offset[j]*30}" r="6" fill="none" stroke="${C.ink}" stroke-width="1.8"/>`;
   });s+=text(475,381,'SHAP-вклад, поездки','text-anchor="middle"');
   $('shap-guide').innerHTML='<h3>Все 146 validation-дней</h3><p>Выше — больше средний |SHAP|.</p><p>Год и температура дают большие вклады.</p><p>Обводка — девять вкладов одного выбранного дня.</p><p class="caption">Цвет сравниваем внутри строки. Нажмите точку, чтобы выбрать день.</p>';
   $('shap-readout').textContent=`${e.date}: прогноз ${fmt(e.prediction,2)}. Чтобы восстановить его, сложим все девять вкладов и базу.`;
  }else{
   let current=e.base;const order=e.shap.map((v,j)=>j).sort((a,b)=>Math.abs(e.shap[b])-Math.abs(e.shap[a])),rows=[{label:'База',from:0,to:e.base,total:true}];
   order.forEach(j=>{rows.push({label:d.features[j],from:current,to:current+e.shap[j]});current+=e.shap[j];});rows.push({label:'Прогноз',from:0,to:e.prediction,total:true});
   const min=Math.min(0,...rows.flatMap(r=>[r.from,r.to])),max=Math.max(...rows.flatMap(r=>[r.from,r.to]))*1.18,x=lin(min,max,205,730);
   rows.forEach((r,i)=>{const cy=24+i*32;s+=text(193,cy+5,r.label,'text-anchor="end"')+`<rect x="${x(Math.min(r.from,r.to))}" y="${cy-12}" width="${Math.max(1,Math.abs(x(r.to)-x(r.from)))}" height="20" fill="${r.total?i===0?C.muted:C.green:r.to>r.from?C.orange:C.blue}"/>`+text(x(Math.max(r.from,r.to))+7,cy+5,r.total?fmt(r.to,2):signed(r.to-r.from));if(i&&!r.total)s+=line(x(r.from),cy-22,x(r.from),cy+12,C.muted,'stroke-dasharray="3 3"');});
   $('shap-guide').innerHTML=`<h3>${e.date}</h3><p>Прогноз: <b>${fmt(e.prediction,2)}</b><br>Факт: <b>${fmt(e.actual,2)}</b></p><p>Вклады складываются в прогноз. Ошибка модели остаётся.</p><p><span class="orange">Оранжевый — плюс</span><br><span class="blue">Синий — минус</span></p><p class="caption">Здесь цвет — знак вклада. Порядок полос выбран для чтения; сумма от него не зависит.</p>`;
   $('shap-readout').textContent=`${fmt(e.base,2)} + (${signed(e.shap.reduce((a,b)=>a+b))}) = ${fmt(e.prediction,2)} поездки.`;
  }
  svg.innerHTML=s;svg.querySelectorAll('[data-day]').forEach(el=>el.onclick=()=>{$('day').value=el.dataset.day;update();});
  $('shap-foot').textContent='Исходный бустинг · точные interventional SHAP · фон: 32 train-дня · 146 validation-дней. Температуры — исходные нормированные индексы.';
  state({view,feature,day:e.id,points:focused()?146:view==='summary'?1314:0,base:e.base,prediction:e.prediction,sum:e.base+e.shap.reduce((a,b)=>a+b),value:e.values[feature],contribution:e.shap[feature]});
 }
 $('day').oninput=update;$('counter').onclick=()=>{feature=2;$('day').value=d.shap.counterexample;update();};$('reset').onclick=()=>{view=q.get('view')||'summary';feature=0;$('day').value=d.default;update();};$('local').onclick=()=>{view='local';update();};update();
}

({bikefour,bikerank,bikeperm,bikeablation,bikeice,bikecalc,bikeshap})[scene]();
};
