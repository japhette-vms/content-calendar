/* Content Calendar add-ons: caption counter, Board view, "Duplicate now".
   Loaded after the main script via <script src="addons.js"></script> just before </body>.
   Needs no database changes. To remove: delete that one line from index.html. */
(function(){
'use strict';

/* ---------- styles ---------- */
const css=document.createElement('style');
css.textContent=`
.ccount{font-size:12px;color:var(--mute);margin-top:4px}
.ccount.near{color:#9a6700;font-weight:500}
.ccount.over{color:#c2410c;font-weight:700}
@media (prefers-color-scheme:dark){.ccount.near{color:#ffd28a}.ccount.over{color:#ff9d7a}}
.board{display:flex;gap:10px;overflow-x:auto;padding-bottom:8px;align-items:flex-start}
.bcol{flex:1 0 230px;min-width:230px;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:8px;min-height:160px}
.bcol.hot{outline:2px dashed var(--acc);outline-offset:-2px}
.bcol h3{margin:0 0 8px;font-size:14px;display:flex;justify-content:space-between;align-items:center}
.bcol h3 span{color:var(--mute);font-weight:400}
.bcard{display:block;width:100%;text-align:left;margin-bottom:8px;padding:8px 10px;border-left:4px solid var(--pc,#888);border-radius:8px;background:var(--card);cursor:grab}
.bcard>span{display:block}
.bcard .bd{font-size:12px;color:var(--mute)}
.bcard .bp{font-weight:500}
.bcard .bc{color:var(--mute);font-size:13px;margin:2px 0 4px;overflow-wrap:anywhere}
.bempty{color:var(--mute);font-size:13px;padding:6px 2px}
`;
document.head.appendChild(css);

/* ---------- 1. caption length counter ---------- */
// Approximate public limits. Facebook's is so large that only a count is shown.
const LIM={'Instagram':2200,'TikTok':4000,'LinkedIn':3000,'Google Business Profile':1500,'Facebook':63206};

function addCounter(){
  const f=document.getElementById('pf');
  if(!f||f.dataset.cc)return;
  const ta=f.elements.namedItem('caption'),pl=f.elements.namedItem('platform'),ht=f.elements.namedItem('hashtags');
  if(!ta||!pl)return;
  f.dataset.cc='1';
  const o=document.createElement('div');
  o.id='ccount';o.setAttribute('aria-live','polite');
  ta.insertAdjacentElement('afterend',o);
  const upd=()=>{
    const n=[...ta.value].length,lim=LIM[pl.value]||0;
    let t=n.toLocaleString()+' characters',cls='';
    if(lim&&lim<10000){
      t=n.toLocaleString()+' / '+lim.toLocaleString();
      if(n>lim)cls='over';else if(n>lim*0.9)cls='near';
    }
    if(pl.value==='Instagram'){
      const h=((ta.value+' '+(ht?ht.value:'')).match(/#\S+/g)||[]).length;
      if(h){t+=' · '+h+' hashtag'+(h===1?'':'s');if(h>30){t+=' (Instagram allows 30)';cls='over';}}
    }
    o.textContent=t;o.className='ccount'+(cls?' '+cls:'');
  };
  ta.addEventListener('input',upd);
  pl.addEventListener('change',upd);
  if(ht)ht.addEventListener('input',upd);
  upd();
}

/* ---------- 2. duplicate in one tap ---------- */
function addDupNow(p){
  const dup=document.getElementById('dup');
  if(!dup||!p||!p.id||document.getElementById('dupnow'))return;
  dup.textContent='Duplicate and edit';
  const b=document.createElement('button');
  b.type='button';b.id='dupnow';b.textContent='Duplicate now';
  dup.insertAdjacentElement('afterend',b);
  b.onclick=async()=>{
    b.disabled=true;
    const row={client_id:p.client_id||cid,post_date:p.post_date,post_time:p.post_time,platform:p.platform,pillar:p.pillar,format:p.format,caption:p.caption,visual:p.visual,hashtags:p.hashtags,campaign:p.campaign,repost:false,status:'Draft',approval:'Pending'};
    const r=await sb.from('posts').insert(row).select('id').single();
    if(r.error){b.disabled=false;return alert('Could not duplicate: '+r.error.message);}
    document.getElementById('dlg').close();
    await loadPosts();adminView();
    toast('Post duplicated as a draft.',async()=>{
      const u=await sb.from('posts').delete().eq('id',r.data.id);
      if(u.error)return alert('Could not undo: '+u.error.message);
      await loadPosts();adminView();});
  };
}

const _postForm=postForm;
window.postForm=function(p){
  const r=_postForm.apply(this,arguments);
  try{addCounter();addDupNow(p);}catch(e){console.error('addons',e);}
  return r;
};

/* ---------- 3. Board view ---------- */
let bdAll=false;

function boardView(){
  const L=stList(),y=month.getFullYear(),m=month.getMonth();
  const ps=posts.filter(p=>bdAll||inMonth(p,y,m));
  const extra=[...new Set(ps.map(p=>p.status||'Draft'))].filter(s=>!L.includes(s));
  const cols=[...L,...extra];
  const byDate=(a,b)=>String(a.post_date||'9').localeCompare(String(b.post_date||'9'))||String(a.post_time||'').localeCompare(String(b.post_time||''));
  const card=p=>`<button type="button" class="bcard" data-id="${esc(p.id)}" style="--pc:${safeCol(PILLARS[p.pillar])}"><span class="bd">${esc(p.post_date||'No date')}${p.post_time?' · '+esc(p.post_time.slice(0,5)):''}</span><span class="bp">${picon(p.platform)}${esc(p.platform)}</span><span class="bc">${p.caption?esc(p.caption.slice(0,80)):'<i>No caption</i>'}</span>${apBadge(p)}</button>`;
  const colHtml=s=>{const cs=ps.filter(p=>(p.status||'Draft')===s).sort(byDate);
    return `<div class="bcol" data-s="${esc(s)}"><h3>${esc(s)}<span>${cs.length}</span></h3>${cs.map(card).join('')||'<div class="bempty">Nothing here</div>'}</div>`;};
  $('#app').innerHTML=miniHead()+`<main>${viewbar('board')}
  <div class="row" style="margin-bottom:10px">${bdAll?'':'<button type="button" id="bpm" aria-label="Previous month">‹</button>'}<h2 style="margin:0;flex:1;text-align:center">${bdAll?'All posts':month.toLocaleString('en',{month:'long',year:'numeric'})}</h2>${bdAll?'':'<button type="button" id="bnm" aria-label="Next month">›</button>'}<label style="display:flex;gap:6px;align-items:center;margin:0;color:var(--ink)"><input type="checkbox" id="ball" style="width:auto;min-height:0"${bdAll?' checked':''}> All dates</label></div>
  <div class="board">${cols.map(colHtml).join('')}</div>
  <p style="color:var(--mute);font-size:13px">Drag a card to another column to change its status. Tap a card to open it.${STAGES?' Approval stage rules still apply.':''}</p></main>`;
  miniBind(boardView);
  addBoardBtn();
  const bp=document.getElementById('bpm'),bn=document.getElementById('bnm');
  if(bp)bp.onclick=()=>{month.setMonth(month.getMonth()-1);boardView();};
  if(bn)bn.onclick=()=>{month.setMonth(month.getMonth()+1);boardView();};
  document.getElementById('ball').onchange=e=>{bdAll=e.target.checked;boardView();};
  document.querySelectorAll('.bcard').forEach(c=>{
    c.draggable=true;
    c.ondragstart=e=>e.dataTransfer.setData('text/plain',c.dataset.id);
    c.onclick=()=>postForm(posts.find(p=>p.id===c.dataset.id));
  });
  document.querySelectorAll('.bcol').forEach(c=>{
    c.ondragover=e=>{e.preventDefault();c.classList.add('hot');};
    c.ondragleave=()=>c.classList.remove('hot');
    c.ondrop=async e=>{
      e.preventDefault();c.classList.remove('hot');
      const id=e.dataTransfer.getData('text/plain'),q=posts.find(x=>x.id===id),st=c.dataset.s;
      if(!q||(q.status||'Draft')===st)return;
      const prev=q.status||'Draft';
      const r=await sb.from('posts').update({status:st}).eq('id',id);
      if(r.error)return alert('Could not move: '+r.error.message);
      await loadPosts();boardView();
      toast('Moved to '+st+'.',async()=>{
        const u=await sb.from('posts').update({status:prev}).eq('id',id);
        if(u.error)return alert('Could not undo: '+u.error.message);
        await loadPosts();boardView();});
    };
  });
}

function addBoardBtn(){
  const seg=document.querySelector('.seg[aria-label="View"]');
  if(!seg||seg.querySelector('.vbb'))return;
  const b=document.createElement('button');
  b.type='button';b.className='vbb'+(vw==='board'?' on':'');b.textContent='Board';
  b.onclick=()=>{vw='board';adminView();};
  seg.appendChild(b);
}

const _adminView=adminView;
window.adminView=function(){
  if(vw==='board'){boardView();return;}
  const r=_adminView.apply(this,arguments);
  try{addBoardBtn();}catch(e){console.error('addons',e);}
  return r;
};
})();
