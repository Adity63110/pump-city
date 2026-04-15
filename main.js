'use strict';
/* ════════════════════════════════════════
   CONFIG
════════════════════════════════════════ */
const BSPC=7,ROAD=10,BLK=5,STRIDE=BLK*BSPC+ROAD;
const MAX_T=150,FLY_S=1.2,MS=0.0018,MAX_V=22;
const MAX_SPEED=5.5,MIN_SPEED=0.4,BASE_SPEED=FLY_S;

// Theme color configs (as hex numbers for Three.js)
const THEMES={
  neon:{sky:0x060010,fog:0x0b0022,gnd:0x090010,rd:0x0d0020,bA:0x130035,bB:0x1c004a,acc:0xff2af4,acc2:0x9b00ff,gl:0xff2af4,win:0xdd44ff,up:0x00ff88,dn:0xff3855},
  cyber:{sky:0x000d1a,fog:0x001122,gnd:0x000b14,rd:0x001020,bA:0x001833,bB:0x002244,acc:0x00e5ff,acc2:0x0066ff,gl:0x00e5ff,win:0x44aaff,up:0x00ff88,dn:0xff3855},
  gold:{sky:0x0d0800,fog:0x1a1000,gnd:0x0a0600,rd:0x0f0900,bA:0x1a1000,bB:0x251800,acc:0xffd700,acc2:0xff8c00,gl:0xffd700,win:0xffcc44,up:0x00ff88,dn:0xff3855},
  matrix:{sky:0x000300,fog:0x001100,gnd:0x000200,rd:0x000500,bA:0x001200,bB:0x001800,acc:0x00ff41,acc2:0x008f11,gl:0x00ff41,win:0x44ff88,up:0x00ff41,dn:0xff5252},
  void:{sky:0x08001a,fog:0x100028,gnd:0x060014,rd:0x090018,bA:0x18004a,bB:0x220066,acc:0xe040fb,acc2:0x7c4dff,gl:0xe040fb,win:0xcc88ff,up:0x69f0ae,dn:0xff5252}
};
let C={...THEMES.neon};
let currentTheme='neon';

/* ════════════════════════════════════════
   STATE
════════════════════════════════════════ */
let S,cam,ren,rc,clk;
let tokens=[],blds=[];
let keys={},yaw=0,pitch=0,vel;
let mmC=null;
let vehs=[],vG=null;
let rGeo=null,rPts=null;
let moonMesh=null;
let planeMesh=null,propellerMesh=null,planeRoll=0,planePitch=0,planeThrottle=0.5,planeSpeed=FLY_S,flySpeed=FLY_S;
let mode='none',svgD='';
let orb={th:.5,ph:1.05,r:280,tx:0,ty:0,tz:0};
let drag={on:false,x:0,y:0};
let anim=null,locked=false,toastT=null;
let attCtx=null;
let introPlaying=false,introDone=false;

/* ════════════════════════════════════════
   LOADING SCREEN STARS
════════════════════════════════════════ */
function genStars(){
  const c=document.getElementById('ld-stars');
  let h='';
  for(let i=0;i<120;i++){
    const x=Math.random()*100,y=Math.random()*100;
    const s=0.5+Math.random()*1.8,o=0.15+Math.random()*.7;
    const d=Math.random()*3;
    h+=`<div style="position:absolute;left:${x}%;top:${y}%;width:${s}px;height:${s}px;border-radius:50%;background:#fff;opacity:${o};animation:twinkle ${1.5+d}s ease-in-out infinite ${d}s;"></div>`;
  }
  c.innerHTML=h;
  // add twinkle style
  const st=document.createElement('style');
  st.textContent='@keyframes twinkle{0%,100%{opacity:var(--o,0.4)}50%{opacity:0.05}}';
  document.head.appendChild(st);
}

/* ════════════════════════════════════════
   INTRO CINEMATIC
════════════════════════════════════════ */
function genIntroStars(){
  const c=document.getElementById('intro-stars');
  if(!c)return;
  let h='';
  for(let i=0;i<200;i++){
    const x=Math.random()*100,y=Math.random()*60;
    const s=0.4+Math.random()*2,o=0.1+Math.random()*.8;
    const d=Math.random()*5;
    h+=`<div style="position:absolute;left:${x}%;top:${y}%;width:${s}px;height:${s}px;border-radius:50%;background:#fff;opacity:${o};animation:twinkle ${2+d}s ease-in-out infinite ${d}s;"></div>`;
  }
  c.innerHTML=h;
}

function drawIntroCity(){
  const canvas=document.getElementById('intro-canvas');
  if(!canvas)return;
  const W=canvas.width=window.innerWidth;
  const H=canvas.height=Math.round(window.innerHeight*0.65);
  const ctx=canvas.getContext('2d');

  // Sky gradient
  const sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#000010');sky.addColorStop(0.5,'#050020');sky.addColorStop(1,'#0a0030');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);

  // Stars in sky
  for(let i=0;i<180;i++){
    const sx=Math.random()*W,sy=Math.random()*(H*0.45);
    const sr=0.3+Math.random()*1.2,sa=0.2+Math.random()*0.8;
    ctx.fillStyle=`rgba(255,255,255,${sa})`;
    ctx.beginPath();ctx.arc(sx,sy,sr,0,Math.PI*2);ctx.fill();
  }

  // Ground line
  const groundY=H*0.72;
  ctx.fillStyle='#06000e';ctx.fillRect(0,groundY,W,H-groundY);

  // City buildings — dense, layered
  const seed=12345;
  const rng=(n)=>{let x=Math.sin(n*seed)*43758.5453;return x-Math.floor(x);};

  // Background layer — tiny distant buildings
  for(let i=0;i<180;i++){
    const bx=rng(i*3)*W;
    const bw=4+rng(i*3+1)*14;
    const bh=8+rng(i*3+2)*40;
    const by=groundY-bh;
    const bright=20+Math.floor(rng(i*7)*30);
    ctx.fillStyle=`rgb(${bright},${bright},${bright+10})`;
    ctx.fillRect(bx,by,bw,bh);
    // Tiny windows
    if(rng(i*11)>0.5){
      ctx.fillStyle=`rgba(100,100,255,${0.3+rng(i*13)*0.5})`;
      ctx.fillRect(bx+1,by+2,2,2);
    }
  }

  // Mid layer — medium buildings with more window detail
  for(let i=0;i<100;i++){
    const bx=rng(i*7+10)*W;
    const bw=10+rng(i*7+11)*28;
    const bh=25+rng(i*7+12)*90;
    const by=groundY-bh;
    const blue=30+Math.floor(rng(i*17)*50);
    ctx.fillStyle=`rgb(${blue},${blue},${blue+20})`;
    ctx.fillRect(bx,by,bw,bh);
    // Windows grid
    const rows=Math.floor(bh/8),cols=Math.max(1,Math.floor(bw/7));
    for(let r=0;r<rows;r++){
      for(let cc=0;cc<cols;cc++){
        if(rng(i*100+r*10+cc)>0.35){
          const wa=0.3+rng(i*50+r+cc)*0.7;
          const wc=rng(i*20+r*3+cc)>0.7?`rgba(180,100,255,${wa})`:`rgba(80,120,255,${wa})`;
          ctx.fillStyle=wc;
          ctx.fillRect(bx+2+cc*7,by+3+r*8,4,5);
        }
      }
    }
  }

  // Foreground landmarks — tall buildings in center
  const landmarks=[
    {x:W*0.5,w:28,h:H*0.62,style:'burj'},
    {x:W*0.44,w:20,h:H*0.48,style:'box'},
    {x:W*0.56,w:22,h:H*0.44,style:'box'},
    {x:W*0.38,w:18,h:H*0.38,style:'box'},
    {x:W*0.62,w:18,h:H*0.36,style:'box'},
    {x:W*0.32,w:15,h:H*0.32,style:'box'},
    {x:W*0.68,w:16,h:H*0.30,style:'box'},
  ];
  landmarks.forEach(lm=>{
    const by=groundY-lm.h;
    // Building body
    ctx.fillStyle='#0c0018';
    ctx.fillRect(lm.x-lm.w/2,by,lm.w,lm.h);
    // Windows
    const rows=Math.floor(lm.h/9),cols=Math.max(1,Math.floor(lm.w/8));
    for(let r=0;r<rows;r++){
      for(let cc=0;cc<cols;cc++){
        if(Math.random()>0.25){
          const alpha=0.4+Math.random()*0.6;
          ctx.fillStyle=Math.random()>0.6?`rgba(200,80,255,${alpha})`:`rgba(100,140,255,${alpha})`;
          ctx.fillRect(lm.x-lm.w/2+2+cc*8,by+3+r*9,5,6);
        }
      }
    }
    // Burj spire
    if(lm.style==='burj'){
      ctx.fillStyle='rgba(255,42,244,0.8)';
      ctx.beginPath();ctx.moveTo(lm.x,by-H*0.12);ctx.lineTo(lm.x-2,by);ctx.lineTo(lm.x+2,by);ctx.closePath();ctx.fill();
      // Glow
      ctx.shadowBlur=30;ctx.shadowColor='rgba(255,42,244,0.9)';
      ctx.fillStyle='rgba(255,42,244,0.6)';
      ctx.beginPath();ctx.arc(lm.x,by-H*0.12,3,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
    }
    // Roof accent line
    const roofColor=Math.random()>0.5?'rgba(255,42,244,0.7)':'rgba(0,220,255,0.6)';
    ctx.fillStyle=roofColor;ctx.fillRect(lm.x-lm.w/2,by,lm.w,2);
  });

  // Ground glow
  const grd=ctx.createLinearGradient(0,groundY-20,0,groundY+20);
  grd.addColorStop(0,'transparent');
  grd.addColorStop(0.5,'rgba(100,0,150,0.3)');
  grd.addColorStop(1,'transparent');
  ctx.fillStyle=grd;ctx.fillRect(0,groundY-20,W,40);

  // Bottom atmospheric haze
  const haze=ctx.createLinearGradient(0,groundY-80,0,H);
  haze.addColorStop(0,'transparent');
  haze.addColorStop(1,'rgba(6,0,14,1)');
  ctx.fillStyle=haze;ctx.fillRect(0,groundY-80,W,H-(groundY-80));

  canvas.classList.add('visible');
}

function playIntro(){
  if(introDone){goHome();return;}
  introPlaying=true;
  genIntroStars();

  // Draw the 2D city backdrop
  setTimeout(()=>drawIntroCity(),100);

  const il1=document.getElementById('il1');
  const il2=document.getElementById('il2');
  const il3=document.getElementById('il3');
  const il4=document.getElementById('il4');

  // Sequence: show/hide lines with timing
  const seq=[
    ()=>il1.classList.add('show'),
    ()=>il1.classList.add('hide'),
    ()=>il2.classList.add('show'),
    ()=>il2.classList.add('hide'),
    ()=>il3.classList.add('show'),
    ()=>il3.classList.add('hide'),
    ()=>il4.classList.add('show'),
    ()=>finishIntro(),
  ];
  const times=[400, 2400, 3000, 5200, 5700, 7900, 8400, 11200];
  const timers=times.map((t,i)=>setTimeout(seq[i],t));
  window._introTimers=timers;
}

function finishIntro(){
  if(!introPlaying)return;
  introPlaying=false;introDone=true;
  const el=document.getElementById('intro');
  el.classList.add('out');
  setTimeout(()=>{el.style.display='none';goHome();},1500);
}

function skipIntro(){
  if(window._introTimers)window._introTimers.forEach(t=>clearTimeout(t));
  introPlaying=false;introDone=true;
  const el=document.getElementById('intro');
  el.classList.add('out');
  setTimeout(()=>{el.style.display='none';goHome();},600);
}

/* ════════════════════════════════════════
   THEME
════════════════════════════════════════ */
function setTheme(name, btn){
  currentTheme=name;
  document.body.className='th-'+name;
  document.querySelectorAll('.th-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  C={...THEMES[name]};
  if(S){
    S.background=new THREE.Color(C.sky);
    S.fog=new THREE.Fog(new THREE.Color(C.fog),180,1100);
    lights();
    // rebuild building materials
    blds.forEach((b,i)=>{
      b.traverse(c=>{
        if(c.isMesh&&c.userData.isB){
          c.material.color=new THREE.Color(i%2===0?C.bA:C.bB);
          c.material.emissive=new THREE.Color(C.gl).multiplyScalar(.017);
        }
      });
    });
    // update moon color
    if(moonMesh) updateMoonColor();
    // update vehicles
    if(vG) vG.children.forEach((g,i)=>{g.children[0].material.color=new THREE.Color(i%3===0?C.acc:i%3===1?C.acc2:C.bB);});
    // update rain
    if(rPts) rPts.material.color=new THREE.Color(C.acc);
  }
  toast('THEME: '+name.toUpperCase());
}

/* ════════════════════════════════════════
   INIT
════════════════════════════════════════ */
function init(){
  genStars();
  clk=new THREE.Clock();vel=new THREE.Vector3();
  S=new THREE.Scene();
  cam=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,2400);
  cam.position.set(0,120,240);
  ren=new THREE.WebGLRenderer({canvas:document.getElementById('canvas'),antialias:true});
  ren.setSize(innerWidth,innerHeight);
  ren.shadowMap.enabled=true;ren.shadowMap.type=THREE.PCFSoftShadowMap;
  ren.setPixelRatio(Math.min(devicePixelRatio,2));
  rc=new THREE.Raycaster();
  S.background=new THREE.Color(C.sky);
  S.fog=new THREE.Fog(new THREE.Color(C.fog),180,1100);
  lights();addMoon();setupMM();flyInput();exInput();srInput();
  window.addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();ren.setSize(innerWidth,innerHeight);});
  document.addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='KeyG'&&!e.repeat)exportSVG();if(e.code==='Escape'){closeSVG();if(mode==='fly'&&document.getElementById('fly-instr')&&!document.getElementById('fly-instr').classList.contains('hidden')){hideFlyInstr();}}});
  document.addEventListener('keyup',e=>{keys[e.code]=false;});
  loadData();loop();
  setInterval(()=>{const el=document.getElementById('fly-clk');if(el)el.textContent=new Date().toUTCString().slice(17,25)+' UTC';},1000);
}

function lights(){
  S.children.filter(c=>c.isLight).forEach(c=>S.remove(c));
  S.add(new THREE.AmbientLight(0x120020,.55));
  const sun=new THREE.DirectionalLight(C.acc,.6);
  sun.position.set(80,160,60);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=sun.shadow.camera.bottom=-550;
  sun.shadow.camera.right=sun.shadow.camera.top=550;sun.shadow.camera.far=900;
  S.add(sun);
  const r=new THREE.DirectionalLight(C.acc2,.14);r.position.set(-80,50,-80);S.add(r);
  S.add(new THREE.HemisphereLight(C.sky,C.gnd,.24));
}

/* ════════════════════════════════════════
   MOON  (big dramatic moon in the scene)
════════════════════════════════════════ */
function addMoon(){
  if(moonMesh){S.remove(moonMesh);moonMesh=null;}
  const moonGroup=new THREE.Group();

  // main moon sphere
  const geo=new THREE.SphereGeometry(42,48,32);
  const c=document.createElement('canvas');c.width=512;c.height=512;
  const ctx=c.getContext('2d');
  // base gradient
  const grd=ctx.createRadialGradient(200,200,0,256,256,320);
  grd.addColorStop(0,'#ffeebb');grd.addColorStop(.35,'#ffaa44');grd.addColorStop(.7,'#cc6622');grd.addColorStop(1,'#882200');
  ctx.fillStyle=grd;ctx.fillRect(0,0,512,512);
  // horizontal stripes (like the reference image)
  for(let i=0;i<22;i++){
    const y=220+i*14,a=0.22-i*.008;
    ctx.fillStyle=`rgba(0,0,0,${Math.max(0,a)})`;
    ctx.fillRect(0,y,512,i<8?10:i<15?8:6);
  }
  // crater texture
  [[180,160,22],[310,220,15],[240,320,18],[120,280,10],[380,150,12],[290,380,8]].forEach(([cx,cy,r])=>{
    const cg=ctx.createRadialGradient(cx-r*.3,cy-r*.3,0,cx,cy,r);
    cg.addColorStop(0,'rgba(255,180,80,.18)');cg.addColorStop(.6,'rgba(0,0,0,.22)');cg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=cg;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();
  });
  const tex=new THREE.CanvasTexture(c);
  const mat=new THREE.MeshBasicMaterial({map:tex});
  moonMesh=new THREE.Mesh(geo,mat);
  moonMesh.position.set(180,200,-380);
  moonGroup.add(moonMesh);

  // glow halo
  const halo=new THREE.Mesh(
    new THREE.SphereGeometry(50,32,16),
    new THREE.MeshBasicMaterial({color:new THREE.Color(C.acc2||0x9b00ff).multiplyScalar(.3),transparent:true,opacity:.15,side:THREE.BackSide})
  );
  halo.position.copy(moonMesh.position);moonGroup.add(halo);

  // outer glow ring
  const outerGlow=new THREE.Mesh(
    new THREE.SphereGeometry(58,32,16),
    new THREE.MeshBasicMaterial({color:0xff8844,transparent:true,opacity:.06,side:THREE.BackSide})
  );
  outerGlow.position.copy(moonMesh.position);moonGroup.add(outerGlow);

  moonGroup.userData.isMoon=true;
  S.add(moonGroup);
}

function updateMoonColor(){
  // re-tint the halo based on theme
  S.children.forEach(c=>{
    if(c.userData.isMoon){
      c.children[1].material.color=new THREE.Color(C.acc2).multiplyScalar(.3);
    }
  });
}

/* ════════════════════════════════════════
   DATA FETCH — real top-150 by volume
════════════════════════════════════════ */
async function loadData(){
  ld('CONNECTING TO BLOCKCHAIN...',5);
  let raw=[];

  // --- Batch 1: known high-vol Solana token addresses (30 addrs max per call) ---
  const addrBatches=[
    // batch A — blue chips & memecoins
    ['So11111111111111111111111111111111111111112',
     'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
     'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
     'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
     '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
     'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
     'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1iVkj9y',
     'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5',
     'jtojtomepa8b1b9bwrcbroolooGqAqbLogfTHgrSqosj',
     'HZ1JovNiVvGqswkRy58yfq2a59nk5g7kZBfTnZCkMD6',
     'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1',
     'TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6',
     'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk',
     'hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux',
     'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof'],
    // batch B — more memes & DeFi
    ['ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82',
     'A8C3xuqscfmyLrte3VmTqrAq8kgMASius9AFNANwpump',
     '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
     'Df6yfrKC8kZE3KNkrHERKzAetSxbrWeniQfyJY4Jpump',
     'ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzc8yy',
     'CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump',
     '2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump',
     'GJAFwWjJ3vnTsrZaHFMMnEiIp7jC89LajKCFNDMpump',
     'MEFNBXixkEbait3xfwo1CKM4TTNTQJM5TiQgXDcPump',
     '6n7Janary9fqzxKaJVrhL9TG2F61VbAtwUMu7MU3yUb',
     'nosXBVoaCTtYdLvKY6Csb4AC8JCdQKKAaWYtx2ZMoo7',
     'SHDWyBxihqiCjDYwXAyCJmtq3UEDgPKy68pQFuTenQe',
     'AFbX8oGjGpmVFywabs9MZEmmy3WkfQNpJy3cGwRrGz3i',
     'DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7',
     'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac'],
    // batch C — more tokens
    ['SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt',
     'kinXdEcpDQeHPEuQnqmUgtYykqKCSVY5JybFN8s2oxr',
     'FoXyMu5xwXre7zEoSvzViRk3nGawHUp9kUh97y2NDhcq',
     'StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Xjdse8fMU',
     'MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey',
     '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E',
     'SLNDpmoWTVADgEdndyvWzroNL7zSi1dF9PC3xHGtPwp',
     'ATLASXmbPQxBUYbxPsV97usA3fuu4WTLgoodc9sMsTdW',
     'poLisWXnNRwC6oBu1vHiuKQzFjGL4XDSu4g9qjz9qVk',
     'FiCiEKi4dMPZMWMiXUsHGLnkHWfhzeDUmQEJWLFhMFkT',
     'AZsHEMXd36Bj1EMNXhowJajpUXzrKcK57wW4ZGXVa7yR',
     'BLZEEuZUBVqFhj8adcCFPJvPVCiCyVmh9hkJxjsEe2e6',
     '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
     'HHoHZuMBBoPFGbkLMdHbDSqPFaHqmYoQNtJMf4rKcM2',
     'CLoUDKc4Ane7HeQcPpE3YHnznRxhMimJ4MyaUqyHFzAu']
  ];

  ld('FETCHING TOKEN PAIRS...',12);
  const batchResults=await Promise.allSettled(
    addrBatches.map(batch=>tf('https://api.dexscreener.com/latest/dex/tokens/'+batch.join(','),12000))
  );
  batchResults.forEach(r=>{if(r.status==='fulfilled'&&r.value)raw.push(...(r.value.pairs||[]));});

  ld('SCANNING SOLANA MARKETS...',30);
  // search queries covering wide range of Solana tokens
  const queries=[
    'sol','bonk','wif','jup','popcat','mew','pyth','jto','bome','wen',
    'tnsr','hnt','rndr','gmt stepn','samo','drift','mngo','fartcoin',
    'pnut squirrel','goat','michi','giga','ai16z','zerebro','chill guy',
    'moodeng','ponke','slerf','myro','harambe','trump solana','retardio',
    'maga solana','pepe solana','turbo solana','barsik','laika solana',
    'sigma solana','capy solana','andy solana','smol solana','kween',
    'nos nosana','shdw shadow','step finance','slnd solend','cope solana',
    'atlas star','polis solana','fida bonfida','aury aurory','neon evm'
  ];
  const chunks=[];
  for(let i=0;i<queries.length;i+=5)chunks.push(queries.slice(i,i+5));

  for(let ci=0;ci<chunks.length;ci++){
    ld(`INDEXING MARKETS... [${ci+1}/${chunks.length}]`,30+Math.floor(ci/chunks.length*35));
    const results=await Promise.allSettled(
      chunks[ci].map(q=>tf('https://api.dexscreener.com/latest/dex/search?q='+encodeURIComponent(q),8000))
    );
    results.forEach(r=>{if(r.status==='fulfilled'&&r.value)raw.push(...(r.value.pairs||[]));});
  }

  ld('PROCESSING VOLUME DATA...',70);
  const by={};
  const stables=new Set(['USDC','USDT','WBTC','WETH','DAI','BUSD','TUSD','FRAX','USDH','UXD','PAI','USDR']);
  for(const p of raw){
    if(!p||p.chainId!=='solana'||!p.baseToken)continue;
    const a=p.baseToken.address;if(!a)continue;
    const sym=(p.baseToken.symbol||'???').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
    if(stables.has(sym))continue;
    const v=parseFloat(p.volume?.h24||0);if(v<100)continue;// filter dust
    if(!by[a]||v>by[a].vol){
      by[a]={
        n:p.baseToken.name||p.baseToken.symbol||'?',
        s:sym, a, vol:v,
        mc:parseFloat(p.marketCap||p.fdv||0),
        px:parseFloat(p.priceUsd||0),
        ch:parseFloat(p.priceChange?.h24||0),
        tx:parseInt((p.txns?.h24?.buys||0)+(p.txns?.h24?.sells||0)),
        img:p.info?.imageUrl||'',
        url:'https://dexscreener.com/solana/'+a,
        bee:'https://birdeye.so/token/'+a+'?chain=solana'
      };
    }
  }

  let list=Object.values(by).sort((a,b)=>b.vol-a.vol);
  ld('SORTING BY VOLUME...',78);

  if(list.length<40){ld('LOADING FALLBACK DATA...',80);list=demoData();}
  tokens=list.slice(0,MAX_T);

  // pad to exactly 150 if needed
  if(tokens.length<MAX_T){
    const pad=demoData().filter(d=>!tokens.find(t=>t.s===d.s&&!d.a.startsWith('demo')));
    tokens.push(...pad.slice(0,MAX_T-tokens.length));
    tokens=tokens.slice(0,MAX_T);
  }

  ld('BUILDING CITY...',85);
  await buildCity();
  spawnVeh();spawnRain();buildTicker();buildLBRows();updateHP();
  ld(`ONLINE ✓  ${tokens.length} TOKENS LOADED`,100);
  setTimeout(()=>{
    document.getElementById('loading').classList.add('out');
    setTimeout(()=>{
      document.getElementById('loading').style.display='none';
      playIntro();
    },1200);
  },500);
}

async function tf(url,ms){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
  try{const r=await fetch(url,{signal:c.signal});clearTimeout(t);if(!r.ok)return null;return await r.json();}
  catch(e){clearTimeout(t);return null;}
}

/* ════════════════════════════════════════
   DEMO DATA (150 tokens fallback)
════════════════════════════════════════ */
function demoData(){
  const D=[
    // s, name, 24hVol, mcap, price, change24h, txCount
    ['SOL','Solana',3200e6,95e9,188.4,5.2,48000],
    ['JUP','Jupiter',480e6,2.1e9,.82,-1.4,18000],
    ['BONK','Bonk',310e6,1.6e9,.000024,12.1,95000],
    ['WIF','dogwifhat',290e6,2.4e9,2.41,8.3,32000],
    ['PYTH','Pyth',185e6,820e6,.32,-3.1,12000],
    ['RAY','Raydium',165e6,740e6,4.21,2.7,9000],
    ['POPCAT','Popcat',140e6,650e6,.65,18.4,55000],
    ['MEW','cat in dogs world',120e6,480e6,.0048,6.9,41000],
    ['ORCA','Orca',95e6,310e6,3.10,-.8,7500],
    ['MSOL','Marinade SOL',88e6,560e6,192,1.2,4200],
    ['BOME','Book of Meme',82e6,370e6,.0092,-5.6,28000],
    ['SAMO','Samoyedcoin',71e6,180e6,.024,3.3,15000],
    ['GMT','STEPN',55e6,320e6,.185,-1.0,8800],
    ['RNDR','Render',52e6,1.8e9,6.20,4.5,5600],
    ['JTO','Jito',35e6,800e6,3.20,1.8,7200],
    ['WEN','Wen',33e6,150e6,.00045,22.5,62000],
    ['TNSR','Tensor',30e6,300e6,1.20,-4.1,9100],
    ['HNT','Helium',28e6,1.4e9,6.80,3.3,3800],
    ['W','Wormhole',19e6,1.2e9,.24,2.6,11000],
    ['DRIFT','Drift',16e6,200e6,.55,7.2,8500],
    ['MNGO','Mango',14e6,180e6,.038,-2.1,5200],
    ['DUST','DUST',13e6,72e6,.72,11.2,8900],
    ['NOS','Nosana',12e6,25e6,.25,9.3,12000],
    ['SHDW','Shadow',11e6,30e6,.30,4.2,6600],
    ['AI16Z','AI16Z',10e6,700e6,.00034,9.1,14000],
    ['FARTCOIN','FartCoin',9.5e6,550e6,.000085,28.4,18000],
    ['PNUT','Pnut Squirrel',9e6,380e6,.0072,14.4,11000],
    ['GOAT','GOAT',8.5e6,350e6,.0041,10.3,9200],
    ['MICHI','Michi',8e6,320e6,.0029,-5.2,8400],
    ['GIGA','Gigachad',7.5e6,420e6,.00095,8.7,9800],
    ['ZEREBRO','Zerebro',7e6,650e6,.00018,14.5,11500],
    ['CHILL','Chill Guy',6.5e6,400e6,.000039,11.2,9100],
    ['MOODENG','Moo Deng',6e6,450e6,.000048,15.7,8700],
    ['FIDA','Bonfida',5.5e6,18e6,.16,-4.5,4200],
    ['ATLAS','Star Atlas',5.2e6,65e6,.004,12.0,15000],
    ['POLIS','Star Atlas DAO',4.9e6,42e6,.028,9.5,11000],
    ['WHALES','Whales',4.7e6,15e6,.15,14.2,7700],
    ['AURY','Aurory',4.5e6,45e6,.45,-2.9,4100],
    ['NEON','Neon EVM',4.2e6,60e6,.60,1.1,3300],
    ['SBR','Saber',4e6,28e6,.012,4.8,4100],
    ['SLERF','Slerf',3.8e6,70e6,.008,-8.4,5500],
    ['MYRO','Myro',3.6e6,85e6,.0015,11.2,6800],
    ['HARAMBE','Harambe',3.4e6,48e6,.0018,25.3,8100],
    ['PONKE','Ponke',3.2e6,350e6,.00029,7.6,5600],
    ['RETARDIO','Retardio',3e6,85e6,.00016,19.8,5600],
    ['BARSIK','Barsik',2.8e6,50e6,.000062,9.3,4900],
    ['LAIKA','Laika',2.6e6,75e6,.00029,12.8,4200],
    ['MAGA','MAGA',2.5e6,150e6,.0003,22.1,7800],
    ['TURBO','Turbo',2.3e6,130e6,.0015,5.5,4800],
    ['MUMU','Mumu',2.1e6,95e6,.00038,16.1,4900],
    ['PEPE','Pepe Sol',2e6,120e6,.00018,13.7,5100],
    ['OXY','Oxygen',1.9e6,11e6,.068,2.3,3100],
    ['COPE','Cope',1.8e6,15e6,.19,-6.4,2900],
    ['STEP','Step Finance',1.7e6,18e6,.05,3.2,3100],
    ['KIN','Kin',1.6e6,85e6,.000021,5.5,18000],
    ['SLND','Solend',1.5e6,12e6,.22,-3.8,3200],
    ['MEAN','Mean DAO',1.4e6,9e6,.14,8.1,2700],
    ['SUNNY','Sunny Aggregator',1.3e6,7e6,.008,-1.2,2400],
    ['NINJA','Ninja',1.2e6,12e6,.00038,21.4,4800],
    ['CHEEMS','Cheems',1.1e6,9e6,.00012,16.8,3700],
    ['BODEN','Boden',1e6,60e6,.0042,7.9,5100],
    ['FRED','Fred',950000,29e6,.0016,7.1,3500],
    ['SPORE','Spore',900000,25e6,.0008,18.9,3200],
    ['LINA','Lina',850000,22e6,.0019,-3.1,2800],
    ['CAPY','Capybara',800000,20e6,.0011,11.6,3400],
    ['SIGMA','Sigma',750000,18e6,.0006,6.4,2600],
    ['BASED','Based',700000,14e6,.00045,9.8,3200],
    ['DARK','Dark',650000,80e6,.00042,7.3,3100],
    ['KWEEN','Kween',600000,30e6,.000021,18.3,4700],
    ['ANDY','Andy',550000,20e6,.000012,9.8,2900],
    ['SMOL','Smol',500000,15e6,.0000089,12.4,2700],
    ['ACE','Ace',450000,12e6,.0000072,7.2,2500],
    ['PORT','Port Finance',420000,22e6,.18,11.3,2200],
    ['ROPE','Rope',400000,8e6,.48,6.7,2000],
    ['MER','Mercurial',380000,6.5e6,.011,-1.8,1900],
    ['PRISM','Prism',360000,5e6,.0092,14.2,2100],
    ['MEDIA','Media Network',340000,4.5e6,.31,3.8,1800],
    ['WHIRL','Whirlpool',320000,4e6,.0015,8.3,1700],
    ['VOID','Void',300000,18e6,.0025,-9.9,1600],
    ['FLUX','Flux',280000,12e6,.0018,7.3,1500],
    ['RUSH','Rush',260000,9e6,.0012,-2.0,1400],
    ['HYPE','Hype',240000,7e6,.001,9.8,1300],
    ['APEX','Apex',220000,5e6,.0007,5.0,1200],
    ['STAR','Star',200000,4e6,.004,-1.5,1100],
    ['WAVE','Wave',180000,3.5e6,.0028,3.1,1000],
    ['CORE','Core',160000,2.8e6,.0008,1.3,900],
    ['NOVA','Nova',150000,3e6,.005,12.7,800],
    ['FIRE','Fire',140000,2.5e6,.006,8.0,750],
    ['BLAZE','Blaze',130000,5e6,.0015,15.4,700],
    ['MOON','Moon',120000,4e6,.008,6.1,650],
    ['PANDA','Panda',110000,8e6,.01,19.7,600],
    ['DOGE','Doge Sol',100000,10e6,.00082,4.9,580],
    ['SHIB','Shib Sol',95000,11e6,.000012,8.2,560],
    ['OPUS','Opus',90000,6e6,.00011,6.7,540],
    ['SIGMA2','Sigma2',85000,2.5e6,.000015,5.1,520],
    ['KIRA','Kira',80000,2.2e6,.00008,14.8,500],
    ['ZKONG','Zkong',76000,2e6,.000042,11.1,480],
    ['GNAR','Gnar',72000,1.8e6,.000038,9.5,460],
    ['LOOT','Loot',68000,1.6e6,.000031,8.1,440],
    ['REKT','Rekt',64000,1.5e6,.000028,6.7,420],
    ['PUMP','Pump',60000,1.4e6,.000025,22.3,400],
    ['DUMB','Dumb',56000,1.3e6,.000022,7.8,380],
    ['NGMI','NGMI',52000,1.2e6,.000019,5.4,360],
    ['WAGMI','WAGMI',48000,1.1e6,.000017,9.2,340],
    ['CHAD','Chad',44000,1e6,.000015,11.5,320],
    ['BASED2','Based2',40000,950000,.000013,8.9,300],
    ['DEGEN','Degen',36000,900000,.000011,7.2,280],
    ['ALPHA','Alpha',32000,850000,.0000095,14.1,260],
    ['BETA','Beta',28000,800000,.0000082,6.3,240],
    ['GAMMA','Gamma',24000,750000,.0000071,9.7,220],
    ['DELTA','Delta',20000,700000,.0000062,5.1,200],
    ['OMEGA','Omega',18000,650000,.0000055,12.4,185],
    ['ZETA','Zeta',16000,600000,.0000048,8.6,170],
    ['SIGMA3','Sigma3',14000,550000,.0000041,6.8,155],
    ['THETA','Theta',12000,500000,.0000035,4.3,140],
    ['IOTA','Iota',10000,450000,.0000029,11.2,125],
    ['KAPPA','Kappa',9000,400000,.0000025,9.1,110],
    ['LAMBDA','Lambda',8000,350000,.0000021,7.4,100],
    ['MU','Mu',7000,300000,.0000018,5.8,90],
    ['NU','Nu',6000,250000,.0000015,13.5,80],
    ['XI','Xi',5500,220000,.0000013,8.9,72],
    ['PI','Pi',5000,200000,.0000011,6.1,65],
    ['RHO','Rho',4500,180000,.00000092,10.4,58],
    ['TAU','Tau',4000,160000,.00000081,7.7,51],
    ['PHI','Phi',3500,140000,.00000071,5.5,45],
    ['CHI','Chi',3000,120000,.00000062,9.3,40],
    ['PSI','Psi',2500,100000,.00000054,12.1,35],
    ['UPSILON','Upsilon',2000,85000,.00000047,8.0,30],
    ['ETA','Eta',1800,75000,.00000041,6.2,28],
    ['EPSILON','Epsilon',1600,65000,.00000036,14.7,25],
    ['RHO2','Rho2',1400,55000,.00000031,7.5,22],
    ['DIGAMMA','Digamma',1200,45000,.00000027,9.8,19],
    ['KOPPA','Koppa',1000,38000,.00000023,5.3,16],
    ['STIGMA','Stigma',900,32000,.0000002,11.6,14],
    ['SAN','San',800,28000,.00000018,8.4,12],
    ['QOF','Qof',700,24000,.00000015,6.1,11],
    ['HETA','Heta',600,20000,.00000013,10.2,10]
  ];
  return D.map(([s,n,v,mc,px,ch,tx])=>({n,s,a:'demo_'+s.toLowerCase(),vol:v*(0.85+Math.random()*.3),mc,px,ch:ch+(Math.random()*2-1),tx,img:'',url:'https://dexscreener.com/solana/',bee:'https://birdeye.so/'}));
}

/* ════════════════════════════════════════
   BUILD CITY (100 buildings, varied styles)
════════════════════════════════════════ */
async function buildCity(){
  blds.forEach(b=>S.remove(b));blds=[];
  S.children.filter(c=>c.userData.city).forEach(c=>S.remove(c));
  const n=tokens.length;if(!n)return;
  const maxV=Math.max(...tokens.map(t=>t.vol));
  const minV=Math.min(...tokens.map(t=>t.vol));
  const bpr=Math.max(3,Math.ceil(Math.sqrt(n/(BLK*BLK))));
  const nBK=Math.ceil(n/(BLK*BLK)),nBR=Math.ceil(nBK/bpr);
  const cW=bpr*STRIDE,cD=nBR*STRIDE,ox=-cW/2+ROAD/2,oz=-cD/2+ROAD/2;
  mkGnd(cW,cD);mkRds(bpr,nBR,cW,cD,ox,oz);
  // Add dense background filler buildings beyond the main grid
  addFillerBuildings(cW,cD);

  // Place #1 token (most volume) at city center
  const topTk=tokens[0];
  const vn0=1.0;
  const centerBld=mkBldCenter(topTk,0,0,10,200,0); // Burj Khalifa style
  blds.push(centerBld);

  for(let i=0;i<n;i++){
    const tk=tokens[i];
    // Skip if this is the top token - already placed at center
    const bi=Math.floor(i/(BLK*BLK)),bc=bi%bpr,br=Math.floor(bi/bpr);
    const li=i%(BLK*BLK),lc=li%BLK,lr=Math.floor(li/BLK);
    let x=ox+bc*STRIDE+lc*BSPC,z=oz+br*STRIDE+lr*BSPC;
    // Avoid center position for others
    if(Math.abs(x)<12&&Math.abs(z)<12){x+=14;z+=14;}
    const vn=(Math.log(tk.vol+1)-Math.log(minV+1))/(Math.log(maxV+1)-Math.log(minV+1));
    const style=i%5; // 5 different building styles
    blds.push(mkBld(tk,x,z,3+vn*5,6+vn*95,i,style));
    if(i%8===7)await new Promise(r=>setTimeout(r,0));
  }
  document.getElementById('h-bld').textContent=blds.length;
  document.getElementById('ex-cnt').textContent=(blds.length-1)+' TOKENS';
  drawMM();
}

function addFillerBuildings(cW,cD){
  // Rings of background buildings extending the city to the horizon
  const rings=[
    {r:cW*0.65,count:160,hMult:0.55},
    {r:cW*0.9,count:260,hMult:0.38},
    {r:cW*1.2,count:350,hMult:0.28},
    {r:cW*1.6,count:420,hMult:0.18},
  ];
  const mat1=new THREE.MeshLambertMaterial({color:C.bA,emissive:new THREE.Color(C.gl).multiplyScalar(.006)});
  const mat2=new THREE.MeshLambertMaterial({color:C.bB,emissive:new THREE.Color(C.gl).multiplyScalar(.004)});
  rings.forEach(({r,count,hMult})=>{
    for(let i=0;i<count;i++){
      const ang=(i/count)*Math.PI*2+Math.random()*0.4;
      const dist=r*(0.8+Math.random()*0.4);
      const x=Math.cos(ang)*dist+(Math.random()-0.5)*18;
      const z=Math.sin(ang)*dist+(Math.random()-0.5)*18;
      const w=2+Math.random()*5;
      const h=(4+Math.random()*60)*hMult;
      const grp=new THREE.Group();grp.position.set(x,0,z);grp.userData={city:true};
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,w),i%2===0?mat1:mat2);
      mesh.position.y=h/2;grp.add(mesh);
      // Simple window texture
      if(h>8&&Math.random()>0.4){
        const wc=new THREE.Mesh(new THREE.BoxGeometry(w+.05,h,w+.05),
          new THREE.MeshBasicMaterial({color:C.win,transparent:true,opacity:0.05+Math.random()*0.1,depthWrite:false}));
        wc.position.y=h/2;grp.add(wc);
      }
      S.add(grp);
    }
  });
}

// Burj Khalifa-inspired landmark for #1 volume token
function mkBldCenter(tk,x,z,w,h,idx){
  const grp=new THREE.Group();grp.position.set(x,0,z);grp.userData={tk,idx};
  const segs=[
    {w:w,h:h*.42,y:0},
    {w:w*.78,h:h*.18,y:h*.42},
    {w:w*.58,h:h*.12,y:h*.60},
    {w:w*.42,h:h*.10,y:h*.72},
    {w:w*.28,h:h*.09,y:h*.82},
    {w:w*.16,h:h*.07,y:h*.91},
    {w:w*.08,h:h*.06,y:h*.97},
  ];
  segs.forEach((seg,si)=>{
    const mat=new THREE.MeshLambertMaterial({
      color:si%2===0?C.bB:C.bA,
      emissive:new THREE.Color(C.gl).multiplyScalar(.04)
    });
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(seg.w,seg.h,seg.w),mat);
    mesh.position.y=seg.y+seg.h/2;
    mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.userData={tk,isB:true,idx};
    grp.add(mesh);
    // Horizontal band at each setback
    if(si>0){
      const band=new THREE.Mesh(new THREE.BoxGeometry(seg.w+.3,.4,seg.w+.3),
        new THREE.MeshBasicMaterial({color:C.acc,transparent:true,opacity:.7}));
      band.position.y=seg.y;grp.add(band);
    }
    // Windows on all 4 faces
    winT(grp,seg.w,seg.h,seg.y);
  });
  // Spire
  const spire=new THREE.Mesh(new THREE.CylinderGeometry(.08,w*.06,h*.22,8),
    new THREE.MeshBasicMaterial({color:C.acc}));
  spire.position.y=h+h*.11;grp.add(spire);
  // Glowing spire tip
  const tip=new THREE.Mesh(new THREE.SphereGeometry(.4,8,8),
    new THREE.MeshBasicMaterial({color:C.acc,transparent:true,opacity:.9}));
  tip.position.y=h+h*.22;grp.add(tip);
  const tipLight=new THREE.PointLight(C.acc,2.5,60);tipLight.position.copy(tip.position);grp.add(tipLight);
  // Strong floor light
  const pl=new THREE.PointLight(C.gl,1.2,80);pl.position.y=h*.5;grp.add(pl);
  // Logo/face
  if(tk.img&&!tk.a.startsWith('demo'))loadFace(tk,grp,w*1.4,h*.42);else grp.add(mkPH(tk.s,w*1.4,h*.42));
  // Big label
  grp.add(mkLbl(tk,w,h+18));
  // Crown ring
  for(let a=0;a<8;a++){
    const ang=a/8*Math.PI*2;
    const crow=new THREE.Mesh(new THREE.SphereGeometry(.35,6,6),new THREE.MeshBasicMaterial({color:C.acc}));
    crow.position.set(Math.cos(ang)*w*.52,h,Math.sin(ang)*w*.52);
    grp.add(crow);
  }
  S.add(grp);return grp;
}

// Style 0: Classic grid glass tower
function mkBldStyleGlass(tk,x,z,w,h,idx){
  const grp=new THREE.Group();grp.position.set(x,0,z);grp.userData={tk,idx};
  const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,w),
    new THREE.MeshLambertMaterial({color:C.bA,emissive:new THREE.Color(C.gl).multiplyScalar(.02)}));
  body.position.y=h/2;body.castShadow=true;body.receiveShadow=true;body.userData={tk,isB:true,idx};grp.add(body);
  winT(grp,w,h,0);
  // Stepped crown
  const crown=new THREE.Mesh(new THREE.BoxGeometry(w*.7,.6,w*.7),new THREE.MeshBasicMaterial({color:C.acc,transparent:true,opacity:.85}));
  crown.position.y=h;grp.add(crown);
  const crown2=new THREE.Mesh(new THREE.BoxGeometry(w*.45,.4,w*.45),new THREE.MeshBasicMaterial({color:C.acc}));
  crown2.position.y=h+.55;grp.add(crown2);
  // Floors
  const fl=Math.max(1,Math.floor(h/18));
  for(let f=1;f<fl;f++){const m=new THREE.Mesh(new THREE.BoxGeometry(w+.08,.11,w+.08),new THREE.MeshBasicMaterial({color:C.acc,transparent:true,opacity:.18}));m.position.y=(h/fl)*f;grp.add(m);}
  const pl=new THREE.PointLight(C.gl,.3,24);pl.position.y=h+1.5;grp.add(pl);
  grp.add(mkLbl(tk,w,h));
  if(tk.img&&!tk.a.startsWith('demo'))loadFace(tk,grp,w,h);else grp.add(mkPH(tk.s,w,h));
  S.add(grp);return grp;
}

// Style 1: Tapered/stepped pyramid style
function mkBldStylePyramid(tk,x,z,w,h,idx){
  const grp=new THREE.Group();grp.position.set(x,0,z);grp.userData={tk,idx};
  const steps=4;
  for(let s=0;s<steps;s++){
    const sw=w*(1-s*.18),sh=h/steps;
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(sw,sh,sw),
      new THREE.MeshLambertMaterial({color:s%2===0?C.bA:C.bB,emissive:new THREE.Color(C.gl).multiplyScalar(.015)}));
    mesh.position.y=s*sh+sh/2;mesh.castShadow=true;mesh.receiveShadow=true;
    if(s===0)mesh.userData={tk,isB:true,idx};
    grp.add(mesh);
    winT(grp,sw,sh,s*sh);
    const band=new THREE.Mesh(new THREE.BoxGeometry(sw+.2,.3,sw+.2),
      new THREE.MeshBasicMaterial({color:C.acc,transparent:true,opacity:.65}));
    band.position.y=s*sh;grp.add(band);
  }
  const ant=new THREE.Mesh(new THREE.CylinderGeometry(.05,.1,h*.12,6),new THREE.MeshBasicMaterial({color:C.acc2}));
  ant.position.y=h+h*.06;grp.add(ant);
  const pl=new THREE.PointLight(C.acc2,.35,22);pl.position.y=h+2;grp.add(pl);
  grp.add(mkLbl(tk,w,h));
  if(tk.img&&!tk.a.startsWith('demo'))loadFace(tk,grp,w,h);else grp.add(mkPH(tk.s,w,h));
  S.add(grp);return grp;
}

// Style 2: Twin towers
function mkBldStyleTwin(tk,x,z,w,h,idx){
  const grp=new THREE.Group();grp.position.set(x,0,z);grp.userData={tk,idx};
  const tw=w*.46,gap=w*.12;
  for(let t=0;t<2;t++){
    const tx=(t===0?-1:1)*(tw/2+gap/2);
    const th=t===0?h:h*.88;
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(tw,th,w*.85),
      new THREE.MeshLambertMaterial({color:t===0?C.bA:C.bB,emissive:new THREE.Color(C.gl).multiplyScalar(.02)}));
    mesh.position.set(tx,th/2,0);mesh.castShadow=true;mesh.receiveShadow=true;
    if(t===0)mesh.userData={tk,isB:true,idx};
    grp.add(mesh);
    winT(grp,tw,th,0);
    const top=new THREE.Mesh(new THREE.BoxGeometry(tw*.6,.5,tw*.6),new THREE.MeshBasicMaterial({color:C.acc,transparent:true,opacity:.8}));
    top.position.set(tx,th,.0);grp.add(top);
  }
  // Bridge connector at ~60% height
  const bridge=new THREE.Mesh(new THREE.BoxGeometry(gap+tw*.2,.8,w*.3),
    new THREE.MeshBasicMaterial({color:C.acc2,transparent:true,opacity:.7}));
  bridge.position.y=h*.62;grp.add(bridge);
  const pl=new THREE.PointLight(C.gl,.3,26);pl.position.y=h+2;grp.add(pl);
  grp.add(mkLbl(tk,w,h));
  if(tk.img&&!tk.a.startsWith('demo'))loadFace(tk,grp,w,h);else grp.add(mkPH(tk.s,w,h));
  S.add(grp);return grp;
}

// Style 3: Cylindrical/round tower
function mkBldStyleRound(tk,x,z,w,h,idx){
  const grp=new THREE.Group();grp.position.set(x,0,z);grp.userData={tk,idx};
  const r=w*.52;
  const body=new THREE.Mesh(new THREE.CylinderGeometry(r*.82,r,h,16),
    new THREE.MeshLambertMaterial({color:C.bB,emissive:new THREE.Color(C.gl).multiplyScalar(.025)}));
  body.position.y=h/2;body.castShadow=true;body.receiveShadow=true;body.userData={tk,isB:true,idx};grp.add(body);
  // Rings
  const fl=Math.max(2,Math.floor(h/12));
  for(let f=1;f<=fl;f++){
    const m=new THREE.Mesh(new THREE.TorusGeometry(r*.84,0.12,8,16),
      new THREE.MeshBasicMaterial({color:C.acc,transparent:true,opacity:.35}));
    m.rotation.x=Math.PI/2;m.position.y=(h/fl)*f;grp.add(m);
  }
  const dome=new THREE.Mesh(new THREE.SphereGeometry(r*.84,16,8,0,Math.PI*2,0,Math.PI*.6),
    new THREE.MeshBasicMaterial({color:C.acc2,transparent:true,opacity:.5}));
  dome.position.y=h;grp.add(dome);
  const pl=new THREE.PointLight(C.acc2,.35,22);pl.position.y=h+2;grp.add(pl);
  grp.add(mkLbl(tk,w,h));
  if(tk.img&&!tk.a.startsWith('demo'))loadFace(tk,grp,w,h);else grp.add(mkPH(tk.s,w,h));
  S.add(grp);return grp;
}

// Style 4: Irregular/deconstructed modern
function mkBldStyleModern(tk,x,z,w,h,idx){
  const grp=new THREE.Group();grp.position.set(x,0,z);grp.userData={tk,idx};
  // Main slab
  const main=new THREE.Mesh(new THREE.BoxGeometry(w,h*.72,w*.62),
    new THREE.MeshLambertMaterial({color:C.bA,emissive:new THREE.Color(C.gl).multiplyScalar(.02)}));
  main.position.set(-w*.08,h*.36,-w*.08);main.castShadow=true;main.receiveShadow=true;main.userData={tk,isB:true,idx};grp.add(main);
  // Side wing
  const wing=new THREE.Mesh(new THREE.BoxGeometry(w*.45,h*.52,w*.55),
    new THREE.MeshLambertMaterial({color:C.bB,emissive:new THREE.Color(C.gl).multiplyScalar(.015)}));
  wing.position.set(w*.32,h*.26,w*.15);wing.castShadow=true;wing.receiveShadow=true;grp.add(wing);
  // Tall narrow section
  const tower=new THREE.Mesh(new THREE.BoxGeometry(w*.28,h,w*.28),
    new THREE.MeshLambertMaterial({color:C.bA,emissive:new THREE.Color(C.gl).multiplyScalar(.025)}));
  tower.position.set(-w*.22,h/2,w*.15);tower.castShadow=true;tower.receiveShadow=true;grp.add(tower);
  winT(grp,w,h*.72,0);
  const sc=tk.ch>=0?C.up:C.dn;
  const roof=new THREE.Mesh(new THREE.BoxGeometry(w+.1,.3,w*.62+.1),
    new THREE.MeshBasicMaterial({color:sc,transparent:true,opacity:.85}));
  roof.position.set(-w*.08,h*.72,-.08);grp.add(roof);
  const pl=new THREE.PointLight(C.gl,.3,24);pl.position.y=h+2;grp.add(pl);
  grp.add(mkLbl(tk,w,h));
  if(tk.img&&!tk.a.startsWith('demo'))loadFace(tk,grp,w,h*.72);else grp.add(mkPH(tk.s,w,h*.72));
  S.add(grp);return grp;
}

function mkBld(tk,x,z,w,h,idx,style){
  switch(style%5){
    case 0: return mkBldStyleGlass(tk,x,z,w,h,idx);
    case 1: return mkBldStylePyramid(tk,x,z,w,h,idx);
    case 2: return mkBldStyleTwin(tk,x,z,w,h,idx);
    case 3: return mkBldStyleRound(tk,x,z,w,h,idx);
    case 4: return mkBldStyleModern(tk,x,z,w,h,idx);
    default: return mkBldStyleGlass(tk,x,z,w,h,idx);
  }
}

function mkGnd(cw,cd){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(cw+200,cd+200),new THREE.MeshLambertMaterial({color:C.gnd}));
  m.rotation.x=-Math.PI/2;m.receiveShadow=true;m.userData.city=true;S.add(m);
}
function mkRds(bpr,bpc,cw,cd,ox,oz){
  const rm=new THREE.MeshLambertMaterial({color:C.rd});
  for(let r=0;r<=bpc;r++){const rz=oz+r*STRIDE-ROAD/2;const m=new THREE.Mesh(new THREE.PlaneGeometry(cw+150,ROAD),rm);m.rotation.x=-Math.PI/2;m.position.set(0,.04,rz+ROAD/2);m.userData.city=true;S.add(m);}
  for(let c2=0;c2<=bpr;c2++){const rx=ox+c2*STRIDE-ROAD/2;const m=new THREE.Mesh(new THREE.PlaneGeometry(ROAD,cd+150),rm);m.rotation.x=-Math.PI/2;m.position.set(rx+ROAD/2,.04,0);m.userData.city=true;S.add(m);}
  const g=new THREE.GridHelper(Math.max(cw,cd)+150,Math.ceil((Math.max(cw,cd)+150)/BSPC),new THREE.Color(C.acc),new THREE.Color(C.bA));
  g.material.opacity=.04;g.material.transparent=true;g.userData.city=true;S.add(g);
}

function winT(grp,w,h,yOff){
  if(!yOff)yOff=0;
  const c=document.createElement('canvas');c.width=128;c.height=512;
  const ctx=c.getContext('2d');
  const rows=Math.floor(h/2.4),cols=Math.max(2,Math.floor(w/1.4));
  for(let r=0;r<rows;r++)for(let cc=0;cc<cols;cc++)if(Math.random()>.32){
    const a=.12+Math.random()*.48;
    ctx.fillStyle=Math.random()>.65?`rgba(220,80,255,${a})`:`rgba(90,70,255,${a*.75})`;
    ctx.fillRect(4+cc*(124/cols),6+r*(506/rows),124/cols-2,506/rows-3);
  }
  const tex=new THREE.CanvasTexture(c);
  const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false});
  [{p:[0,yOff+h/2,w/2+.03],ry:0},{p:[0,yOff+h/2,-w/2-.03],ry:Math.PI},{p:[w/2+.03,yOff+h/2,0],ry:Math.PI/2},{p:[-w/2-.03,yOff+h/2,0],ry:-Math.PI/2}].forEach(f=>{
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat.clone());m.position.set(...f.p);m.rotation.y=f.ry;grp.add(m);
  });
}

function mkLbl(tk,w,h){
  const c=document.createElement('canvas');c.width=256;c.height=88;
  const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(0,0,0,.82)';ctx.fillRect(0,0,256,88);
  ctx.strokeStyle='rgba(255,42,244,.28)';ctx.strokeRect(1,1,254,86);
  ctx.fillStyle='#ff2af4';ctx.font='bold 30px monospace';ctx.textAlign='center';ctx.fillText(tk.s.slice(0,6),128,38);
  ctx.fillStyle='rgba(255,255,255,.5)';ctx.font='11px monospace';ctx.fillText(tk.n.slice(0,20),128,56);
  ctx.fillStyle=tk.ch>=0?'#00ff88':'#ff3855';ctx.font='bold 11px monospace';ctx.fillText((tk.ch>=0?'+':'')+tk.ch.toFixed(1)+'%',128,74);
  const m=new THREE.Mesh(new THREE.PlaneGeometry(Math.max(w*1.2,6),Math.max(w*.42,2.2)),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));
  m.position.set(0,h+4.5,0);return m;
}

function loadFace(tk,grp,w,h){
  // Try multiple proxy approaches for CORS
  const makeLogoMesh=(imgSrc,callback)=>{
    const img=new Image();
    img.crossOrigin='anonymous';
    img.onload=()=>{
      try{
        const c=document.createElement('canvas');c.width=256;c.height=256;
        const ctx=c.getContext('2d');
        // Colored background matching token
        ctx.fillStyle='rgba(10,0,25,0.9)';ctx.fillRect(0,0,256,256);
        // Neon border ring
        ctx.strokeStyle='#ff2af4';ctx.lineWidth=4;
        ctx.beginPath();ctx.arc(128,128,118,0,Math.PI*2);ctx.stroke();
        // Inner glow
        const grd=ctx.createRadialGradient(128,128,40,128,128,118);
        grd.addColorStop(0,'rgba(255,42,244,0.15)');grd.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=grd;ctx.beginPath();ctx.arc(128,128,118,0,Math.PI*2);ctx.fill();
        // Clip circle and draw image
        ctx.save();ctx.beginPath();ctx.arc(128,128,110,0,Math.PI*2);ctx.clip();
        ctx.drawImage(img,18,18,220,220);ctx.restore();
        callback(new THREE.CanvasTexture(c));
      }catch(e){callback(null);}
    };
    img.onerror=()=>callback(null);
    img.src=imgSrc;
  };

  const addFaces=(tex)=>{
    if(!tex){grp.add(mkPH(tk.s,w,h));return;}
    const sz=Math.max(w*1.1,5.5);
    const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false});
    const yPos=h*0.62;
    // All 4 faces
    [[0,yPos,w/2+.12,0],[0,yPos,-w/2-.12,Math.PI],[w/2+.12,yPos,0,Math.PI/2],[-w/2-.12,yPos,0,-Math.PI/2]].forEach(([px,py,pz,ry])=>{
      const m=new THREE.Mesh(new THREE.PlaneGeometry(sz,sz),mat.clone());
      m.position.set(px,py,pz);m.rotation.y=ry;grp.add(m);
    });
  };

  // Try: corsproxy → direct → placeholder
  const proxyUrl='https://corsproxy.io/?'+encodeURIComponent(tk.img);
  makeLogoMesh(proxyUrl,tex=>{
    if(tex){addFaces(tex);}
    else{
      makeLogoMesh(tk.img,tex2=>{
        if(tex2)addFaces(tex2);
        else grp.add(mkPH(tk.s,w,h));
      });
    }
  });
}

function mkPH(sym,w,h){
  const c=document.createElement('canvas');c.width=256;c.height=256;const ctx=c.getContext('2d');
  // Dark background
  ctx.fillStyle='rgba(8,0,20,0.92)';ctx.fillRect(0,0,256,256);
  // Outer glow ring
  ctx.strokeStyle='#ff2af4';ctx.lineWidth=5;ctx.shadowBlur=18;ctx.shadowColor='#ff2af4';
  ctx.beginPath();ctx.arc(128,128,115,0,Math.PI*2);ctx.stroke();
  ctx.shadowBlur=0;
  // Inner accent ring
  ctx.strokeStyle='rgba(155,0,255,0.6)';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(128,128,98,0,Math.PI*2);ctx.stroke();
  // Token symbol - large and bold
  ctx.fillStyle='#ff2af4';ctx.font='bold 58px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.shadowBlur=20;ctx.shadowColor='#ff2af4';
  ctx.fillText(sym.slice(0,5),128,118);ctx.shadowBlur=0;
  // Separator line
  ctx.strokeStyle='rgba(255,42,244,0.35)';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(58,148);ctx.lineTo(198,148);ctx.stroke();
  // Subtext
  ctx.fillStyle='rgba(255,200,255,0.55)';ctx.font='20px monospace';
  ctx.fillText('SOLANA',128,172);
  const sz=Math.max(w*1.1,5.5);
  const mat=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false});
  const yPos=h*0.62;
  const grpArr=[];
  [[0,yPos,w/2+.12,0],[0,yPos,-w/2-.12,Math.PI],[w/2+.12,yPos,0,Math.PI/2],[-w/2-.12,yPos,0,-Math.PI/2]].forEach(([px,py,pz,ry])=>{
    const m=new THREE.Mesh(new THREE.PlaneGeometry(sz,sz),mat.clone());
    m.position.set(px,py,pz);m.rotation.y=ry;grpArr.push(m);
  });
  // Return a group with all 4 faces
  const g=new THREE.Group();grpArr.forEach(m=>g.add(m));return g;
}

/* ════════════════════════════════════════
   VEHICLES
════════════════════════════════════════ */
function spawnVeh(){
  if(vG)S.remove(vG);vehs=[];vG=new THREE.Group();
  for(let i=0;i<MAX_V;i++){
    const g=new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(2.2,.5,.9),new THREE.MeshLambertMaterial({color:i%3===0?C.acc:i%3===1?C.acc2:C.bB})));
    const dm=new THREE.Mesh(new THREE.SphereGeometry(.28,8,6,0,Math.PI*2,0,Math.PI/2),new THREE.MeshBasicMaterial({color:C.win,transparent:true,opacity:.6}));dm.position.set(.28,.25,0);g.add(dm);
    for(const sx of[-.88,.88]){const eg=new THREE.Mesh(new THREE.SphereGeometry(.09,6,6),new THREE.MeshBasicMaterial({color:C.gl}));eg.position.set(sx,-.17,0);g.add(eg);const el=new THREE.PointLight(C.gl,.4,4.5);el.position.copy(eg.position);g.add(el);}
    const ang=Math.random()*Math.PI*2,rad=55+Math.random()*145,alt=18+Math.random()*95,spd=(.007+Math.random()*.013)*(Math.random()<.5?1:-1);
    g.position.set(Math.cos(ang)*rad,alt,Math.sin(ang)*rad);
    g.userData={ang,rad,alt,spd,bob:Math.random()*Math.PI*2};
    vG.add(g);vehs.push(g);
  }
  S.add(vG);
}

/* ════════════════════════════════════════
   RAIN
════════════════════════════════════════ */
function spawnRain(){
  if(rPts)S.remove(rPts);
  const N=1400,pos=new Float32Array(N*3);
  for(let i=0;i<N;i++){pos[i*3]=(Math.random()-.5)*480;pos[i*3+1]=Math.random()*220;pos[i*3+2]=(Math.random()-.5)*480;}
  rGeo=new THREE.BufferGeometry();rGeo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  rPts=new THREE.Points(rGeo,new THREE.PointsMaterial({color:C.acc,size:.15,transparent:true,opacity:.15,sizeAttenuation:true}));
  S.add(rPts);
}

/* ════════════════════════════════════════
   MODES
════════════════════════════════════════ */
function goHome(){
  mode='home';
  document.getElementById('homepage').classList.remove('out');
  document.getElementById('ex').classList.remove('on');
  document.getElementById('fly').classList.remove('on');
  if(locked)document.exitPointerLock();
  if(planeMesh){S.remove(planeMesh);planeMesh=null;propellerMesh=null;}
  orb={th:.5,ph:1.05,r:280,tx:0,ty:0,tz:0};
}
function exitHome(){goHome();}
function enterExplore(){
  mode='explore';
  document.getElementById('homepage').classList.add('out');
  document.getElementById('ex').classList.add('on');
  document.getElementById('fly').classList.remove('on');
  orb={th:.5,ph:1.05,r:280,tx:0,ty:0,tz:0};
}
function enterFly(){
  mode='fly';
  document.getElementById('homepage').classList.add('out');
  document.getElementById('ex').classList.remove('on');
  document.getElementById('fly').classList.add('on');
  closePanel();
  createPlaneMesh();
}

function orbCam(){
  if(anim){animStep();return;}
  if(drag.on)return;
  if(mode==='home')orb.th+=.00055;
  const x=orb.tx+orb.r*Math.sin(orb.ph)*Math.sin(orb.th);
  const y=orb.ty+orb.r*Math.cos(orb.ph);
  const z=orb.tz+orb.r*Math.sin(orb.ph)*Math.cos(orb.th);
  cam.position.set(x,Math.max(2,y),z);
  cam.lookAt(orb.tx,orb.ty,orb.tz);
}

function exInput(){
  const cv=document.getElementById('canvas');
  cv.addEventListener('mousedown',e=>{
    if(mode==='explore'){drag={on:true,x:e.clientX,y:e.clientY};}
  });
  window.addEventListener('mousemove',e=>{
    if(!drag.on)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    orb.th-=dx*.008;orb.ph=Math.max(.15,Math.min(Math.PI*.92,orb.ph+dy*.008));
    drag.x=e.clientX;drag.y=e.clientY;
  });
  window.addEventListener('mouseup',e=>{
    if(drag.on){const dd=Math.hypot(e.clientX-drag.x,e.clientY-drag.y);drag.on=false;if(dd<4&&mode==='explore')exClick(e);}
  });
  cv.addEventListener('wheel',e=>{if(mode==='explore'||mode==='home'){orb.r=Math.max(18,Math.min(900,orb.r+e.deltaY*.35));}}  ,{passive:true});
}

function flyToBld(idx){
  if(idx<0||idx>=blds.length)return;
  mode='explore';
  const b=blds[idx];
  const tk=tokens[idx];
  const maxV=Math.max(...tokens.map(t=>t.vol));
  const minV=Math.min(...tokens.map(t=>t.vol));
  const vn=(Math.log(tk.vol+1)-Math.log(minV+1))/(Math.log(maxV+1)-Math.log(minV+1));
  const h=6+vn*125;
  const bx=b.position.x,bz=b.position.z;
  anim={
    cs:cam.position.clone(),
    ce:new THREE.Vector3(bx+22,h*.5+18,bz+30),
    ts:{x:orb.tx,y:orb.ty,z:orb.tz},
    te:{x:bx,y:h*.4,z:bz},
    t0:performance.now(),dur:1300
  };
}

function animStep(){
  const raw=Math.min(1,(performance.now()-anim.t0)/anim.dur);
  const t=raw<.5?4*raw*raw*raw:1-Math.pow(-2*raw+2,3)/2;
  cam.position.lerpVectors(anim.cs,anim.ce,t);
  const lx=anim.ts.x+(anim.te.x-anim.ts.x)*t;
  const ly=anim.ts.y+(anim.te.y-anim.ts.y)*t;
  const lz=anim.ts.z+(anim.te.z-anim.ts.z)*t;
  cam.lookAt(lx,ly,lz);
  if(raw>=1){
    orb.tx=anim.te.x;orb.ty=anim.te.y;orb.tz=anim.te.z;
    const dx=cam.position.x-orb.tx,dy2=cam.position.y-orb.ty,dz=cam.position.z-orb.tz;
    orb.r=Math.sqrt(dx*dx+dy2*dy2+dz*dz);
    orb.ph=Math.acos(Math.max(-1,Math.min(1,dy2/orb.r)));
    orb.th=Math.atan2(dx,dz);
    anim=null;
  }
}

function exClick(e){
  const rect=ren.domElement.getBoundingClientRect();
  const mx=((e.clientX-rect.left)/rect.width)*2-1;
  const my=-((e.clientY-rect.top)/rect.height)*2+1;
  rc.setFromCamera(new THREE.Vector2(mx,my),cam);
  const ms=[];blds.forEach(b=>b.traverse(c=>{if(c.isMesh&&c.userData.isB)ms.push(c);}));
  const hits=rc.intersectObjects(ms,false);
  if(hits.length){const {tk,idx}=hits[0].object.userData;if(tk){openPanel(tk,idx);flyToBld(idx);flashFR();}}
}

/* ════════════════════════════════════════
   SIDE PANEL
════════════════════════════════════════ */
function openPanel(tk,idx){
  const logo=tk.img&&!tk.a.startsWith('demo')?tk.img:phURL(tk.s);
  // For <img> tags, no CORS needed - use direct URL
  const lgEl=document.getElementById('sp-lg');
  const bgEl=document.getElementById('sp-bg');
  lgEl.src=logo;
  bgEl.src=logo;
  lgEl.onerror=function(){this.src=phURL(tk.s);};
  bgEl.onerror=function(){this.src=phURL(tk.s);};
  // Remove crossOrigin attr so browser doesn't apply CORS restrictions to display
  lgEl.removeAttribute('crossorigin');
  bgEl.removeAttribute('crossorigin');
  document.getElementById('sp-rn').textContent=idx+1;
  document.getElementById('sp-nm').textContent=tk.n;
  document.getElementById('sp-sym').textContent=tk.s+' · SOLANA';
  document.getElementById('sp-v').textContent='$'+fmt(tk.vol);
  document.getElementById('sp-m').textContent='$'+fmt(tk.mc);
  document.getElementById('sp-p').textContent='$'+fmtP(tk.px);
  const ch=tk.ch;
  const cel=document.getElementById('sp-c');cel.textContent=(ch>=0?'+':'')+ch.toFixed(2)+'%';cel.className='sprv '+(ch>=0?'u':'d');
  document.getElementById('sp-t').textContent=fmt(tk.tx)+' TXN';
  const fill=document.getElementById('sp-cf');fill.style.width=Math.min(100,Math.abs(ch)*3)+'%';fill.style.background=ch>=0?'#00ff88':'#ff3855';
  sparkline(ch);
  document.getElementById('sp-dex').onclick=()=>window.open(tk.url,'_blank');
  document.getElementById('sp-bee').onclick=()=>window.open(tk.bee,'_blank');
  document.getElementById('sp-fly').onclick=()=>{closePanel();showFlyInstr();setTimeout(()=>{if(blds[idx])cam.position.set(blds[idx].position.x+20,50,blds[idx].position.z+40);yaw=0;pitch=-.15;},80);};
  document.getElementById('sp').classList.add('open');
}
function closePanel(){document.getElementById('sp').classList.remove('open');}

function sparkline(ch){
  const cv=document.getElementById('sp-sc');cv.width=cv.offsetWidth||300;
  const ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,36);
  const pts=[];let v=18;const n=24;
  for(let i=0;i<n;i++){v=Math.max(2,Math.min(34,v+ch/n+(Math.random()*4-2)));pts.push({x:(i/(n-1))*cv.width,y:v});}
  const col=ch>=0?'#00ff88':'#ff3855';
  ctx.strokeStyle=col;ctx.lineWidth=1.5;ctx.globalAlpha=.82;
  ctx.beginPath();pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));ctx.stroke();
  ctx.globalAlpha=.14;ctx.fillStyle=col;
  ctx.beginPath();ctx.moveTo(pts[0].x,36);pts.forEach(p=>ctx.lineTo(p.x,p.y));ctx.lineTo(pts[pts.length-1].x,36);ctx.closePath();ctx.fill();
}

function phURL(sym){
  const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');
  ctx.fillStyle='#0a0018';ctx.fillRect(0,0,64,64);
  ctx.strokeStyle='#ff2af4';ctx.lineWidth=2;ctx.beginPath();ctx.arc(32,32,28,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#ff2af4';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(sym.slice(0,4),32,32);
  return c.toDataURL();
}

/* ════════════════════════════════════════
   PLANE MODEL
════════════════════════════════════════ */
function createPlaneMesh(){
  if(planeMesh){S.remove(planeMesh);planeMesh=null;propellerMesh=null;}
  const planeGroup=new THREE.Group();

  const bodyMat=new THREE.MeshLambertMaterial({color:0xf0f0f8});
  const accentMat=new THREE.MeshBasicMaterial({color:0xff2af4});
  const glassMat=new THREE.MeshBasicMaterial({color:0x44aaff,transparent:true,opacity:.6});
  const redMat=new THREE.MeshLambertMaterial({color:0xff3030});

  // Fuselage
  const fuselage=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.75,3.8),bodyMat);
  fuselage.position.set(0,0,0);planeGroup.add(fuselage);

  // Nose cone
  const nose=new THREE.Mesh(new THREE.CylinderGeometry(0,0.36,1.1,8),bodyMat);
  nose.rotation.x=-Math.PI/2;nose.position.set(0,0,-2.35);planeGroup.add(nose);

  // Tail
  const tail=new THREE.Mesh(new THREE.BoxGeometry(0.65,0.55,1.0),bodyMat);
  tail.position.set(0,0.1,2.1);planeGroup.add(tail);

  // Main wings
  const wingL=new THREE.Mesh(new THREE.BoxGeometry(4.8,0.18,1.4),bodyMat);
  wingL.position.set(-2.8,-.05,0.1);planeGroup.add(wingL);
  const wingR=new THREE.Mesh(new THREE.BoxGeometry(4.8,0.18,1.4),bodyMat);
  wingR.position.set(2.8,-.05,0.1);planeGroup.add(wingR);

  // Wing tips (red)
  const tipL=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.7),redMat);
  tipL.position.set(-5.25,0,0.05);planeGroup.add(tipL);
  const tipR=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.7),redMat);
  tipR.position.set(5.25,0,0.05);planeGroup.add(tipR);

  // Horizontal stabilizers (tail wings)
  const stabL=new THREE.Mesh(new THREE.BoxGeometry(2.0,0.12,0.85),bodyMat);
  stabL.position.set(-1.3,0.1,2.25);planeGroup.add(stabL);
  const stabR=new THREE.Mesh(new THREE.BoxGeometry(2.0,0.12,0.85),bodyMat);
  stabR.position.set(1.3,0.1,2.25);planeGroup.add(stabR);

  // Vertical stabilizer
  const vStab=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.9,0.9),redMat);
  vStab.position.set(0,0.62,2.1);planeGroup.add(vStab);

  // Cockpit
  const cockpit=new THREE.Mesh(new THREE.BoxGeometry(0.72,0.42,0.72),glassMat);
  cockpit.position.set(0,0.52,-0.6);planeGroup.add(cockpit);

  // Engine cowling
  const cowl=new THREE.Mesh(new THREE.CylinderGeometry(0.36,0.4,0.5,12),bodyMat);
  cowl.rotation.x=Math.PI/2;cowl.position.set(0,0,-2.1);planeGroup.add(cowl);

  // Propeller hub
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.28,8),new THREE.MeshBasicMaterial({color:0x888888}));
  hub.rotation.x=Math.PI/2;hub.position.set(0,0,-2.75);planeGroup.add(hub);

  // Propeller blades
  const propGroup=new THREE.Group();
  propGroup.position.set(0,0,-2.75);
  for(let i=0;i<2;i++){
    const blade=new THREE.Mesh(new THREE.BoxGeometry(0.14,1.8,0.08),new THREE.MeshLambertMaterial({color:0x996633}));
    blade.rotation.z=i*Math.PI/2;
    propGroup.add(blade);
  }
  planeGroup.add(propGroup);
  propellerMesh=propGroup;

  // Landing gear stubs
  const gear=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.45,6),new THREE.MeshBasicMaterial({color:0x444444}));
  gear.position.set(0,-0.5,-0.6);planeGroup.add(gear);
  const wheel=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.14,0.12,8),new THREE.MeshBasicMaterial({color:0x222222}));
  wheel.rotation.x=Math.PI/2;wheel.position.set(0,-0.72,-0.6);planeGroup.add(wheel);

  // Glow light under plane
  const glow=new THREE.PointLight(0xff2af4,1.2,12);glow.position.set(0,0,0);planeGroup.add(glow);

  planeGroup.scale.set(1.4,1.4,1.4);
  planeMesh=planeGroup;
  S.add(planeMesh);
}

/* ════════════════════════════════════════
   FLY CONTROLS
════════════════════════════════════════ */
function showFlyInstr(){
  document.getElementById('fly-instr').classList.remove('hidden');
  document.getElementById('homepage').classList.add('out');
}
function hideFlyInstr(){
  document.getElementById('fly-instr').classList.add('hidden');
}
function startFlyMode(){
  hideFlyInstr();
  enterFly();
  // Spawn at city center, elevated, looking forward
  cam.position.set(0,55,60);
  yaw=Math.PI;pitch=-.08;
  flySpeed=FLY_S;
  planeRoll=0;planePitch=0;
}

function flyInput(){
  document.addEventListener('mousemove',e=>{if(!locked||mode!=='fly')return;yaw-=e.movementX*MS;pitch-=e.movementY*MS;pitch=Math.max(-Math.PI/2.1,Math.min(Math.PI/2.1,pitch));});
  document.addEventListener('mousedown',()=>{if(!locked||mode!=='fly')return;flyClick();});
  document.addEventListener('pointerlockchange',()=>{
    locked=!!document.pointerLockElement;
    document.getElementById('fly-ch').style.display=locked?'block':'none';
    document.getElementById('fly-lk').classList.toggle('hidden',locked);
  });
  // Scroll changes base flight speed
  window.addEventListener('wheel',e=>{
    if(mode==='fly'){
      flySpeed=Math.max(0.3,Math.min(MAX_SPEED,flySpeed-e.deltaY*0.003));
      document.getElementById('h-spd').textContent=flySpeed.toFixed(1);
    }else if(mode==='explore'||mode==='home'){
      orb.r=Math.max(18,Math.min(900,orb.r+e.deltaY*.35));
    }
  },{passive:true});
}
function reqLock(){document.getElementById('canvas').requestPointerLock();}
function flyClick(){
  rc.setFromCamera(new THREE.Vector2(0,0),cam);
  const ms=[];blds.forEach(b=>b.traverse(c=>{if(c.isMesh&&c.userData.isB)ms.push(c);}));
  const h=rc.intersectObjects(ms,false);
  if(h.length){const {tk,idx}=h[0].object.userData;if(tk){if(locked)document.exitPointerLock();openPanel(tk,idx);}}
}

function drawAttitude(){
  if(!attCtx)return;
  const W=80,H=80,cx=W/2,cy=H/2;
  attCtx.clearRect(0,0,W,H);
  // Sky/ground split
  attCtx.save();
  attCtx.beginPath();attCtx.arc(cx,cy,36,0,Math.PI*2);attCtx.clip();
  // Horizon offset by pitch
  const pOff=pitch*80;
  // Sky
  attCtx.fillStyle='#003366';attCtx.fillRect(0,0,W,H);
  // Ground (rotated by roll)
  attCtx.save();
  attCtx.translate(cx,cy);attCtx.rotate(-planeRoll);
  attCtx.fillStyle='#4d2600';attCtx.fillRect(-W,pOff,W*2,H);
  attCtx.restore();
  // Horizon line
  attCtx.save();
  attCtx.translate(cx,cy);attCtx.rotate(-planeRoll);
  attCtx.strokeStyle='#ffffff';attCtx.lineWidth=1.5;
  attCtx.beginPath();attCtx.moveTo(-40,pOff);attCtx.lineTo(40,pOff);attCtx.stroke();
  attCtx.restore();
  attCtx.restore();
  // Border
  attCtx.strokeStyle='rgba(255,42,244,.4)';attCtx.lineWidth=1.5;
  attCtx.beginPath();attCtx.arc(cx,cy,36,0,Math.PI*2);attCtx.stroke();
  // Fixed plane symbol
  attCtx.strokeStyle='#ff2af4';attCtx.lineWidth=2;
  attCtx.beginPath();attCtx.moveTo(cx-14,cy);attCtx.lineTo(cx-5,cy);attCtx.stroke();
  attCtx.beginPath();attCtx.moveTo(cx+14,cy);attCtx.lineTo(cx+5,cy);attCtx.stroke();
  attCtx.beginPath();attCtx.arc(cx,cy,3,0,Math.PI*2);attCtx.stroke();
}
function setupMM(){const c=document.getElementById('mmc');c.width=120;c.height=120;mmC=c.getContext('2d');}
function drawMM(){
  if(!mmC||!blds.length)return;
  const W=120,H=120;mmC.fillStyle='rgba(0,0,0,.88)';mmC.fillRect(0,0,W,H);
  const sc=W/560,cx=W/2,cy=H/2;
  blds.forEach((b,i)=>{const tk=tokens[i];if(!tk)return;const mx=cx+b.position.x*sc,my=cy+b.position.z*sc;const sz=Math.max(1.2,Math.log(tk.vol+1)/9);mmC.fillStyle=tk.ch>=0?'#00ff88':'#ff3855';mmC.globalAlpha=.5;mmC.fillRect(mx-sz/2,my-sz/2,sz,sz);});
  vehs.forEach(v=>{mmC.fillStyle='rgba(255,255,255,.28)';mmC.globalAlpha=.28;mmC.beginPath();mmC.arc(cx+v.position.x*sc,cy+v.position.z*sc,1.1,0,Math.PI*2);mmC.fill();});
  mmC.globalAlpha=1;
  const px=cx+cam.position.x*sc,pz=cy+cam.position.z*sc;
  mmC.fillStyle='#fff';mmC.beginPath();mmC.arc(px,pz,2.7,0,Math.PI*2);mmC.fill();
  if(mode==='fly'){mmC.strokeStyle='rgba(255,255,255,.65)';mmC.lineWidth=1.2;mmC.beginPath();mmC.moveTo(px,pz);mmC.lineTo(px-Math.sin(yaw)*8,pz-Math.cos(yaw)*8);mmC.stroke();}
}

/* ════════════════════════════════════════
   LEADERBOARD (4 tabs, top 10 each)
════════════════════════════════════════ */
function buildLBRows(){
  buildLBTab('vol',tokens.slice().sort((a,b)=>b.vol-a.vol).slice(0,10),'vol');
  buildLBTab('mc',tokens.slice().sort((a,b)=>b.mc-a.mc).slice(0,10),'mc');
  // For buys/sells we split txns - approximate from tx count and change
  const withBuySell=tokens.map(t=>({...t,buys:Math.round(t.tx*(t.ch>=0?.62:.38)),sells:Math.round(t.tx*(t.ch>=0?.38:.62))}));
  buildLBTab('buys',withBuySell.slice().sort((a,b)=>b.buys-a.buys).slice(0,10),'buys');
  buildLBTab('sells',withBuySell.slice().sort((a,b)=>b.sells-a.sells).slice(0,10),'sells');
}

function buildLBTab(tabId,list,sortKey){
  const wrap=document.getElementById('lbr-'+tabId);if(!wrap)return;
  wrap.innerHTML='';
  const maxVal=list[0]?list[0][sortKey]||list[0].vol:1;
  list.forEach((tk,i)=>{
    const ch=tk.ch,cc=ch>=0?'#00ff88':'#ff3855';
    const logo=tk.img&&!tk.a.startsWith('demo')?tk.img:'';
    const ph=phURL(tk.s);
    const row=document.createElement('div');row.className='lr';
    let mainVal='',secVal='';
    if(sortKey==='vol'){mainVal='$'+fmt(tk.vol);secVal='$'+fmt(tk.mc);}
    else if(sortKey==='mc'){mainVal='$'+fmt(tk.mc);secVal='$'+fmt(tk.vol);}
    else if(sortKey==='buys'){mainVal=fmt(tk.buys||0)+' TXN';secVal='$'+fmt(tk.vol);}
    else if(sortKey==='sells'){mainVal=fmt(tk.sells||0)+' TXN';secVal='$'+fmt(tk.vol);}
    const barPct=Math.round((tk[sortKey]||tk.vol)/maxVal*100);
    // Find original token index for navigation
    const origIdx=tokens.findIndex(t=>t.s===tk.s&&t.a===tk.a);
    row.innerHTML=`<div class="lrk">${i+1}</div><div><img class="lri" src="${logo||ph}" onerror="this.onerror=null;this.src='${ph}'"></div><div><div class="lrn">${tk.s}</div><div class="lrs2">${tk.n.slice(0,22)}</div></div><div class="lrv">${mainVal}</div><div class="lrm">${secVal}</div><div class="lrc" style="color:${cc}">${ch>=0?'+':''}${ch.toFixed(1)}%</div><div><div class="lrbw"><div class="lrbf" style="width:${barPct}%"></div></div></div>`;
    row.onclick=()=>{if(origIdx>=0){hideLB();setTimeout(()=>{enterExplore();setTimeout(()=>{flyToBld(origIdx);openPanel(tokens[origIdx],origIdx);flashFR();},200);},150);}};
    wrap.appendChild(row);
  });
}

function switchLBTab(tabId,btn){
  document.querySelectorAll('.lb-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.lb-panel').forEach(p=>p.classList.remove('active'));
  if(btn)btn.classList.add('active');
  const panel=document.getElementById('lb-panel-'+tabId);
  if(panel)panel.classList.add('active');
}

function showLB(){document.getElementById('lbo').classList.add('on');document.getElementById('homepage').classList.add('out');}
function hideLB(){document.getElementById('lbo').classList.remove('on');if(mode==='home')document.getElementById('homepage').classList.remove('out');}

/* ════════════════════════════════════════
   SEARCH
════════════════════════════════════════ */
function srInput(){
  const inp=document.getElementById('ex-si'),res=document.getElementById('ex-sr');
  inp.addEventListener('input',()=>{
    const q=inp.value.trim().toUpperCase();
    if(!q){res.style.display='none';return;}
    const m=tokens.filter(t=>t.s.includes(q)||t.n.toUpperCase().includes(q)).slice(0,10);
    if(!m.length){res.style.display='none';return;}
    res.innerHTML=m.map(t=>{
      const i=tokens.indexOf(t);
      return `<div class="esi" onclick="document.getElementById('ex-si').value='';document.getElementById('ex-sr').style.display='none';enterExplore();setTimeout(()=>{flyToBld(${i});openPanel(tokens[${i}],${i});flashFR();},100);"><div class="esi-left"><span class="esi-s">${t.s}</span><span class="esi-n">${t.n.slice(0,22)}</span></div><span class="esi-v">#${i+1} $${fmt(t.vol)}</span></div>`;
    }).join('');
    res.style.display='block';
  });
  inp.addEventListener('focus',()=>{if(inp.value.trim())res.style.display='block';});
  inp.addEventListener('keydown',e=>e.stopPropagation());
  document.addEventListener('click',e=>{if(!e.target.closest('#ex-sw')&&!e.target.closest('#ex-sr'))res.style.display='none';});
}

/* ════════════════════════════════════════
   HP STATS + TICKER
════════════════════════════════════════ */
function updateHP(){
  document.getElementById('hp-n').textContent=tokens.length;
  document.getElementById('hp-v').textContent='$'+fmt(tokens.reduce((s,t)=>s+t.vol,0));
  document.getElementById('hp-g').textContent=tokens.filter(t=>t.ch>0).length;
  document.getElementById('hp-l').textContent=tokens.filter(t=>t.ch<0).length;
}
function buildTicker(){
  const make=()=>tokens.slice(0,50).map(t=>`<span class="ti"><span class="ts">${t.s}</span><span class="tp">$${fmtP(t.px)}</span><span class="${t.ch>=0?'tu':'td'}">${t.ch>=0?'+':''}${t.ch.toFixed(1)}%</span></span><span class="tx">·</span>`).join('');
  document.getElementById('tki').innerHTML=make()+make();
}

/* ════════════════════════════════════════
   SVG EXPORT
════════════════════════════════════════ */
function exportSVG(){
  if(!tokens.length)return;
  const W=1200,H=520,top=tokens.slice(0,50);
  const maxV=Math.max(...top.map(k=>k.vol)),minV=Math.min(...top.map(k=>k.vol));
  const bw=Math.floor((W-40)/top.length),gY=H-50;
  let p=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">`,`<rect width="${W}" height="${H}" fill="#060010"/>`,
    ...Array.from({length:80},(_,i)=>{const sx=(i*137.5)%W,sy=(i*73.3)%(H*.5);return `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${(0.4+Math.random()).toFixed(1)}" fill="#ff2af4" opacity="${(0.06+Math.random()*.25).toFixed(2)}"/>`;}),
    `<rect x="0" y="${gY}" width="${W}" height="50" fill="#130035"/>`,`<line x1="0" y1="${gY}" x2="${W}" y2="${gY}" stroke="#ff2af4" stroke-width=".7" opacity=".28"/>`,
  ];
  top.forEach((tk,i)=>{
    const vn=(Math.log(tk.vol+1)-Math.log(minV+1))/(Math.log(maxV+1)-Math.log(minV+1));
    const bh=28+Math.round(vn*(H-88)),bx=20+i*bw,by=gY-bh;
    const cc=tk.ch>=0?'#00ff88':'#ff3855';
    p.push(`<rect x="${bx}" y="${by}" width="${bw-2}" height="${bh}" fill="${i%2===0?'#130035':'#1c004a'}" stroke="#ff2af4" stroke-width=".3" opacity=".9"/>`);
    p.push(`<rect x="${bx}" y="${by}" width="${bw-2}" height="3" fill="${cc}" opacity=".88"/>`);
    const wR=Math.floor(bh/8),wC=Math.max(1,Math.floor((bw-3)/5));
    for(let r=0;r<wR;r++)for(let c2=0;c2<wC;c2++)if(Math.random()>.38)p.push(`<rect x="${bx+1+c2*5}" y="${by+4+r*8}" width="3" height="4" fill="#dd44ff" opacity="${(0.14+Math.random()*.48).toFixed(2)}"/>`);
    p.push(`<line x1="${bx+(bw-2)/2}" y1="${by}" x2="${bx+(bw-2)/2}" y2="${by-7}" stroke="#ff2af4" stroke-width=".7"/>`);
    if(bw>9)p.push(`<text transform="rotate(-90,${bx+(bw-2)/2},${gY-4})" x="${bx+(bw-2)/2}" y="${gY-4}" font-family="monospace" font-size="${Math.max(6,Math.min(9,bw-1))}" fill="#ff2af4" text-anchor="end">${tk.s}</text>`);
  });
  p.push(`<text x="${W/2}" y="26" font-family="monospace" font-size="18" fill="#ff2af4" text-anchor="middle" font-weight="bold" letter-spacing="5">PUMP CITY</text>`);
  p.push(`<text x="${W/2}" y="43" font-family="monospace" font-size="9" fill="#9b00ff" text-anchor="middle" letter-spacing="3">SOLANA TOKEN SKYLINE · 24H VOLUME</text>`);
  p.push('</svg>');
  svgD=p.join('\n');
  document.getElementById('svgc').innerHTML=svgD;
  document.getElementById('svgo').style.display='flex';
}
function dlSVG(){const b=new Blob([svgD],{type:'image/svg+xml'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='pump-city.svg';a.click();URL.revokeObjectURL(u);}
function closeSVG(){document.getElementById('svgo').style.display='none';}

/* ════════════════════════════════════════
   UTILS
════════════════════════════════════════ */
function flashFR(){const el=document.getElementById('fr');el.style.display='block';setTimeout(()=>el.style.display='none',1300);}
function fmt(n){if(!n||isNaN(n))return'--';if(n>=1e9)return(n/1e9).toFixed(2)+'B';if(n>=1e6)return(n/1e6).toFixed(2)+'M';if(n>=1e3)return(n/1e3).toFixed(1)+'K';return n.toFixed(2);}
function fmtP(p){if(!p||isNaN(p))return'--';if(p<.0001)return p.toExponential(2);if(p<.01)return p.toFixed(6);if(p<1)return p.toFixed(4);return p.toFixed(2);}
function ld(msg,pct){document.getElementById('lst').textContent=msg;document.getElementById('lb').style.width=pct+'%';}
function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('on'),2400);}

/* ════════════════════════════════════════
   MAIN LOOP
════════════════════════════════════════ */
function loop(){
  requestAnimationFrame(loop);
  const dt=clk.getDelta(),et=clk.getElapsedTime();
  if(mode==='home'){orb.th+=.0009;orbCam();}
  else if(mode==='explore'){orbCam();}
  else if(mode==='fly'){
    const boost=keys['ShiftLeft']||keys['ShiftRight'];
    const sp=boost?flySpeed*3.2:flySpeed;
    const fwd=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
    const rt=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
    vel.set(0,0,0);
    if(keys['KeyW']||keys['ArrowUp'])vel.addScaledVector(fwd,sp);
    if(keys['KeyS']||keys['ArrowDown'])vel.addScaledVector(fwd,-sp*0.7);
    if(keys['KeyA']||keys['ArrowLeft'])vel.addScaledVector(rt,-sp*0.8);
    if(keys['KeyD']||keys['ArrowRight'])vel.addScaledVector(rt,sp*0.8);
    if(keys['Space'])vel.y+=sp*0.9;
    if(keys['KeyQ'])vel.y-=sp*0.9;
    cam.position.add(vel);
    cam.position.y=Math.max(1.5,cam.position.y);
    cam.quaternion.setFromEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));

    // Update plane mesh — visible & spinning propeller, trailing behind cam
    if(planeMesh){
      const behind=new THREE.Vector3(Math.sin(yaw)*6,-.8+Math.sin(pitch)*-3,Math.cos(yaw)*6);
      planeMesh.position.copy(cam.position).add(behind);
      planeMesh.rotation.set(-pitch*0.6,yaw+Math.PI,0,'YXZ');
      if(propellerMesh)propellerMesh.rotation.z+=dt*(10+flySpeed*8)*(boost?4:1);
    }

    document.getElementById('h-alt').textContent=Math.round(cam.position.y);
    document.getElementById('h-spd').textContent=flySpeed.toFixed(1);
  }
  blds.forEach((b,i)=>b.traverse(c=>{if(c.isPointLight)c.intensity=.18+Math.sin(et*1.4+i*.95)*.1;}));
  vehs.forEach(v=>{v.userData.ang+=v.userData.spd;v.position.x=Math.cos(v.userData.ang)*v.userData.rad;v.position.z=Math.sin(v.userData.ang)*v.userData.rad;v.position.y=v.userData.alt+Math.sin(et*.7+v.userData.bob)*1.4;v.rotation.y=-v.userData.ang+(v.userData.spd>0?-Math.PI/2:Math.PI/2);v.rotation.z=v.userData.spd>0?-.15:.15;});
  if(rGeo){const p=rGeo.attributes.position.array;for(let i=0;i<p.length/3;i++){p[i*3+1]-=dt*15;if(p[i*3+1]<0){p[i*3+1]=220;p[i*3]=(Math.random()-.5)*480;p[i*3+2]=(Math.random()-.5)*480;}}rGeo.attributes.position.needsUpdate=true;}
  // slowly rotate moon
  S.children.forEach(c=>{if(c.userData.isMoon&&c.children[0])c.children[0].rotation.y=et*.008;});
  drawMM();ren.render(S,cam);
}

init();
