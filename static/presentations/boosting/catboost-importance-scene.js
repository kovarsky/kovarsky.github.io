'use strict';
window.mountCatboostImportance=function({app,$,fmt,esc,C,line,text}){
const d=window.CATBOOST_IMPORTANCE;let phase=0;
app.classList.add('pvc-scene');
function pairs(tree,bit){const out=[];tree.values.forEach((va,a)=>{if(a&(1<<bit))return;const b=a|(1<<bit),vb=tree.values[b],wa=tree.weights[a],wb=tree.weights[b],mean=wa+wb?(wa*va+wb*vb)/(wa+wb):0;out.push({a,b,va,vb,wa,wb,mean,score:wa*(va-mean)**2+wb*(vb-mean)**2});});return out;}
function calculate(){const sums=d.features.map(()=>0);d.trees.forEach(t=>t.splits.forEach((s,bit)=>pairs(t,bit).forEach(p=>sums[s.feature]+=p.score)));const total=sums.reduce((a,b)=>a+b,0);return sums.map(v=>100*v/total);}
app.innerHTML=`<div class="toolbar"><button id="pvc-back">←</button><button id="pvc-next" class="primary">Далее →</button><button id="pvc-reset">Сначала</button><label>Дерево <input id="pvc-tree" type="number" min="1" max="200" value="1"></label><label>Условие <select id="pvc-split"></select></label><label>Листья <select id="pvc-pair"></select></label></div><p class="pvc-stage" id="pvc-stage"></p><div class="pvc-layout"><div><svg id="pvc-leaves" aria-label="Пара листьев реального дерева CatBoost"></svg><p id="pvc-context" class="pvc-context"></p></div><div id="pvc-calc" class="pvc-calc"></div></div><div id="pvc-total" class="readout"></div><p class="foot">Одна и та же модель: 200 деревьев глубины 3. Вес листа — число train-дней. Ответы листьев уже учитывают learning_rate. Суммы считаются до округления.</p>`;
function setSplits(){const t=d.trees[+$('pvc-tree').value-1];$('pvc-split').innerHTML=t.splits.map((s,bit)=>`<option value="${bit}" ${bit===1?'selected':''}>${esc(d.features[s.feature])} ≤ ${fmt(s.threshold,4)}</option>`).reverse().join('');setPairs();}
function setPairs(){const t=d.trees[+$('pvc-tree').value-1],ps=pairs(t,+$('pvc-split').value);$('pvc-pair').innerHTML=ps.map((p,i)=>`<option value="${i}" ${i===ps.length-1?'selected':''}>${p.a} и ${p.b}</option>`).join('');update();}
function update(){const ti=+$('pvc-tree').value-1,t=d.trees[ti],bit=+$('pvc-split').value,s=t.splits[bit],ps=pairs(t,bit),p=ps[+$('pvc-pair').value],j=s.feature;
 $('pvc-back').disabled=phase===0;$('pvc-next').disabled=phase===3;
 $('pvc-stage').textContent=[
  '1 / 4 · Выбираем листья: все остальные условия дают одинаковые ответы',
  '2 / 4 · Заменяем два ответа одним средним, учитывая число train-дней',
  '3 / 4 · Измеряем, насколько изменились ответы: квадраты × веса',
  '4 / 4 · Складываем оценки по признаку во всех деревьях и нормируем'][phase];
 const svg=$('pvc-leaves');svg.setAttribute('viewBox','0 0 550 260');
 let html=text(275,23,d.features[j]+' ≤ '+fmt(s.threshold,4)+'?','text-anchor="middle" class="chart-title"');
 html+=line(275,38,125,82,C.line)+line(275,38,425,82,C.line)+text(160,60,'да','text-anchor="middle"')+text(390,60,'нет','text-anchor="middle"');
 for(const [x,n,v,w,color] of [[125,p.a,p.va,p.wa,C.blue],[425,p.b,p.vb,p.wb,C.orange]]){
  html+=`<rect x="${x-103}" y="82" width="206" height="94" rx="6" fill="white" stroke="${color}" stroke-width="2"/>`+text(x,105,'Лист '+n,'text-anchor="middle"')+text(x,137,fmt(v,2),'text-anchor="middle" style="font-size:27px;fill:'+color+'"')+text(x,162,w+' train-дней','text-anchor="middle"');
  if(phase>=1)html+=line(x,180,275,216,C.line);
 }
 if(phase>=1)html+=text(275,245,'Общий ответ: '+fmt(p.mean,2),'text-anchor="middle" style="font-size:23px;fill:'+C.green+'"');
 svg.innerHTML=html;
 const same=t.splits.map((other,b)=>b===bit?null:`${d.features[other.feature]} ${p.a&(1<<b)?'>':'≤'} ${fmt(other.threshold,4)}`).filter(Boolean);
 $('pvc-context').textContent='Остальные условия для обоих листьев: '+same.join('; ')+'. Это пара для сравнения, а не обязательно соседние листья дерева.';
 let calc='';
 if(phase===0)calc=`<h3>Что сравниваем?</h3><p>В этой паре меняется только ответ на выделенное условие.</p><p>Ответы листьев: <b>${fmt(p.va,2)}</b> и <b>${fmt(p.vb,2)}</b> поездки.</p><p>Веса: <b>${p.wa}</b> и <b>${p.wb}</b> обучающих дней.</p>`;
 if(phase===1)calc=`<h3>Среднее с весами</h3><p class="pvc-arithmetic">(${p.wa} × ${fmt(p.va,2)} +<br>${p.wb} × ${fmt(p.vb,2)}) / ${p.wa+p.wb}<br>= <b>${fmt(p.mean,2)}</b></p><p>Сравниваем исходные ответы с этим общим значением.</p>`;
 if(phase===2)calc=`<h3>Оценка этой пары</h3><p class="pvc-arithmetic">${p.wa} × (${fmt(p.va,2)} − (${fmt(p.mean,2)}))² +<br>${p.wb} × (${fmt(p.vb,2)} − (${fmt(p.mean,2)}))²<br>= <b>${fmt(p.score,1)}</b></p><p>Это изменение ответов дерева.<br>Правильные ответы y в расчёт не входят.</p>`;
 if(phase===3){const order=d.features.map((_,i)=>i).sort((a,b)=>d.reference[b]-d.reference[a]);calc='<h3>PVC всей модели, %</h3><div class="pvc-ranking">'+order.map(f=>`<div class="${f===j?'pvc-selected':''}"><span>${esc(d.features[f])}</span><span class="pvc-bar"><i style="width:${d.reference[f]/40*100}%"></i></span><b>${fmt(d.reference[f],2)}</b></div>`).join('')+'</div>';}
 $('pvc-calc').innerHTML=calc;
 $('pvc-total').innerHTML=phase===3?`<span>${esc(d.features[j])}: <b>100 × ${fmt(d.totals[j],0)} / ${fmt(d.total,0)} = ${fmt(d.reference[j],2)}%</b></span>`:phase===2?`<span>Пара даёт <b>${fmt(p.score,1)}</b> в сумму признака «${esc(d.features[j])}».</span>`:'<span>Меняйте дерево, условие или пару листьев — используются реальные значения модели.</span>';
 if(!p.wa||!p.wb)$('pvc-context').textContent+=' Пустой лист имеет вес 0: оценка этой пары равна 0.';
 window.DEMO.state={phase,tree:ti+1,bit,feature:j,pair:p,total:d.total,pvc:d.reference[j]};
}
$('pvc-next').onclick=()=>{phase=Math.min(3,phase+1);update();};$('pvc-back').onclick=()=>{phase=Math.max(0,phase-1);update();};$('pvc-reset').onclick=()=>{phase=0;update();};$('pvc-tree').onchange=()=>{$('pvc-tree').value=Math.max(1,Math.min(200,Math.round(+$('pvc-tree').value||1)));setSplits();};$('pvc-split').oninput=setPairs;$('pvc-pair').oninput=update;
window.DEMO={calculate,pairs};setSplits();
};
