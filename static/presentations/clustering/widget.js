(() => {
  const E = window.Clustering;
  const colors = ['#339cff', '#f3883b', '#5dc977', '#eb77b1', '#9b79ec'];
  const q = s => document.querySelector(s);
  const params = new URLSearchParams(location.search);
  const scaleMode = params.get('mode') === 'scale';
  const preset = params.get('dataset');
  if ([...q('#dataset').options].some(option => option.value === preset)) {
    q('#dataset').value = preset;
    q('#k').value = '2';
  }
  const svg = d3.select('#plot'), chart = d3.select('#loss-plot');
  const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900;
  let points, state, x, y, seed = 42, steps = 0, losses = [], busy = false;
  let playing = false, timer = null, generation = 0;
  let standardized = false;
  if (scaleMode) {
    seed = 1;
    q('#dataset').value = 'elongated'; q('#k').value = '2';
    q('#dataset').closest('label').hidden = true;
    q('#k').closest('label').hidden = true;
    q('#standardize').hidden = false; q('#scale-status').hidden = false;
  }
  const links = svg.append('g'), traces = svg.append('g');
  const pointLayer = svg.append('g'), centerLayer = svg.append('g');

  function pause() {
    playing = false;
    clearTimeout(timer);
    q('#play').textContent = '▶ Воспроизвести';
  }
  function controls() {
    q('#assign').disabled = busy || state.done || state.phase === 'assign';
    q('#update').disabled = busy || state.done || state.phase !== 'assign';
    ['#dataset', '#k', '#new'].forEach(id => q(id).disabled = busy);
    q('#play').disabled = state.done;
    q('#standardize').disabled = busy;
  }
  function setPhase(phase) {
    q('#assign-code').classList.toggle('active', phase === 'assign');
    q('#update-code').classList.toggle('active', phase === 'move');
    q('#phase').textContent = phase === 'assign' ? 'Assignment step' : phase === 'move' ? 'Update step' : 'Initialization';
  }
  function showLoss(value) {
    q('#loss').textContent = value === null ? '—' : value.toLocaleString('ru-RU', {maximumFractionDigits: 1});
  }
  function drawChart() {
    chart.selectAll('*').remove();
    if (!losses.length) return;
    const sx = d3.scaleLinear().domain([1, Math.max(2, losses.length)]).range([42, 343]);
    const sy = d3.scaleLinear().domain([0, d3.max(losses, d => d.value) * 1.08]).nice().range([89, 9]);
    chart.append('g').attr('transform', 'translate(42,0)').call(d3.axisLeft(sy).ticks(3).tickSize(-301)).call(g=>g.select('.domain').remove()).call(g=>g.selectAll('line').attr('stroke','#e8ecf0'));
    chart.append('path').datum(losses).attr('fill', 'none').attr('stroke', '#7d8c9d').attr('stroke-width', 1.5).attr('d',d3.line().x((d,i)=>sx(i+1)).y(d=>sy(d.value)));
    chart.selectAll('circle').data(losses).join('circle').attr('cx',(d,i)=>sx(i+1)).attr('cy',d=>sy(d.value)).attr('r',4).attr('fill',d=>d.phase==='assign'?'#339cff':'#f3883b');
    chart.append('text').attr('x',343).attr('y',109).attr('text-anchor','end').attr('font-size',11).attr('fill','#69737f').text('Завершённые шаги');
  }
  function draw() {
    links.selectAll('line').data(state.labels ? points : []).join('line')
      .attr('x1',d=>x(d.x)).attr('y1',d=>y(d.y))
      .attr('x2',(d,i)=>x(state.centers[state.labels[i]].x)).attr('y2',(d,i)=>y(state.centers[state.labels[i]].y))
      .attr('stroke',(d,i)=>colors[state.labels[i]]).attr('opacity',.16);
    pointLayer.selectAll('circle').data(points).join('circle').attr('cx',d=>x(d.x)).attr('cy',d=>y(d.y))
      .attr('r',4).attr('fill',(d,i)=>state.labels?colors[state.labels[i]]:'#9aa6b3');
    const centers = centerLayer.selectAll('g.center').data(state.centers).join(enter=>{
      const g=enter.append('g').attr('class','center');
      g.append('circle').attr('r',20).attr('fill','transparent');
      g.append('path').attr('d','M-11,0H11 M0,-11V11').attr('stroke','white').attr('stroke-width',9);
      g.append('path').attr('class','cross').attr('d','M-11,0H11 M0,-11V11').attr('stroke-width',4);
      g.append('text').attr('x',14).attr('y',-12).attr('font-size',14);
      return g;
    }).attr('transform',d=>`translate(${x(d.x)},${y(d.y)})`);
    centers.select('.cross').attr('stroke',(d,i)=>colors[i]);
    centers.select('text').attr('fill',(d,i)=>colors[i]).text((d,i)=>`c${i+1}`);
    centers.on('.drag',null).style('cursor',steps===0?'grab':'default');
    if(steps===0) {
      let start;
      centers.call(d3.drag().container(svg.node()).on('start',function(event,d){
        const r=svg.node().getBoundingClientRect();
        start={cx:event.sourceEvent.clientX,cy:event.sourceEvent.clientY,x:x(d.x),y:y(d.y),scale:Math.min(r.width/680,r.height/350)};
      }).on('drag',function(event,d){
        d.x=x.invert(Math.max(25,Math.min(655,start.x+(event.sourceEvent.clientX-start.cx)/start.scale)));
        d.y=y.invert(Math.max(20,Math.min(330,start.y+(event.sourceEvent.clientY-start.cy)/start.scale)));
        d3.select(this).attr('transform',`translate(${x(d.x)},${y(d.y)})`);
      }));
    }
  }
  function setup() {
    generation++;
    pause();
    svg.interrupt(); svg.selectAll('*').interrupt();
    busy=false; steps=0; losses=[];
    centerLayer.attr('visibility', null);
    points=E.generate(q('#dataset').value);
    const ex=d3.extent(points,d=>d.x),ey=d3.extent(points,d=>d.y);
    const scale=Math.min(590/(ex[1]-ex[0]),280/(ey[1]-ey[0]));
    x=d3.scaleLinear().domain(ex).range([340-(ex[1]-ex[0])*scale/2,340+(ex[1]-ex[0])*scale/2]);
    y=d3.scaleLinear().domain(ey).range([175+(ey[1]-ey[0])*scale/2,175-(ey[1]-ey[0])*scale/2]);
    if (scaleMode && standardized) {
      const mx=d3.mean(points,p=>p.x), my=d3.mean(points,p=>p.y);
      const sx=Math.sqrt(d3.mean(points,p=>(p.x-mx)**2));
      const sy=Math.sqrt(d3.mean(points,p=>(p.y-my)**2));
      // Common camera scale keeps vertical positions fixed; only x visibly contracts.
      const anchorX=x(mx), anchorY=y(my), pixels=scale*sy;
      points=points.map(p=>({x:(p.x-mx)/sx,y:(p.y-my)/sy}));
      x=d3.scaleLinear().domain([0,1]).range([anchorX,anchorX+pixels]);
      y=d3.scaleLinear().domain([0,1]).range([anchorY,anchorY-pixels]);
    }
    q('#standardize').textContent=standardized?'Исходный масштаб':'Стандартизировать';
    q('#scale-status').textContent=standardized?'После стандартизации · K = 2':'Исходные координаты · K = 2';
    state=E.startKMeans(E.sample(points,+q('#k').value,seed));
    traces.selectAll('*').remove();setPhase('start');draw();showLoss(null);drawChart();controls();
    q('#iteration').textContent='Итерация 0';
    q('#explanation').textContent='Выбраны начальные центры. Следующий шаг назначит точки.';
  }
  async function changeScale() {
    if (busy) return;
    const previous=points.map(p=>({x:x(p.x),y:y(p.y)}));
    standardized=!standardized;
    setup();
    const token=generation;
    busy=true; controls(); q('#play').disabled=true;
    centerLayer.attr('visibility','hidden');
    q('#phase').textContent=standardized?'Стандартизация':'Исходный масштаб';
    q('#explanation').textContent='Меняется геометрия данных. Затем запускаем k-means заново; историю J очищаем.';
    const dots=pointLayer.selectAll('circle');
    dots.attr('cx',(d,i)=>previous[i].x).attr('cy',(d,i)=>previous[i].y);
    try {
      await dots.transition().duration(duration*1.6).ease(d3.easeCubicInOut)
        .attr('cx',d=>x(d.x)).attr('cy',d=>y(d.y)).end();
    } catch {return;}
    if(token!==generation)return;
    busy=false; centerLayer.attr('visibility',null); setPhase('start'); draw(); controls();
    q('#explanation').textContent=standardized
      ?'Оба признака стандартизированы. Начальные центры — те же объекты. Выполните Assignment step.'
      :'Исходные координаты восстановлены. Выполните Assignment step.';
  }
  async function next() {
    if(busy||state.done)return;
    const token=generation, previous=state;
    const target=E.stepKMeans(points,+q('#k').value,state,E.rng(seed));
    busy=true;controls();setPhase(target.phase);
    centerLayer.selectAll('.center').on('.drag',null).style('cursor','default');
    traces.selectAll('*').remove();
    q('#explanation').textContent=target.phase==='assign'?'Центры неподвижны. Цвет и линии показывают новые назначения.':'Метки неподвижны. Центры движутся к средним своих кластеров.';
    if(target.phase==='assign') {
      pointLayer.selectAll('circle').transition().duration(duration).attr('fill',(d,i)=>colors[target.labels[i]]);
      links.selectAll('line').data(points).join('line').attr('x1',d=>x(d.x)).attr('y1',d=>y(d.y))
        .attr('x2',(d,i)=>x(target.centers[target.labels[i]].x)).attr('y2',(d,i)=>y(target.centers[target.labels[i]].y))
        .attr('stroke',(d,i)=>colors[target.labels[i]]).attr('opacity',0).transition().duration(duration).attr('opacity',.16);
      // Во время перекрашивания метки дискретны: J показываем после завершения шага.
    } else {
      traces.selectAll('line').data(target.centers).join('line').attr('x1',(d,i)=>x(previous.centers[i].x)).attr('y1',(d,i)=>y(previous.centers[i].y))
        .attr('x2',d=>x(d.x)).attr('y2',d=>y(d.y)).attr('stroke',(d,i)=>colors[i]).attr('stroke-width',2).attr('stroke-dasharray','4 4');
      centerLayer.selectAll('.center').data(target.centers).transition().duration(duration).ease(d3.easeCubicInOut).attr('transform',d=>`translate(${x(d.x)},${y(d.y)})`);
      links.selectAll('line').transition().duration(duration).ease(d3.easeCubicInOut)
        .attr('x2',(d,i)=>x(target.centers[target.labels[i]].x)).attr('y2',(d,i)=>y(target.centers[target.labels[i]].y));
    }
    try {await svg.transition().duration(duration).ease(d3.easeCubicInOut).tween('loss',()=>t=>{
      if(target.phase!=='move')return;
      const centers=target.centers.map((c,i)=>({x:previous.centers[i].x+t*(c.x-previous.centers[i].x),y:previous.centers[i].y+t*(c.y-previous.centers[i].y)}));
      showLoss(E.loss(points,{centers,labels:target.labels}));
    }).end();} catch {return;}
    if(token!==generation)return;
    state=target;steps++;busy=false;
    losses.push({value:E.loss(points,state),phase:state.phase});draw();drawChart();showLoss(E.loss(points,state));
    q('#iteration').textContent=`Итерация ${state.iteration} · шаг ${steps}`;
    if(state.done){pause();q('#phase').textContent='Converged';q('#explanation').textContent='Assignment не изменил метки. Разбиение стабилизировалось.';}
    controls();
    if(playing)timer=setTimeout(next,650);
  }
  q('#assign').onclick=next;q('#update').onclick=next;q('#reset').onclick=setup;
  q('#standardize').onclick=changeScale;
  q('#new').onclick=()=>{seed+=7919;setup()};q('#dataset').onchange=()=>{seed=42;if(q('#dataset').value==='elongated')q('#k').value='2';setup()};q('#k').onchange=setup;
  q('#play').onclick=()=>{if(playing){pause();return;}playing=true;q('#play').textContent='Ⅱ Пауза';if(!busy)next();};
  window.addEventListener('message',event=>{if(event.data==='slide:stop')pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  setup();
})();
