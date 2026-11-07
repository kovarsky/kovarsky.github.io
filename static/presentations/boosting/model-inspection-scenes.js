/* Two inspectable ensembles: a small teaching forest and the exported Bike GBDT. */
window.mountModelInspection=function(scene,H){
'use strict';
const {app,C,$,fmt,esc,line,text,on,chart,path,dot}=H,info=window.MODEL_INSPECTION;
app.classList.add('model-inspector');window.DEMO={};
const signed=v=>(v>0?'+':'')+fmt(v,2);
function trace(nodes,row,cast=false){let i=0,route=[0];while(nodes[i].left>=0){const n=nodes[i],v=cast?Math.fround(row[n.feature]):row[n.feature];i=v<=n.threshold?n.left:n.right;route.push(i);}return {route,leaf:i,value:nodes[i].value};}
function draw(id,nodes,features,route,selected,width=1140,height=292,depth=3,symmetric=false){
 const svg=$(id),positions={},leafCount=i=>nodes[i].left<0?1:leafCount(nodes[i].left)+leafCount(nodes[i].right);
 function place(i,lo,hi,d){positions[i]={x:(lo+hi)/2,y:30+d*(height-62)/depth,d};if(nodes[i].left>=0){const n=nodes[i],mid=lo+(hi-lo)*leafCount(n.left)/(leafCount(n.left)+leafCount(n.right));place(n.left,lo,mid,d+1);place(n.right,mid,hi,d+1);}}
 place(0,4,width-4,0);svg.setAttribute('viewBox',`0 0 ${width} ${height}`);let s='';
 for(const [key,p] of Object.entries(positions)){const i=+key,n=nodes[i];if(n.left<0)continue;for(const child of [n.left,n.right]){const q=positions[child],active=route.includes(i)&&route.includes(child);s+=line(p.x,p.y+23,q.x,q.y-23,active?C.blue:'#cad3dc',`stroke-width="${active?3:1.5}"`)+text((p.x+q.x)/2,(p.y+q.y)/2+2,child===n.left?'да':'нет',`text-anchor="middle" style="font-size:12px;fill:${active?C.blue:C.muted}"`);}}
 for(const [key,p] of Object.entries(positions)){const i=+key,n=nodes[i],leaf=n.left<0,w=leaf?(width<800?128:128):(width<800?174:220),active=route.includes(i),label=leaf?'Ответ листа':features[n.feature],value=leaf?signed(n.value):'≤ '+fmt(n.threshold,features[n.feature].includes('темп')||features[n.feature]==='Температура'?4:2)+'?';s+=`<g data-node="${i}" role="button" tabindex="0" aria-label="Узел ${i}: ${esc(label)} ${esc(value)}"><rect x="${p.x-w/2}" y="${p.y-23}" width="${w}" height="46" rx="6" fill="${symmetric?['#edf5fc','#edf6ee','#fff3e8','#f8f9fb'][p.d]:active?'#edf5fc':'#f8f9fb'}" stroke="${i===selected?C.orange:active?C.blue:'#b9c6d0'}" stroke-width="${i===selected?3:1.3}"/>`+text(p.x,p.y-4,label,'text-anchor="middle" class="node-label"')+text(p.x,p.y+15,value,'text-anchor="middle" class="node-value"')+'</g>';}
 svg.innerHTML=s;
}
function bindNodes(id,select){$(id).querySelectorAll('[data-node]').forEach(el=>{el.onclick=()=>select(+el.dataset.node);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(+el.dataset.node);}};});}
function biketree(bonus=false){
 const base=window.BIKE_LESSON;let d=base,meta=info.bike,factor=.05,selected=0,isCat=false;
 if(bonus)app.classList.add('bonus-tree');
 app.innerHTML=`<div class="toolbar">${bonus?'<select id="library" aria-label="Библиотека"><option value="catboost">CatBoost</option><option value="sklearn">scikit-learn</option></select>':''}<button id="back" aria-label="Предыдущее дерево">←</button><label>Дерево <input id="tree" type="range" min="1" max="200" value="1"><input id="tree-number" aria-label="Номер дерева" type="number" min="1" max="200" value="1"> / 200</label><button id="next" aria-label="Следующее дерево">→</button><label>День <select id="day">${base.rows.map((r,i)=>`<option value="${i}" ${i===base.default?'selected':''}>${r.date}</option>`).join('')}</select></label><button id="walk">По пути дня →</button></div>${bonus?'<p id="tree-policy" class="tree-policy"></p>':''}<svg id="bike-tree" class="inspect-tree" aria-label="Дерево обученной модели Bike Sharing"></svg><div id="node-detail" class="node-detail"></div><div id="tree-sum" class="readout"></div><p id="tree-foot" class="foot"></p>`;
 function update(){
 isCat=bonus&&$('library').value==='catboost';
 if(isCat){const c=window.CATBOOST_BONUS;d={model_id:c.model_id,trees:c.trees,features:base.features,rows:base.rows.map((r,i)=>({...r,prediction:c.predictions[i]}))};meta=c;factor=c.scale;}else{d=base;meta=info.bike;factor=base.params.learning_rate;}
 const k=+$('tree').value-1,row=d.rows[+$('day').value],nodes=d.trees[k],t=trace(nodes,row.values,true);if(selected>=nodes.length)selected=0;
 $('tree-number').value=k+1;$('back').disabled=k===0;$('next').disabled=k===199;
 draw('bike-tree',nodes,d.features,t.route,selected,1140,bonus?266:292,3,isCat);bindNodes('bike-tree',i=>{selected=i;update();});
 const n=nodes[selected],count=meta.train_counts[k][selected],onPath=t.route.includes(selected);
 $('node-detail').innerHTML=n.left<0?`<b>Лист ${selected} · ${count} train-дней</b><span>${isCat?'Скорость обучения уже включена в значение листа. Добавка':'Ответ h = '+signed(n.value)+'; в сумму попадёт '+fmt(factor,2)+' × h'} = <b>${signed(factor*n.value)}</b>.</span>`:`<b>Узел ${selected} · ${count} train-дней</b><span>${esc(d.features[n.feature])}: у дня ${fmt(row.values[n.feature],6)}; порог ${fmt(n.threshold,6)} → <b>${Math.fround(row.values[n.feature])<=n.threshold?'да, влево':'нет, вправо'}</b>${onPath?'':' (узел вне пути дня)'}.${isCat?' Условие повторяется во всех узлах этого уровня.':' Выигрыш SSE: '+fmt(n.gain,0)+'.'}</span>`;
 const values=d.trees.map(ns=>trace(ns,row.values,true).value),before=meta.initial+factor*values.slice(0,k).reduce((a,b)=>a+b,0),delta=factor*t.value,after=before+delta,full=meta.initial+factor*values.reduce((a,b)=>a+b,0);
 $('tree-sum').innerHTML=`<span>До дерева № ${k+1}: <b>${fmt(before,1)}</b></span><span>Поправка: <b>${signed(delta)}</b></span><span>После: <b>${fmt(after,1)}</b></span><span>Все 200: <b>${fmt(full,1)}</b> поездки</span>`;
 if(bonus)$('tree-policy').textContent=isCat?'CatBoost · SymmetricTree: одинаковое условие на каждом уровне. Цвет объединяет узлы одного уровня.':'scikit-learn · исходная модель лекции: соседние узлы могут проверять разные условия.';
 $('tree-foot').textContent=isCat?'Синим — путь дня. Значения листьев CatBoost уже учитывают learning_rate=0,05: повторно умножать не нужно. Узлы и листья взяты из JSON обученной модели; пороги на схеме округлены.':'Синим — путь дня; нажмите любой узел для подробностей. В листьях — поправки до умножения на 0,05. Пороги округлены на схеме; маршрут вычисляется по полным значениям.';
 window.DEMO.state={modelId:d.model_id,library:isCat?'catboost':'sklearn',tree:k+1,day:+$('day').value,selected,route:t.route,leaf:t.leaf,value:t.value,before,delta,after,full,prediction:row.prediction,factor};
 }
 $('tree').oninput=()=>{selected=0;update();};$('tree-number').onchange=()=>{$('tree').value=Math.max(1,Math.min(200,Math.round(+$('tree-number').value||1)));selected=0;update();};$('day').oninput=()=>{selected=0;update();};$('back').onclick=()=>{$('tree').value=+$('tree').value-1;selected=0;update();};$('next').onclick=()=>{$('tree').value=+$('tree').value+1;selected=0;update();};$('walk').onclick=()=>{const r=window.DEMO.state.route;selected=r[(r.indexOf(selected)+1)%r.length];update();};
 if(bonus)$('library').oninput=()=>{selected=0;update();};
 window.DEMO.predict=values=>meta.initial+factor*d.trees.reduce((s,ns)=>s+trace(ns,values,true).value,0);update();
}
function forest(){
 const d=window.WORKSHOP.comparison;app.classList.add('forest-build-scene');
 app.innerHTML=`<div class="toolbar"><button id="reset">Сначала</button><button id="next" class="primary">Добавить дерево</button><label>Деревьев в лесу <input id="tree" type="range" min="0" max="8" value="0"><b id="count"></b></label><label>Прогноз для дня <select id="day">${d.y.map((_,i)=>`<option value="${i}">${i+1}</option>`).join('')}</select></label></div><div class="grid"><svg class="plot" id="forest-fit"></svg><svg class="plot" id="forest-new"></svg></div><div id="forest-prediction" class="readout"></div><table id="forest-data" class="mini-table"><caption>Выборка дней с возвращением</caption></table><p id="forest-foot" class="foot"></p>`;
 const predict=(node,x)=>x<=node.threshold?node.left:node.right;
 function update(){const m=+$('tree').value,k=Math.max(0,m-1),node=d.forest_nodes[k],counts=d.forest_counts[k],day=+$('day').value;
  $('count').textContent=m;$('next').disabled=m===8;
  const a=chart('forest-fit',{xd:[9,25],yd:[0,12],height:220,title:m?'Лес: среднее '+m+' деревьев':'Деревьев ещё нет',xlabel:'Температура, °C'});
  a.add(d.x.map((x,i)=>dot(a.x(x),a.y(d.y[i]),C.ink,5)).join(''));
  if(m>1)a.add(path(d.grid.map(a.x),d.forest_means[m-2].map(a.y),C.muted,'stroke-dasharray="5 4"'));
  if(m)a.add(path(d.grid.map(a.x),d.forest_means[m-1].map(a.y),C.blue));
  const b=chart('forest-new',{xd:[9,25],yd:[0,12],height:220,title:m?'Добавленное дерево № '+m:'Первое дерево: ещё не добавлено',xlabel:'Температура, °C'});
  b.add(path([9,node.threshold,node.threshold,25].map(b.x),[node.left,node.left,node.right,node.right].map(b.y),C.green));
  b.add(d.x.map((x,i)=>counts[i]?dot(b.x(x),b.y(d.y[i]),C.orange,4+Math.sqrt(counts[i])*2):'').join(''));
  const draw=counts.flatMap((n,i)=>Array(n).fill(i)),outputs=d.forest_nodes.slice(0,m).map(n=>predict(n,d.x[day])),mean=m?outputs.reduce((a,b)=>a+b,0)/m:null;
  $('forest-prediction').innerHTML=m?`<span>День ${day+1}: факт <b>${d.y[day]}</b></span><span>Лес: (${outputs.map(v=>fmt(v,2)).join(' + ')}) / ${m} = <b>${fmt(mean,2)}</b></span>`:'<span>Каждое дерево учится предсказывать исходные заказы y на своей bootstrap-выборке.</span>';
  const row=(label,values)=>'<tr><th>'+label+'</th>'+values.map(v=>'<td>'+v+'</td>').join('')+'</tr>';
  $('forest-data').innerHTML='<caption>Выборка дней с возвращением · дерево '+(k+1)+'</caption>'+row('День',draw.map(i=>i+1))+row('Температура, °C',draw.map(i=>d.x[i]))+row('Заказы, y',draw.map(i=>d.y[i]));
  const absent=counts.flatMap((n,i)=>n?[]:[i+1]);
  $('forest-foot').textContent='Слева: синий — лес, пунктир — прежнее среднее. Справа: зелёный — новое дерево; размер точки — число повторов дня. В выборку '+(absent.length?'не попали дни '+absent.join(', '):'попали все дни')+'. Один признак; деревья глубины 1 — «решающие пни».';
  window.DEMO.state={m,day,draw,counts,outputs,mean,node,depth:1,rf:m?d.forest_means[m-1]:null};
 }
 $('tree').oninput=update;$('day').oninput=update;$('next').onclick=()=>{$('tree').value=+$('tree').value+1;update();};$('reset').onclick=()=>{$('tree').value=0;update();};
 window.DEMO.predict=predict;update();
}
({biketree,forest,catboosttree:()=>biketree(true)})[scene]();
};
