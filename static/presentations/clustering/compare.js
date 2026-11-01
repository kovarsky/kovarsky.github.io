(()=>{
 const E=Clustering,q=s=>document.querySelector(s),colors=['#339cff','#f3883b','#5dc977','#aa79dc','#e56e9d','#30b9b3','#c1a232','#7d8baf'];
 let points,traces,index=0,seed=42,timer=null;
 function pause(){clearInterval(timer);timer=null;q('#play').textContent='▶ Запуск';}
 function setup(){pause();points=E.generate(q('#dataset').value);traces=SlideModels.comparison(points,+q('#k').value,seed);index=0;draw();}
 function maximum(){return Math.max(...traces.map(t=>t.states.length))-1;}
 function draw(){
  const ex=d3.extent(points,p=>p.x),ey=d3.extent(points,p=>p.y),scale=Math.min(470/(ex[1]-ex[0]),215/(ey[1]-ey[0]));
  const x=v=>280+(v-(ex[0]+ex[1])/2)*scale,y=v=>125-(v-(ey[0]+ey[1])/2)*scale;
  traces.forEach((trace,side)=>{
   const pos=Math.min(index,trace.states.length-1),s=trace.states[pos],svg=d3.select(side?'#plus-plot':'#random-plot');
   svg.selectAll('*').remove();
   svg.selectAll('circle').data(points).join('circle').attr('cx',p=>x(p.x)).attr('cy',p=>y(p.y)).attr('r',3.4).attr('fill',(_,i)=>s.labels?colors[s.labels[i]]:'#a4adb8');
   s.centers.forEach((c,i)=>{const path=`M${x(c.x)-9},${y(c.y)}h18 M${x(c.x)},${y(c.y)-9}v18`;svg.append('path').attr('d',path).attr('stroke','white').attr('stroke-width',7);svg.append('path').attr('d',path).attr('stroke',colors[i]).attr('stroke-width',3);});
   const state=s.done?`сошёлся (шаг ${trace.states.length-1})`:index===0?'начальные центры':s.phase==='assign'?'assignment':'update';
   q(side?'#plus-status':'#random-status').textContent=`J = ${trace.losses[pos].toFixed(1)} · ${state}`;
  });
  const chart=d3.select('#comparison-loss');chart.selectAll('*').remove();
  const cx=d3.scaleLinear().domain([0,maximum()]).range([62,680]),cy=d3.scaleLinear().domain([0,d3.max(traces,t=>t.losses[0])*1.08]).nice().range([105,12]);
  chart.append('g').attr('transform','translate(0,105)').call(d3.axisBottom(cx).ticks(Math.min(maximum(),10)).tickFormat(d3.format('d')));
  chart.append('g').attr('transform','translate(62,0)').call(d3.axisLeft(cy).ticks(3));
  chart.append('text').attr('x',43).attr('y',11).text('J');chart.append('text').attr('x',680).attr('y',138).attr('text-anchor','end').text('Шаг assignment / update');
  traces.forEach((t,i)=>{const values=t.losses.slice(0,index+1),color=i?'#c56c23':'#1679ca';chart.append('path').datum(values).attr('fill','none').attr('stroke',color).attr('stroke-width',2.5).attr('stroke-dasharray',i?'6 4':null).attr('d',d3.line().x((_,j)=>cx(j)).y(v=>cy(v)));chart.append('circle').attr('cx',cx(values.length-1)).attr('cy',cy(values.at(-1))).attr('r',4).attr('fill',color);});
  q('#step-label').textContent=`Шаг ${index} из ${maximum()}`;q('#back').disabled=index===0;q('#next').disabled=q('#finish').disabled=q('#play').disabled=index===maximum();if(index===maximum())pause();
 }
 function advance(){if(index<maximum()){index++;draw();}}
 q('#next').onclick=()=>{pause();advance()};q('#back').onclick=()=>{pause();index=Math.max(0,index-1);draw()};q('#finish').onclick=()=>{pause();index=maximum();draw()};q('#reset').onclick=()=>{pause();index=0;draw()};q('#new').onclick=()=>{seed+=7919;setup()};q('#dataset').onchange=()=>{seed=42;if(q('#dataset').value==='elongated')q('#k').value='2';setup()};q('#k').onchange=setup;
 q('#play').onclick=()=>{if(timer){pause();return;}q('#play').textContent='Ⅱ Пауза';timer=setInterval(advance,650)};
 window.addEventListener('message',e=>{if(e.source===parent&&e.data==='slide:stop')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});setup();
})();
