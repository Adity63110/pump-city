/* ── LOFI TOGGLE ── */
function toggleLofi(){
  const audio=document.getElementById('lofi-audio');
  const btn=document.getElementById('lofi-btn');
  if(audio.paused){audio.volume=0.35;audio.play();btn.classList.add('lofi-on');btn.textContent='■ LOFI';}
  else{audio.pause();btn.classList.remove('lofi-on');btn.textContent='♫ LOFI';}
}
/* ── REPLAY INTRO ── */
function replayIntro(){
  const intro=document.getElementById('intro');
  const hp=document.getElementById('homepage');
  if(!intro)return;
  // Hide homepage, show intro fresh
  hp.classList.add('out');
  intro.classList.remove('out');
  intro.style.opacity='1';
  intro.style.pointerEvents='all';
  // Reset intro lines
  ['il1','il2','il3','il4'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){el.classList.remove('show','hide');}
  });
  // Re-run the intro sequence — reuse existing playIntro if available
  setTimeout(()=>{if(typeof playIntro==='function')playIntro();},100);
}