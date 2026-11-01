(()=>{
const C=['#339cff','#f3883b','#5dc977'];
function dots(id,colored,w=530,h=310){const svg=d3.select(id),pts=d3.range(54).map(i=>{let g=i%3,t=i*2.4,r=12+(i%11)*3;return{x:[w*.23,w*.52,w*.78][g]+Math.cos(t)*r,y:[h*.62,h*.27,h*.65][g]+Math.sin(t)*r,g}});svg.selectAll('circle').data(pts).join('circle').attr('cx',d=>d.x).attr('cy',d=>d.y).attr('r',5).attr('fill',d=>colored?C[d.g]:'#8a9892');return{svg,pts}}
dots('#output-points',true);

dots('#cluster-compact',true,530,280);
const rings=d3.select('#cluster-connected');
const ringPoints=d3.range(110).map(i=>{const g=i<55?0:1,t=2*Math.PI*(i%55)/55,r=(g?104:53)+3*Math.sin(i*7);return{x:265+r*Math.cos(t),y:140+r*Math.sin(t),g};});
rings.selectAll('circle').data(ringPoints).join('circle').attr('cx',d=>d.x).attr('cy',d=>d.y).attr('r',4).attr('fill',d=>C[d.g]);
const dist=d3.select('#distance-picture');
dist.append('path').attr('d','M90,155H410V40').attr('fill','none').attr('stroke','#a6b2c0').attr('stroke-dasharray','5 5').attr('stroke-width',2);
dist.append('line').attr('x1',90).attr('y1',155).attr('x2',410).attr('y2',40).attr('stroke',C[0]).attr('stroke-width',3);
[[90,155,'x'],[410,40,'y']].forEach(([x,y,t])=>{dist.append('circle').attr('cx',x).attr('cy',y).attr('r',6).attr('fill',C[0]);dist.append('text').attr('x',x-22).attr('y',y-12).attr('font-size',20).text(t)});
[[230,185,'|x₁ − y₁|'],[420,104,'|x₂ − y₂|'],[225,75,'d(x, y)']].forEach(([x,y,t])=>dist.append('text').attr('x',x).attr('y',y).attr('font-size',18).text(t));
const intro=dots('#intro-centers',true,610,350);
const meanCenters=C.map((_,g)=>{const members=intro.pts.filter(p=>p.g===g);return{x:d3.mean(members,p=>p.x),y:d3.mean(members,p=>p.y)}});
intro.svg.insert('g',':first-child').selectAll('line').data(intro.pts).join('line').attr('x1',p=>p.x).attr('y1',p=>p.y).attr('x2',p=>meanCenters[p.g].x).attr('y2',p=>meanCenters[p.g].y).attr('stroke',p=>C[p.g]).attr('opacity',.2);
meanCenters.forEach(({x,y},g)=>{intro.svg.append('path').attr('d',`M${x-12},${y}h24 M${x},${y-12}v24`).attr('stroke','white').attr('stroke-width',9);intro.svg.append('path').attr('d',`M${x-12},${y}h24 M${x},${y-12}v24`).attr('stroke',C[g]).attr('stroke-width',4)});
})();
