// Static clustering figures. Equal screen scale on x and y preserves geometry.
window.ScaleScene=function(selector,{width=570,height=350,radius=3.5}={}){
 const svg=d3.select(selector),colors=['#339cff','#f3883b'];
 function render(points,labels,centers,standardized){
  svg.selectAll('*').remove();
  const ex=d3.extent(points,p=>p.x),ey=d3.extent(points,p=>p.y),unit=Math.min((width-110)/(ex[1]-ex[0]+.6),(height-100)/(ey[1]-ey[0]+.6))*.88;
  const cx=(ex[0]+ex[1])/2,cy=(ey[0]+ey[1])/2,left=58,right=width-24,top=30,bottom=height-48,mx=(left+right)/2,my=(top+bottom)/2;
  const x=d3.scaleLinear().domain([cx+(left-mx)/unit,cx+(right-mx)/unit]).range([left,right]);
  const y=d3.scaleLinear().domain([cy-(bottom-my)/unit,cy-(top-my)/unit]).range([bottom,top]);
  const [a,b]=centers,dx=b.x-a.x,dy=b.y-a.y,offset=(b.x*b.x+b.y*b.y-a.x*a.x-a.y*a.y)/2;
  const rectangle=[[x.domain()[0],y.domain()[0]],[x.domain()[1],y.domain()[0]],[x.domain()[1],y.domain()[1]],[x.domain()[0],y.domain()[1]]];
  function halfPlane(sign){
   const inside=p=>sign*(dx*p[0]+dy*p[1]-offset),polygon=[];
   for(let i=0;i<rectangle.length;i++){
    const p=rectangle[i],q=rectangle[(i+1)%rectangle.length],u=inside(p),v=inside(q);
    if(u<=0)polygon.push(p);
    if((u<=0)!==(v<=0)){const t=u/(u-v);polygon.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}
   }
   return polygon.map(p=>`${x(p[0])},${y(p[1])}`).join(' ');
  }
  [1,-1].forEach((sign,i)=>svg.append('polygon').attr('points',halfPlane(sign)).attr('fill',colors[i]).attr('fill-opacity',.045));
  const clip=selector.slice(1)+'-clip';svg.append('defs').append('clipPath').attr('id',clip).append('rect').attr('x',left).attr('y',top).attr('width',right-left).attr('height',bottom-top);
  const ends=Math.abs(dy)>Math.abs(dx)?x.domain().map(px=>({x:px,y:(offset-dx*px)/dy})):y.domain().map(py=>({x:(offset-dy*py)/dx,y:py}));
  svg.append('line').attr('x1',x(ends[0].x)).attr('x2',x(ends[1].x)).attr('y1',y(ends[0].y)).attr('y2',y(ends[1].y)).attr('clip-path',`url(#${clip})`).attr('stroke','#626e7c').attr('stroke-width',1.8).attr('stroke-dasharray','7 6');
  svg.append('g').attr('class','scale-axis').attr('transform',`translate(0,${bottom})`).call(d3.axisBottom(x).ticks(7).tickFormat(d3.format('~g')));
  svg.append('g').attr('class','scale-axis').attr('transform',`translate(${left},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('~g')));
  svg.append('text').attr('class','scale-axis-name').attr('x',right).attr('y',height-10).attr('text-anchor','end').text(standardized?'z₁':'x₁');
  svg.append('text').attr('class','scale-axis-name').attr('x',left).attr('y',17).text(standardized?'z₂':'x₂');
  svg.selectAll('circle').data(points).join('circle').attr('r',radius).attr('cx',p=>x(p.x)).attr('cy',p=>y(p.y)).attr('fill',(_,i)=>colors[labels[i]]);
  centers.forEach((c,i)=>{const d=`M${x(c.x)-9},${y(c.y)}h18 M${x(c.x)},${y(c.y)-9}v18`;svg.append('path').attr('d',d).attr('stroke','white').attr('stroke-width',7);svg.append('path').attr('d',d).attr('stroke',colors[i]).attr('stroke-width',3)});
 }
 return {render};
};
