(()=>{
  const E=window.Clustering,D=window.structureModels;
  const colors=['#339cff','#f3883b','#5dc977','#aa79dc','#eb77b1','#379a9d','#b7a435','#a76e4d','#607d8b'];
  function projection(points,w=570,h=330,pad=45){
    const ex=d3.extent(points,p=>p.x),ey=d3.extent(points,p=>p.y);
    const scale=Math.min((w-2*pad)/(ex[1]-ex[0]),(h-2*pad)/(ey[1]-ey[0]));
    return p=>[w/2+(p.x-(ex[0]+ex[1])/2)*scale,h/2-(p.y-(ey[0]+ey[1])/2)*scale];
  }
  const dots=d3.select('#hierarchy-points'), dendro=d3.select('#hierarchy-tree');
  const project=projection(D.hierarchyPoints), order=[];
  function leaves(n){if(n.left){leaves(n.left);leaves(n.right);}else order.push(n.id);}
  leaves(D.tree);
  const dx=d3.scalePoint().domain(order).range([70,545]);
  const dy=d3.scaleLinear().domain([0,D.tree.height*1.08]).range([285,28]);
  const nodeX=n=>n.left?(nodeX(n.left)+nodeX(n.right))/2:dx(n.id);
  function hierarchy(){
    const height=+document.querySelector('#hierarchy-cut').value;
    const groups=E.cutAgglomerative(D.tree,height),labels=[];
    groups.forEach((g,k)=>g.members.forEach(i=>labels[i]=k));
    document.querySelector('#hierarchy-readout').textContent=`Высота ${height.toLocaleString('ru-RU',{maximumFractionDigits:1})} · групп: ${groups.length}`;
    dots.selectAll('*').remove();dendro.selectAll('*').remove();
    groups.forEach((g,k)=>{
      const outline=d3.polygonHull(g.members.flatMap(i=>Array.from({length:20},(_,j)=>{
        const p=project(D.hierarchyPoints[i]),a=2*Math.PI*j/20;return [p[0]+22*Math.cos(a),p[1]+22*Math.sin(a)];
      })));
      dots.append('path').attr('d','M'+outline.join('L')+'Z').attr('fill',colors[k]).attr('fill-opacity',.09).attr('stroke',colors[k]).attr('stroke-opacity',.5);
    });
    D.hierarchyPoints.forEach((p,i)=>{
      const [x,y]=project(p);
      dots.append('circle').attr('cx',x).attr('cy',y).attr('r',8).attr('fill',colors[labels[i]]);
      dots.append('text').attr('x',x).attr('y',y-14).attr('text-anchor','middle').text('ABCDEFGHI'[i]);
    });
    dendro.append('g').attr('transform','translate(45,0)').call(d3.axisLeft(dy).ticks(5).tickSize(-510)).call(g=>g.select('.domain').remove()).call(g=>g.selectAll('line').attr('stroke','#e5e9ee'));
    dendro.append('text').attr('x',12).attr('y',17).attr('font-size',15).text('Расстояние');
    function branch(n){if(!n.left)return;const same=n.members.every(i=>labels[i]===labels[n.members[0]]);
      dendro.append('path').attr('d',`M${nodeX(n.left)},${dy(n.left.height)}V${dy(n.height)}H${nodeX(n.right)}V${dy(n.right.height)}`)
        .attr('fill','none').attr('stroke',same?colors[labels[n.members[0]]]:'#9ba5af').attr('stroke-width',3);
      branch(n.left);branch(n.right);
    }
    branch(D.tree);
    dendro.append('line').attr('x1',45).attr('x2',555).attr('y1',dy(height)).attr('y2',dy(height)).attr('stroke','#c44d52').attr('stroke-width',2).attr('stroke-dasharray','7 5');
    order.forEach(i=>dendro.append('text').attr('x',dx(i)).attr('y',313).attr('text-anchor','middle').style('fill',colors[labels[i]]).text('ABCDEFGHI'[i]));
  }
  const slider=document.querySelector('#hierarchy-cut');slider.max=(D.tree.height+.4).toFixed(1);slider.oninput=hierarchy;hierarchy();
  const gp=projection(D.graphPoints);
  function graph(){
    const k=+document.querySelector('#graph-k').value,labels=D.cutTree(k);
    document.querySelector('#graph-readout').textContent=`K = ${k} · удалено рёбер: ${k-1}`;
    ['#mst-before','#mst-after'].forEach((id,panel)=>{
      const svg=d3.select(id);svg.selectAll('*').remove();
      D.mst.forEach((e,i)=>{
        const [x1,y1]=gp(D.graphPoints[e.a]),[x2,y2]=gp(D.graphPoints[e.b]),cut=i<k-1;
        if(panel&&cut)return;
        svg.append('line').attr('x1',x1).attr('y1',y1).attr('x2',x2).attr('y2',y2)
          .attr('stroke',cut?'#c44d52':panel?colors[labels[e.a]]:'#a3afbb').attr('stroke-width',cut?3:2).attr('stroke-dasharray',cut?'7 5':null);
        if(cut)svg.append('path').attr('d',`M${(x1+x2)/2-5},${(y1+y2)/2-5}l10,10m0,-10l-10,10`).attr('stroke','#c44d52').attr('stroke-width',2.5);
      });
      D.graphPoints.forEach((p,i)=>{const [x,y]=gp(p);svg.append('circle').attr('cx',x).attr('cy',y).attr('r',4.8).attr('fill',panel?colors[labels[i]]:'#718295').attr('stroke','white').attr('stroke-width',1);});
    });
  }
  document.querySelector('#graph-k').oninput=graph;graph();
})();
