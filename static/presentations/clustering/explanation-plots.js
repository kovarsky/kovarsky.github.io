(()=>{
 const D=window.explanationData,colors=['#339cff','#f3883b','#5dc977'];
 const format=(v,n=2)=>v.toLocaleString('ru-RU',{minimumFractionDigits:n,maximumFractionDigits:n});
 ScaleScene('#scale-before').render(D.scale.points,D.scale.before.labels,D.scale.before.centers,false);
 ScaleScene('#scale-after').render(D.scale.scaled,D.scale.after.labels,D.scale.after.centers,true);
 const cloud=D.silhouette,plot=d3.select('#silhouette-clouds');
 const ex=d3.extent(cloud.points,p=>p.x),ey=d3.extent(cloud.points,p=>p.y),unit=Math.min(650/(ex[1]-ex[0]),270/(ey[1]-ey[0]));
 const x=v=>360+(v-(ex[0]+ex[1])/2)*unit,y=v=>170-(v-(ey[0]+ey[1])/2)*unit;
 plot.selectAll('circle').data(cloud.points).join('circle').attr('cx',p=>x(p.x)).attr('cy',p=>y(p.y)).attr('r',4).attr('fill',(_,i)=>colors[cloud.labels[i]]).attr('opacity',.78);
 [{x:-5,y:1.2},{x:.3,y:-1.8},{x:3.5,y:2.8}].forEach((p,k)=>{
  plot.append('text').attr('x',x(p.x)).attr('y',y(p.y)).attr('text-anchor','middle').attr('font-size',24).attr('font-weight',600).style('fill',colors[k]).attr('stroke','white').attr('stroke-width',4).attr('paint-order','stroke').text('ABC'[k]);
  d3.select('#sil-cloud-'+k).text(format(cloud.clusterMeans[k]));
 });
 const positions=[{x:60,y:50},{x:100,y:50},{x:80,y:125},{x:180,y:50},{x:220,y:50},{x:200,y:125}];
 const examples=[{labels:D.ari.truth},...D.ari.examples];
 ['ari-reference','ari-match','ari-partial','ari-poor'].forEach((id,j)=>{
  const svg=d3.select('#'+id),sample=examples[j];
  positions.forEach((p,i)=>{
   svg.append('circle').attr('cx',p.x).attr('cy',p.y).attr('r',16).attr('fill',colors[sample.labels[i]]);
   svg.append('text').attr('x',p.x).attr('y',p.y+6).attr('text-anchor','middle').style('fill','#17212b').text(i+1);
  });
  if(j===2)svg.append('circle').attr('cx',positions[3].x).attr('cy',positions[3].y).attr('r',21).attr('fill','none').attr('stroke','#333').attr('stroke-width',1.5);
  if(j===0){svg.append('text').attr('x',80).attr('y',180).attr('text-anchor','middle').text('A');svg.append('text').attr('x',200).attr('y',180).attr('text-anchor','middle').text('B');}
  else d3.select('#'+id+'-score').text('ARI = '+format(sample.value,j===1?0:3));
 });
})();
