(()=>{
 const E=Clustering,q=s=>document.querySelector(s),colors=['#339cff','#f3883b','#5dc977','#aa79dc','#e56e9d','#30b9b3','#c1a232','#7d8baf'];
 let points,states,index=0,selected=null,timer=null;
 function pause(){clearInterval(timer);timer=null;q('#play').textContent='▶ Запуск';}
 function setup(){pause();q('#minimum').value=Math.min(50,Math.max(1,Math.round(+q('#minimum').value||5)));points=E.generate(q('#dataset').value);states=SlideModels.density(points,+q('#eps').value,+q('#minimum').value);index=0;selected=null;q('#point-picker').max=points.length;draw();}
 function draw(){
  const s=states[index],eps=+q('#eps').value,minimum=+q('#minimum').value,focus=selected??s.focus??0;
  const neighbors=points.map((p,i)=>E.distance2(p,points[focus])<=eps*eps+1e-12?i:-1).filter(i=>i>=0),near=new Set(neighbors);
  const ex=d3.extent(points,p=>p.x),ey=d3.extent(points,p=>p.y),scale=Math.min(620/(ex[1]-ex[0]+1),340/(ey[1]-ey[0]+1));
  const x=v=>350+(v-(ex[0]+ex[1])/2)*scale,y=v=>200-(v-(ey[0]+ey[1])/2)*scale;
  const svg=d3.select('#density-plot');svg.selectAll('*').remove();
  svg.append('circle').attr('cx',x(points[focus].x)).attr('cy',y(points[focus].y)).attr('r',eps*scale).attr('fill','#339cff0c').attr('stroke','#2681ce').attr('stroke-dasharray','5 4');
  const dots=svg.selectAll('g.point').data(points).join('g').attr('class','point').attr('transform',p=>`translate(${x(p.x)},${y(p.y)})`).style('cursor','pointer').on('click',(_,p)=>{selected=points.indexOf(p);draw()});
  dots.append('circle').attr('r',9).attr('fill','transparent');
  dots.each(function(p,i){const g=d3.select(this),label=s.labels[i],color=label>=0?colors[label%colors.length]:'#7e8995';
   if(near.has(i))g.append('circle').attr('r',7.5).attr('fill','none').attr('stroke','#b9d9f5').attr('stroke-width',1.5);
   if(label===-1)g.append('path').attr('d','M-3,-3L3,3M-3,3L3,-3').attr('stroke',color).attr('stroke-width',1.5);
   else g.append('circle').attr('r',s.core[i]?4.6:3.7).attr('fill',s.core[i]===false?'white':color).attr('stroke',color).attr('stroke-width',1.4).attr('opacity',s.visited[i]?1:.35);
   g.append('title').text(`Точка №${i+1}`);
  });
  svg.append('circle').attr('cx',x(points[focus].x)).attr('cy',y(points[focus].y)).attr('r',10).attr('fill','none').attr('stroke','#202b36').attr('stroke-width',1.5).style('pointer-events','none');
  q('#eps-value').textContent=eps.toFixed(2);q('#point-picker').value=focus+1;
  q('#neighbors-info').textContent=`${neighbors.length} ${neighbors.length>=minimum?'≥':'<'} ${minimum}: ${neighbors.length>=minimum?'ядровая точка':'не ядровая точка'}.`;
  q('#message').textContent=s.done?'Обход завершён. Меняйте ε и min_samples, чтобы сравнить разбиения.':s.message;
  q('#db-summary').textContent=`Кластеров: ${s.cluster+1} · Шум${s.done?'':' пока'}: ${s.labels.filter(l=>l===-1).length}`;
  q('#db-progress').textContent=`Проверено ${s.visited.filter(Boolean).length} из ${points.length} точек · В очереди: ${s.queue.filter(i=>!s.visited[i]).length}`;
  q('#back').disabled=index===0;q('#next').disabled=q('#finish').disabled=q('#play').disabled=s.done;if(s.done)pause();
 }
 function advance(){if(index<states.length-1){index++;selected=null;draw()}}
 q('#next').onclick=()=>{pause();advance()};q('#back').onclick=()=>{pause();index=Math.max(0,index-1);selected=null;draw()};q('#finish').onclick=()=>{pause();index=states.length-1;selected=null;draw()};q('#reset').onclick=()=>{pause();index=0;selected=null;draw()};
 q('#play').onclick=()=>{if(timer){pause();return}q('#play').textContent='Ⅱ Пауза';timer=setInterval(advance,150)};
 q('#dataset').onchange=setup;q('#eps').oninput=setup;q('#minimum').oninput=()=>{if(q('#minimum').value!==''&&q('#minimum').checkValidity())setup()};q('#minimum').onchange=setup;q('#point-picker').oninput=()=>{selected=Math.min(points.length-1,Math.max(0,Math.round(+q('#point-picker').value||1)-1));draw()};
 window.addEventListener('message',e=>{if(e.source===parent&&e.data==='slide:stop')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});setup();
})();
