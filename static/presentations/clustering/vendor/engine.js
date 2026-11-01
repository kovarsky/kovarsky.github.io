/* Pure, deterministic algorithm steps shared by the animation and checks. */
(function (root) {
  const copy = centers => centers.map(p => ({...p}));
  const distance2 = (a, b) => (a.x-b.x)**2 + (a.y-b.y)**2;
  function rng(seed) {
    return () => { seed=(1664525*seed+1013904223)>>>0; return (seed+.5)/4294967296; };
  }
  function generate(kind) {
    const random=rng(19);
    const normal=()=>Math.sqrt(-2*Math.log(random()))*Math.cos(2*Math.PI*random());
    if(kind==='elongated') {
      const draw=rng(73),gaussian=()=>Math.sqrt(-2*Math.log(draw()))*Math.cos(2*Math.PI*draw());
      const cloud=Array.from({length:80},()=>({x:9*Math.max(-2.2,Math.min(2.2,gaussian())),y:.8*Math.max(-1.8,Math.min(1.8,gaussian()))}));
      return [...cloud.map(p=>({x:p.x,y:p.y-2})),...cloud.map(p=>({x:p.x,y:p.y+2}))];
    }
    if(kind==='uniform')return Array.from({length:180},()=>({x:8*random()-4,y:6*random()-3}));
    const cloudCenters={blobs2:[[-2.6,0],[2.6,0]],blobs:[[-3,-1.4],[0,2.5],[3.1,-.8]],blobs4:[[-3,-2],[-3,2],[3,-2],[3,2]]};
    if(cloudCenters[kind])return cloudCenters[kind].flatMap(([x,y])=>Array.from({length:60},()=>({x:x+.72*normal(),y:y+.72*normal()})));
    return Array.from({length:240},(_,i)=>{
      if(kind==='moons') {const t=Math.PI*(i%120)/119,second=i>=120;return {x:3*(second?1-Math.cos(t):Math.cos(t))+.09*normal(),y:3*(second?.5-Math.sin(t):Math.sin(t))+.09*normal()};}
      const t=2*Math.PI*(i%120)/120,r=i<120?1.6:3.5;
      return {x:r*Math.cos(t)+.075*normal(),y:r*Math.sin(t)+.075*normal()};
    });
  }
  function sample(points,k,seed) {
    const random=rng(seed),shuffled=points.slice();
    for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
    return copy(shuffled.slice(0,k));
  }
  function startKMeans(centers,plus=false) {
    return {centers:copy(plus?centers.slice(0,1):centers),labels:null,phase:plus?'seed':'start',iteration:0,done:false};
  }
  const weights=(points,centers)=>points.map(p=>Math.min(...centers.map(c=>distance2(p,c))));
  function stepKMeans(points,k,s,random) {
    if(s.done) return s;
    if(s.phase==='seed'&&s.centers.length<k) {
      const w=weights(points,s.centers),total=w.reduce((a,b)=>a+b,0);
      let target=random()*total,chosen=w.findIndex(v=>v>0);
      if(total>0){for(let i=0;i<w.length;i++){target-=w[i];if(w[i]>0&&target<0){chosen=i;break;}}}else chosen=0;
      return {...s,centers:[...copy(s.centers),{...points[chosen]}]};
    }
    if(s.phase!=='assign') {
      const labels=points.map(p=>{let best=0;for(let j=1;j<s.centers.length;j++)if(distance2(p,s.centers[j])<distance2(p,s.centers[best]))best=j;return best;});
      return {centers:copy(s.centers),labels,phase:'assign',iteration:s.iteration+1,done:s.labels!==null&&labels.every((v,i)=>v===s.labels[i])};
    }
    let empty=0;
    const centers=s.centers.map((c,k)=>{const group=points.filter((p,i)=>s.labels[i]===k);if(!group.length){empty++;return {...c};}return {x:group.reduce((a,p)=>a+p.x,0)/group.length,y:group.reduce((a,p)=>a+p.y,0)/group.length};});
    return {centers,labels:s.labels.slice(),phase:'move',iteration:s.iteration,done:false,empty};
  }
  const loss=(points,s)=>s.labels?points.reduce((sum,p,i)=>sum+distance2(p,s.centers[s.labels[i]]),0):null;
  function tracePlus(points,k,centers,seed) {
    const random=rng(seed),initial=startKMeans(centers,true);let state=initial;
    const trace=[];
    while(!state.done){state=stepKMeans(points,k,state,random);if(state.labels)trace.push(state);}
    return {initial:trace[0]?{...trace[0],labels:null,phase:'start',iteration:0,done:false}:initial,trace};
  }
  function startDBSCAN(points) {
    return {labels:points.map(()=>-2),visited:points.map(()=>false),core:points.map(()=>null),queue:[],queued:points.map(()=>false),cluster:-1,focus:null,neighbors:[],phase:'start',done:false,message:'Выберите ε и min_samples, затем начните обход.'};
  }
  function stepDBSCAN(points,eps,minSamples,s) {
    if(s.done)return s;
    const n={...s,labels:s.labels.slice(),visited:s.visited.slice(),core:s.core.slice(),queue:s.queue.slice(),queued:s.queued.slice(),phase:'query'};
    let i;
    while(n.queue.length){const candidate=n.queue.shift();if(!n.visited[candidate]){i=candidate;break;}}
    const newCluster=i===undefined;
    if(newCluster){i=n.visited.findIndex(v=>!v);n.queued.fill(false);}
    if(i<0){n.done=true;n.message='Обход завершён.';return n;}
    n.focus=i;n.visited[i]=true;
    n.neighbors=points.map((p,j)=>distance2(p,points[i])<=eps*eps+1e-12?j:-1).filter(j=>j>=0);
    n.core[i]=n.neighbors.length>=minSamples;
    if(newCluster&&!n.core[i]){
      n.labels[i]=-1;n.message=`Точка №${i+1}: ${n.neighbors.length} соседей < ${minSamples}. Пока шум; позже она может стать граничной.`;
    }else{
      if(newCluster)n.cluster++;
      n.labels[i]=n.cluster;
      if(n.core[i]){
        let promoted=0;
        for(const j of n.neighbors){
          if(n.labels[j]===-1)promoted++;
          if(n.labels[j]<0)n.labels[j]=n.cluster;
          if(!n.visited[j]&&!n.queued[j]){n.queue.push(j);n.queued[j]=true;}
        }
        n.message=`Точка №${i+1}: ${n.neighbors.length} соседей ≥ ${minSamples}. Ядровая; расширяем кластер ${n.cluster+1}.`+(promoted?` Точек из шума: ${promoted}.`:'');
      }else n.message=`Точка №${i+1}: ${n.neighbors.length} соседей < ${minSamples}. Граничная; дальше кластер не расширяет.`;
    }
    n.done=n.visited.every(Boolean)&&!n.queue.length;
    return n;
  }
  function startAgglomerative(points) {
    const groups=points.map((p,i)=>({id:i,members:[i],height:0,left:null,right:null}));
    return {groups,nodes:groups.slice(),labels:points.map((p,i)=>i),centers:[],merge:null,done:groups.length<=1,phase:'merge'};
  }
  function stepAgglomerative(points,linkage,s) {
    if(s.done)return s;
    let best=Infinity,first=0,second=1;
    for(let a=0;a<s.groups.length;a++)for(let b=a+1;b<s.groups.length;b++){
      let distance=linkage==='single'?Infinity:0;
      for(const i of s.groups[a].members)for(const j of s.groups[b].members){
        const d=Math.sqrt(distance2(points[i],points[j]));
        distance=linkage==='single'?Math.min(distance,d):Math.max(distance,d);
      }
      if(distance<best){best=distance;first=a;second=b;}
    }
    const left=s.groups[first],right=s.groups[second];
    const merge={id:s.nodes.length,members:[...left.members,...right.members].sort((a,b)=>a-b),height:best,left,right};
    const groups=s.groups.filter((g,i)=>i!==first&&i!==second).concat(merge).sort((a,b)=>a.members[0]-b.members[0]);
    const labels=points.map(()=>-1);groups.forEach((g,i)=>g.members.forEach(j=>labels[j]=i));
    return {groups,nodes:[...s.nodes,merge],labels,centers:[],merge,done:groups.length===1,phase:'merge'};
  }
  function cutAgglomerative(tree,height) {
    if(!tree.left||tree.height<=height)return [tree];
    return [...cutAgglomerative(tree.left,height),...cutAgglomerative(tree.right,height)].sort((a,b)=>a.members[0]-b.members[0]);
  }
  function distanceMatrix(points){
    return points.map(a=>points.map(b=>Math.sqrt(distance2(a,b))));
  }
  function silhouette(points,labels,matrix=distanceMatrix(points)){
    const unique=[...new Set(labels)];
    if(unique.length<2||unique.length>=points.length)return null;
    const ids=new Map(unique.map((v,i)=>[v,i])),counts=unique.map(()=>0),encoded=labels.map(v=>ids.get(v));
    encoded.forEach(g=>counts[g]++);
    const values=points.map((p,i)=>{
      const own=encoded[i];if(counts[own]===1)return 0;
      const sums=unique.map(()=>0);encoded.forEach((g,j)=>{sums[g]+=matrix[i][j];});
      const a=sums[own]/(counts[own]-1);
      let b=Infinity;counts.forEach((n,g)=>{if(g!==own)b=Math.min(b,sums[g]/n);});
      return Math.max(a,b)>0?(b-a)/Math.max(a,b):0;
    });
    return {mean:values.reduce((a,b)=>a+b,0)/values.length,values};
  }
  function evaluateK(points,k,{runs=5,plus=true,seed=42,matrix=distanceMatrix(points)}={}){
    if(!Number.isInteger(k)||k<1||k>points.length||!Number.isInteger(runs)||runs<1)throw new Error('Invalid k or runs');
    const trials=[];let best=null;
    for(let r=0;r<runs;r++){
      const runSeed=seed+k*1009+r*7919,random=rng(runSeed+95);
      let state=startKMeans(sample(points,k,runSeed),plus),steps=0;
      while(!state.done&&steps++<2000)state=stepKMeans(points,k,state,random);
      if(!state.done)throw new Error('K-means did not converge');
      const inertia=loss(points,state),score=silhouette(points,state.labels,matrix)?.mean??null;
      trials.push({inertia,silhouette:score});
      if(!best||inertia<best.inertia)best={state,inertia,silhouette:score,occupied:new Set(state.labels).size};
    }
    const scores=trials.map(r=>r.silhouette).filter(v=>v!==null);
    return {k,...best,runs,trials,inertiaMin:Math.min(...trials.map(r=>r.inertia)),inertiaMax:Math.max(...trials.map(r=>r.inertia)),silhouetteMin:scores.length?Math.min(...scores):null,silhouetteMax:scores.length?Math.max(...scores):null};
  }
  const api={copy,distance2,rng,generate,sample,startKMeans,weights,stepKMeans,loss,tracePlus,startDBSCAN,stepDBSCAN,startAgglomerative,stepAgglomerative,cutAgglomerative,distanceMatrix,silhouette,evaluateK};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Clustering=api;
})(typeof window!=='undefined'?window:globalThis);
