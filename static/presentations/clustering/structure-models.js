/* Deterministic examples for the hierarchy and graph slides. */
(function(root){
  const E=typeof module==='object'?require('./vendor/engine.js'):root.Clustering;
  const hierarchyPoints=[{x:0,y:0},{x:.7,y:.4},{x:.25,y:1.1},{x:3.8,y:.3},{x:4.7,y:.1},{x:4.3,y:1.2},{x:7.6,y:2.6},{x:8.5,y:2.4},{x:8.1,y:3.5}];
  let hierarchy=E.startAgglomerative(hierarchyPoints);
  while(!hierarchy.done)hierarchy=E.stepAgglomerative(hierarchyPoints,'complete',hierarchy);
  const tree=hierarchy.groups[0];
  const graphPoints=E.generate('moons').filter((_,i)=>i%4===0);
  function components(n,edges){
    const parent=Array.from({length:n},(_,i)=>i);
    const find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));
    for(const {a,b} of edges)parent[find(a)]=find(b);
    const roots=parent.map((_,i)=>find(i)),unique=[...new Set(roots)];
    return roots.map(r=>unique.indexOf(r));
  }
  // Prim's algorithm on the complete Euclidean graph.
  const seen=new Set([0]),mst=[];
  while(seen.size<graphPoints.length){
    let best={weight:Infinity};
    for(const a of seen)for(let b=0;b<graphPoints.length;b++)if(!seen.has(b)){
      const weight=Math.sqrt(E.distance2(graphPoints[a],graphPoints[b]));
      if(weight<best.weight)best={a,b,weight};
    }
    mst.push(best);seen.add(best.b);
  }
  mst.sort((a,b)=>b.weight-a.weight);
  const cutTree=k=>components(graphPoints.length,mst.slice(k-1));
  const api={hierarchyPoints,tree,graphPoints,mst,cutTree};
  if(typeof module==='object')module.exports=api;else root.structureModels=api;
})(typeof window==='undefined'?globalThis:window);
