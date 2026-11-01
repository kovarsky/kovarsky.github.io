(function(root){
 const E=typeof module!=='undefined'&&module.exports?require('./vendor/engine.js'):root.Clustering;
 function comparison(points,k,seed){
  const sample=E.sample(points,k,seed),random=E.rng(seed+95);
  let plus=E.startKMeans(sample,true);
  while(plus.centers.length<k)plus=E.stepKMeans(points,k,plus,random);
  return [sample,plus.centers].map(centers=>{
   let s=E.startKMeans(centers);const states=[s],losses=[E.weights(points,centers).reduce((a,b)=>a+b,0)];
   for(let i=0;!s.done&&i<2000;i++){s=E.stepKMeans(points,k,s,random);states.push(s);losses.push(E.loss(points,s));}
   if(!s.done)throw Error('K-means did not converge');
   return {states,losses};
  });
 }
 function density(points,eps,minSamples){
  let s=E.startDBSCAN(points);const states=[s];
  for(let i=0;!s.done&&i<points.length+2;i++){s=E.stepDBSCAN(points,eps,minSamples,s);states.push(s);}
  if(!s.done)throw Error('DBSCAN did not finish');return states;
 }
 const api={comparison,density};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SlideModels=api;
})(typeof window!=='undefined'?window:globalThis);
