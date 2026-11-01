(() => {
 const q=s=>document.querySelector(s),D=window.kExplorerData;
 const isSil=new URLSearchParams(location.search).get('metric')==='silhouette';
 const colors=['#339cff','#f3883b','#5dc977','#aa79dc','#e56e9d','#30b9b3','#c1a232','#7d8baf'];
 let kind='blobs',k=3,selected=0;
 const fmt=(v,d=2)=>v.toLocaleString('ru-RU',{minimumFractionDigits:d,maximumFractionDigits:d});
 q('#chart-title').textContent=isSil?'Средняя силуэтная ширина S(K)':'Сумма квадратов расстояний J(K)';
 q('#widths').style.display=isSil?'block':'none';q('#delta').hidden=isSil;q('#point-details').hidden=!isSil;
 function selectK(value){k=Math.max(1,Math.min(8,Number(value)));draw();}
 function draw(){
  const {points,results}=D[kind],r=results[k-1];
  q('#k').value=k;q('#k-value').value=k;q('#less').disabled=k===1;q('#more').disabled=k===8;
  q('#score').textContent=isSil?(r.S===null?'S не определён':`S = ${fmt(r.S,3)}`):`J = ${fmt(r.J,1)}`;
  q('#point-index').max=points.length;q('#point-index').value=selected+1;
  const plot=d3.select('#points');plot.selectAll('*').remove();
  const minX=d3.min(points,p=>p.x),maxX=d3.max(points,p=>p.x),minY=d3.min(points,p=>p.y),maxY=d3.max(points,p=>p.y);
  const scale=Math.min(480/(maxX-minX),285/(maxY-minY));
  const x=v=>270+(v-(minX+maxX)/2)*scale,y=v=>165-(v-(minY+maxY)/2)*scale;
  if(!isSil)plot.append('g').selectAll('line').data(points).join('line').attr('x1',p=>x(p.x)).attr('y1',p=>y(p.y)).attr('x2',(_,i)=>x(r.centers[r.labels[i]].x)).attr('y2',(_,i)=>y(r.centers[r.labels[i]].y)).attr('stroke',(_,i)=>colors[r.labels[i]]).attr('opacity',.16);
  plot.append('g').selectAll('circle').data(points).join('circle').attr('class','selectable').attr('cx',p=>x(p.x)).attr('cy',p=>y(p.y)).attr('r',(_,i)=>isSil&&i===selected?7:4).attr('fill',(_,i)=>colors[r.labels[i]]).attr('stroke',(_,i)=>isSil&&i===selected?'#172a3a':'white').attr('stroke-width',(_,i)=>isSil&&i===selected?2:.4).on('click',(_,p)=>{selected=points.indexOf(p);draw()}).append('title').text((p,i)=>`Точка ${i+1}; кластер ${r.labels[i]+1}${isSil&&r.values?`; s = ${fmt(r.values[i],3)}`:''}`);
  if(!isSil)r.centers.forEach((p,i)=>{plot.append('path').attr('d',`M${x(p.x)-9},${y(p.y)}h18 M${x(p.x)},${y(p.y)-9}v18`).attr('stroke','white').attr('stroke-width',7);plot.append('path').attr('d',`M${x(p.x)-9},${y(p.y)}h18 M${x(p.x)},${y(p.y)-9}v18`).attr('stroke',colors[i]).attr('stroke-width',3);});
  const chart=d3.select('#curve');chart.selectAll('*').remove();
  const cx=d3.scaleLinear().domain([1,8]).range([65,520]),cy=d3.scaleLinear().domain(isSil?[-.1,1]:[0,results[0].J*1.05]).nice().range([205,20]);
  chart.append('g').attr('transform','translate(0,205)').call(d3.axisBottom(cx).ticks(8).tickFormat(d3.format('d')));
  chart.append('g').attr('transform','translate(65,0)').call(d3.axisLeft(cy).ticks(5));
  chart.append('text').attr('x',520).attr('y',241).attr('text-anchor','end').text('Число кластеров K');
  const value=d=>isSil?d.S:d.J,rows=results.filter(d=>value(d)!==null);
  chart.append('path').datum(rows).attr('fill','none').attr('stroke','#a5b3c2').attr('stroke-width',2).attr('d',d3.line().x(d=>cx(d.k)).y(d=>cy(value(d))));
  chart.append('line').attr('x1',cx(k)).attr('x2',cx(k)).attr('y1',20).attr('y2',205).attr('stroke','#339cff').attr('stroke-dasharray','4 4');
  chart.selectAll('circle').data(rows).join('circle').attr('role','button').attr('tabindex',0).attr('aria-label',d=>`Выбрать K = ${d.k}`).attr('aria-pressed',d=>d.k===k?'true':'false').attr('cx',d=>cx(d.k)).attr('cy',d=>cy(value(d))).attr('r',d=>d.k===k?8:6).attr('fill',d=>d.k===k?'#1679ca':'#7f9ab5').on('click',(_,d)=>selectK(d.k)).on('keydown',(event,d)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectK(d.k)}}).append('title').text(d=>`K=${d.k}, ${isSil?'S':'J'}=${fmt(value(d),3)}`);
  if(isSil){
   const strip=d3.select('#widths');strip.selectAll('*').remove();
   if(r.values){
    const ordered=r.values.map((v,i)=>({v,i,g:r.labels[i]})).sort((a,b)=>a.g-b.g||a.v-b.v);
    const bx=d3.scaleBand().domain(ordered.map(d=>d.i)).range([65,520]),by=d3.scaleLinear().domain([-1,1]).range([75,18]);
    strip.append('text').attr('x',65).attr('y',12).text('s(i) каждой точки · сгруппированы по кластерам');
    strip.append('line').attr('x1',65).attr('x2',520).attr('y1',by(0)).attr('y2',by(0)).attr('stroke','#8c98a5');
    strip.selectAll('rect').data(ordered).join('rect').attr('class','selectable').attr('x',d=>bx(d.i)).attr('y',d=>Math.min(by(0),by(d.v))).attr('width',Math.max(1,bx.bandwidth()-.3)).attr('height',d=>Math.max(1,Math.abs(by(d.v)-by(0)))).attr('fill',d=>d.v<0?'#c14343':colors[d.g]).attr('stroke',d=>d.i===selected?'#172a3a':'none').on('click',(_,d)=>{selected=d.i;draw()}).append('title').text(d=>`Точка ${d.i+1}: ${fmt(d.v,3)}`);
    [-1,0,1].forEach(v=>strip.append('text').attr('x',54).attr('y',by(v)+4).attr('text-anchor','end').attr('font-size',11).text(v));
    const groups=Array.from({length:k},()=>[]);points.forEach((p,i)=>groups[r.labels[i]].push(i));
    const own=r.labels[selected],dist=i=>Math.hypot(points[i].x-points[selected].x,points[i].y-points[selected].y);
    const a=groups[own].length>1?d3.sum(groups[own],dist)/(groups[own].length-1):0;
    const b=d3.min(groups.filter((g,i)=>i!==own&&g.length).map(g=>d3.mean(g,dist)));
    q('#details').textContent=`a(i) = ${fmt(a)} · b(i) = ${fmt(b)} · s(i) = ${fmt(r.values[selected],3)}`;
   }else{strip.append('text').attr('x',65).attr('y',45).text('При K = 1 нет чужой группы: силуэт не определён.');q('#details').textContent='Нет другой группы для вычисления b(i).';}
  }else q('#delta').textContent=k===1?'Один центр описывает всю выборку.':`Переход ${k-1} → ${k}: J уменьшается на ${fmt(results[k-2].J-r.J,1)}. Следите, когда выигрыш становится небольшим.`;
  q('#hint').textContent=isSil?'Меняйте K. Нажмите на точку, чтобы сравнить её расстояния до своей и ближайшей чужой группы.':'Меняйте K: точки перекрашиваются, центры перемещаются. Крестики — центры; линии — расстояния, входящие в J.';
 }
 q('#dataset').onchange=()=>{kind=q('#dataset').value;selected=0;draw()};q('#k').oninput=()=>selectK(q('#k').value);q('#less').onclick=()=>selectK(k-1);q('#more').onclick=()=>selectK(k+1);
 q('#point-index').onchange=()=>{selected=Math.max(0,Math.min(D[kind].points.length-1,Math.trunc(Number(q('#point-index').value)||1)-1));draw()};
 draw();
})();
