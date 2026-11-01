(() => {
  const D=window.lectureData, colors=['#339cff','#f3883b','#5dc977','#aa79dc'];
  function chart(id,key,label,rows) {
    const svg=d3.select(id), x=d3.scaleLinear().domain([1,8]).range([72,545]);
    const y=d3.scaleLinear().domain([0,key==='silhouette'?1:d3.max(rows,r=>r[key])*1.08]).nice().range([310,28]);
    svg.append('g').attr('transform','translate(0,310)').call(d3.axisBottom(x).ticks(8).tickFormat(d3.format('d')));
    svg.append('g').attr('transform','translate(72,0)').call(d3.axisLeft(y).ticks(5));
    svg.append('text').attr('x',78).attr('y',19).text(label);
    svg.append('text').attr('x',545).attr('y',354).attr('text-anchor','end').text('Число кластеров K');
    svg.append('path').datum(rows).attr('fill','none').attr('stroke',colors[0]).attr('stroke-width',3).attr('d',d3.line().x(d=>x(d.k)).y(d=>y(d[key])));
    svg.selectAll('circle').data(rows).join('circle').attr('cx',d=>x(d.k)).attr('cy',d=>y(d[key])).attr('r',5).attr('fill',colors[0]).append('title').text(d=>`K=${d.k}, ${label}=${d[key].toFixed(3)}`);
  }
  chart('#inertia-chart','inertia','J',D.scores);
  for (const k of [2,3,4]) {
    const labels=D.scores.find(r=>r.k===k).labels,svg=d3.select(`#candidate-k${k}`);
    const ex=d3.extent(D.points,p=>p.x),ey=d3.extent(D.points,p=>p.y);
    const scale=Math.min(340/(ex[1]-ex[0]),220/(ey[1]-ey[0]));
    svg.selectAll('circle').data(D.points).join('circle')
      .attr('cx',p=>190+(p.x-(ex[0]+ex[1])/2)*scale)
      .attr('cy',p=>130-(p.y-(ey[0]+ey[1])/2)*scale)
      .attr('r',3.4).attr('fill',(_,i)=>colors[labels[i]]);
  }
  function plot(id,labels,centers) {
    const svg=d3.select(id),x=d3.scaleLinear().domain([-4.2,5.2]).range([110,440]),y=d3.scaleLinear().domain([-4.2,5.2]).range([340,10]);
    svg.selectAll('circle').data(D.rings).join('circle').attr('cx',p=>x(p.x)).attr('cy',p=>y(p.y)).attr('r',3.8).attr('fill',(_,i)=>labels[i]<0?'#78838d':colors[labels[i]]);
    if(centers){
      // Exact perpendicular bisector of the two centers, clipped by the plot viewport.
      const [a,b]=centers,dx=b.x-a.x,dy=b.y-a.y,t=(b.x*b.x+b.y*b.y-a.x*a.x-a.y*a.y)/2;
      const clip=id.slice(1)+'-clip';
      svg.append('defs').append('clipPath').attr('id',clip).append('rect').attr('x',110).attr('y',10).attr('width',330).attr('height',330);
      const ends=Math.abs(dy)>Math.abs(dx)?[-8,8].map(px=>({x:px,y:(t-dx*px)/dy})):[-8,8].map(py=>({x:(t-dy*py)/dx,y:py}));
      svg.append('line').attr('x1',x(ends[0].x)).attr('y1',y(ends[0].y)).attr('x2',x(ends[1].x)).attr('y2',y(ends[1].y)).attr('stroke','#8b96a2').attr('stroke-dasharray','6 6').attr('clip-path',`url(#${clip})`);
      centers.forEach((p,i)=>svg.append('path').attr('d',`M${x(p.x)-9},${y(p.y)}h18 M${x(p.x)},${y(p.y)-9}v18`).attr('stroke',colors[i]).attr('stroke-width',4));
    }
  }
  // Exact synthetic DBSCAN example: epsilon=1, min_samples=5, self included.
  const dbPoints=[{x:0,y:0,name:'A'},{x:.2,y:.2},{x:-.2,y:.2},{x:.2,y:-.2},{x:-.2,y:-.2},{x:.95,y:0,name:'B'},{x:2.35,y:.25,name:'C'}];
  const dbNear=i=>dbPoints.map((p,j)=>(p.x-dbPoints[i].x)**2+(p.y-dbPoints[i].y)**2<=1+1e-12?j:-1).filter(j=>j>=0);
  const dbCore=dbPoints.map((_,i)=>dbNear(i).length>=5);
  const dbType=dbPoints.map((_,i)=>dbCore[i]?'core':dbNear(i).some(j=>dbCore[j])?'border':'noise');
  const dbColors={core:'#339cff',border:'#e47d2d',noise:'#737e8b'};
  for(const [id,focus] of [['#db-core-example',0],['#db-border-example',5],['#db-noise-example',6]]){
    const svg=d3.select(id),x=v=>100+v*75,y=v=>140-v*75,c=dbColors[dbType[focus]],cx=x(dbPoints[focus].x),cy=y(dbPoints[focus].y);
    svg.append('circle').attr('cx',cx).attr('cy',cy).attr('r',75).attr('fill',c).attr('fill-opacity',.06).attr('stroke',c).attr('stroke-width',1.5).attr('stroke-dasharray','5 4');
    svg.append('line').attr('x1',cx).attr('x2',cx+75).attr('y1',cy).attr('y2',cy).attr('stroke',c).attr('stroke-dasharray','3 4');
    svg.append('text').attr('x',cx+48).attr('y',cy-8).text('ε');
    dbPoints.forEach((p,i)=>{
      if(dbType[i]==='noise')svg.append('path').attr('d',`M${x(p.x)-5},${y(p.y)-5}l10,10 M${x(p.x)-5},${y(p.y)+5}l10,-10`).attr('stroke',dbColors.noise).attr('stroke-width',2.5);
      else svg.append('circle').attr('cx',x(p.x)).attr('cy',y(p.y)).attr('r',6).attr('fill',dbCore[i]?dbColors.core:'white').attr('stroke',dbColors[dbType[i]]).attr('stroke-width',2.5);
      if(p.name)svg.append('text').attr('x',x(p.x)).attr('y',y(p.y)-(i===0?36:20)).attr('text-anchor','middle').attr('font-weight',600).text(p.name);
    });
    svg.append('circle').attr('cx',cx).attr('cy',cy).attr('r',10).attr('fill','none').attr('stroke',c).attr('stroke-width',1.5);
  }
  plot('#rings-kmeans',D.kmeans.labels,D.kmeans.centers);
  plot('#rings-target',D.target);
  plot('#rings-dbscan',D.dbscan);
})();
