// Pause animations when their slide is no longer visible.
(()=>{
 function stopOutside(slide){document.querySelectorAll('.demo-frame').forEach(frame=>{if(!slide?.contains(frame))frame.contentWindow?.postMessage('slide:stop','*')});}
 function connect(){if(typeof Reveal==='undefined')return;Reveal.on('slidechanged',event=>stopOutside(event.currentSlide));}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',connect);else connect();
 window.addEventListener('pagehide',()=>stopOutside(null));
})();
