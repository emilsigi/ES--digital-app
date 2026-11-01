const $=s=>document.querySelector(s),escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let state=null,tab='overview';
async function api(route,body){const r=await fetch('/api/'+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok)throw Error(j.error||'Fejl');return j}
function message(s){$('#message').textContent=s;setTimeout(()=>{if($('#message').textContent===s)$('#message').textContent=''},7000)}
async function load(){try{state=await api('state');$('#login').hidden=true;$('#workspace').hidden=false;$('#logout').hidden=false;render()}catch{$('#login').hidden=false;$('#workspace').hidden=true;$('#logout').hidden=true}}
function money(n){return Number(n||0).toLocaleString('da-DK')+' kr.'}function clientName(id){return state.clients.find(c=>c.id===id)?.name||'Ukendt'}function opts(){return state.clients.map(c=>`<option value="${escapeHTML(c.id)}">${escapeHTML(c.name)}</option>`).join('')}
function render(){document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));document.querySelectorAll('.tab').forEach(e=>e.hidden=e.id!==tab);const mrr=state.clients.reduce((n,c)=>n+(c.status==='active'?Number(c.monthlyFee||0):0),0),paid=state.invoices.filter(i=>i.paid).reduce((n,i)=>n+i.amount,0),open=state.tasks.filter(t=>!t.done).length;
$('#overview').innerHTML=`<div class="grid"><div class="metric"><span class="num">${state.clients.length}</span><span class="label">Kunder</span></div><div class="metric"><span class="num">${state.clients.filter(c=>c.status==='active').length}</span><span class="label">Aktive aftaler</span></div><div class="metric"><span class="num">${open}</span><span class="label">Åbne opgaver</span></div><div class="metric"><span class="num">${money(mrr)}</span><span class="label">Månedlig aftalt omsætning</span></div></div><div class="split"><div class="card"><h2>Dine virksomheder</h2>${state.clients.map(c=>`<div class="client"><div><strong>${escapeHTML(c.name)}</strong><span class="muted">${escapeHTML(c.website)} · ${c.connection==='not_connected'?'Ikke tilsluttet':'Tilsluttet'}</span></div><span class="pill ${c.status==='active'?'active':''}">${c.status==='active'?'Aktiv':c.status==='paused'?'Pauset':'Opsætning'}</span></div>`).join('')}</div><div class="card"><h2>Næste skridt</h2>${state.tasks.filter(t=>!t.done).slice(0,5).map(t=>`<div class="line"><strong>${escapeHTML(t.title)}</strong><div class="muted">${escapeHTML(clientName(t.clientId))}</div></div>`).join('')||'<p>Ingen åbne opgaver</p>'}<p class="note">FE Leasing er oprettet som kundeprofil, men siden er endnu ikke teknisk forbundet.</p></div></div>`;
$('#clients').innerHTML=`<div class="stack">${state.clients.map(c=>`<div class="card"><div class="row"><div><h2>${escapeHTML(c.name)}</h2><p>${escapeHTML(c.website)}</p></div><span class="pill">${escapeHTML(c.connection)}</span></div><form data-form="client"><input type="hidden" name="id" value="${escapeHTML(c.id)}"><div class="formgrid"><label>Firmanavn<input name="name" value="${escapeHTML(c.name)}" required></label><label>Branche<input name="industry" value="${escapeHTML(c.industry)}"></label><label>Hjemmeside<input name="website" value="${escapeHTML(c.website)}"></label><label>Status<select name="status"><option value="onboarding" ${c.status==='onboarding'?'selected':''}>Under opsætning</option><option value="active" ${c.status==='active'?'selected':''}>Aktiv aftale</option><option value="paused" ${c.status==='paused'?'selected':''}>Pauset</option></select></label><label>Abonnement pr. måned (kr.)<input name="monthlyFee" type="number" min="0" placeholder="Ikke aftalt" value="${c.monthlyFee??''}"></label><label>Næste fornyelse<input name="renewal" type="date" value="${escapeHTML(c.renewal||'')}"></label><label class="full">Noter<textarea name="notes">${escapeHTML(c.notes)}</textarea></label></div><button>Gem kunde</button></form></div>`).join('')}<div class="card"><h2>Tilføj kunde</h2><form data-form="client"><label>Virksomhedens navn<input name="name" required></label><label>Hjemmeside<input name="website" type="url" placeholder="https://..."></label><label>Branche<input name="industry"></label><button>Opret kunde</button></form></div></div>`;
$('#tasks').innerHTML=`<div class="split"><div class="card"><h2>Opgaver</h2>${state.tasks.map(t=>`<div class="line check"><input type="checkbox" data-task="${escapeHTML(t.id)}" ${t.done?'checked':''}><div><strong style="${t.done?'text-decoration:line-through;opacity:.5':''}">${escapeHTML(t.title)}</strong><div class="muted">${escapeHTML(clientName(t.clientId))}</div></div></div>`).join('')}</div><div class="card"><h2>Ny opgave</h2><form data-form="task"><label>Kunde<select name="clientId">${opts()}</select></label><label>Beskrivelse<input name="title" required></label><button>Tilføj opgave</button></form></div></div>`;
$('#changes').innerHTML=`<div class="split"><div class="card"><h2>Ændringsforslag</h2>${state.changes.map(c=>`<div class="line"><div class="row"><strong>${escapeHTML(clientName(c.clientId))}</strong><span class="pill">${c.status==='draft'?'Afventer':c.status==='approved'?'Godkendt':'Annulleret'}</span></div><p>${escapeHTML(c.request)}</p>${c.status==='draft'?`<div class="buttons"><button data-change="${c.id}" data-status="approved">Godkend forslag</button><button class="secondary" data-change="${c.id}" data-status="cancelled">Annuller</button></div>`:''}</div>`).join('')||'<p>Ingen ændringsforslag endnu.</p>'}</div><div class="card"><h2>Beskriv en ændring</h2><p>Opret en opgave til hjemmesideændring, og godkend den efter gennemgang.</p><form data-form="change"><label>Kunde<select name="clientId">${opts()}</select></label><label>Hvad skal ændres?<textarea name="request" placeholder="Eksempel: Opret en BMW X5 med godkendte billeder og priser" required></textarea></label><button>Gem ændringsforslag</button></form><p class="note">AI er ikke tilsluttet endnu. Godkendelse registreres kun i appen; den udgiver ikke på hjemmesiden.</p></div></div>`;
$('#finance').innerHTML=`<div class="grid"><div class="metric"><span class="num">${money(mrr)}</span><span class="label">Aftalt månedlig omsætning (aktive kunder)</span></div><div class="metric"><span class="num">${money(mrr*12)}</span><span class="label">Årlig abonnementsværdi</span></div><div class="metric"><span class="num">${money(paid)}</span><span class="label">Registreret som betalt</span></div><div class="metric"><span class="num">${state.invoices.length}</span><span class="label">Manuelle indtægtsposter</span></div></div><div class="split"><div class="card"><h2>Registrer indtægt</h2><form data-form="invoice"><label>Kunde<select name="clientId">${opts()}</select></label><label>Beskrivelse<input name="description" required placeholder="Hjemmeside / abonnement"></label><label>Beløb i kr.<input name="amount" type="number" min="0" required></label><label class="check"><input type="checkbox" name="paid">Betalt</label><button>Gem indtægt</button></form><p class="hint">Dette er manuel registrering – ikke bogføring eller en faktura.</p></div><div class="card"><h2>Indtægtsposter</h2>${state.invoices.map(i=>`<div class="client"><div><strong>${escapeHTML(clientName(i.clientId))}</strong><span class="muted">${escapeHTML(i.description)} · ${i.date}</span></div><div class="right"><strong>${money(i.amount)}</strong><span class="muted">${i.paid?'Betalt':'Ubetalt'}</span></div></div>`).join('')||'<p>Ingen indtægter registreret.</p>'}</div></div>`;
}
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();try{await api('login',{password:new FormData(e.target).get('password')});await load()}catch(err){alert(err.message)}});$('#logout').onclick=async()=>{await api('logout',{});await load()};document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render()});document.addEventListener('submit',async e=>{const f=e.target.closest('[data-form]');if(!f)return;e.preventDefault();const data=Object.fromEntries(new FormData(f).entries());if(f.dataset.form==='invoice')data.paid=!!f.querySelector('[name=paid]').checked;try{await api(f.dataset.form,data);await load();message('Ændringer gemt.')}catch(err){message(err.message)}});document.addEventListener('change',async e=>{if(!e.target.dataset.task)return;try{await api('task/toggle',{id:e.target.dataset.task,done:e.target.checked});await load()}catch(err){message(err.message)}});document.addEventListener('click',async e=>{const b=e.target.closest('[data-change]');if(!b)return;try{await api('change/status',{id:b.dataset.change,status:b.dataset.status});await load();message('Status opdateret. Ingen live hjemmeside er ændret.')}catch(err){message(err.message)}});if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});load();

/* ES Digital AI-assistent */
(function(){
  const workspace=document.querySelector('#workspace');
  if(!workspace)return;

  const css=document.createElement('style');
  css.textContent=`
    #es-ai-open{
      position:fixed;right:18px;bottom:22px;
      z-index:9998;background:#193c66;color:white;
      border:0;border-radius:40px;padding:15px 22px;
      box-shadow:0 5px 24px #0003;font-weight:bold;
      cursor:pointer
    }
    #es-ai-panel{
      position:fixed;z-index:9999;right:12px;
      bottom:12px;width:calc(100% - 24px);
      max-width:430px;height:min(560px,85dvh);
      background:white;color:#17253a;
      border-radius:18px;box-shadow:0 8px 45px #0004;
      display:flex;flex-direction:column;overflow:hidden
    }
    #es-ai-panel[hidden]{display:none}
    .es-ai-header{
      background:#193c66;color:white;padding:17px;
      display:flex;justify-content:space-between;
      align-items:center;font-weight:bold
    }
    #es-ai-close{
      background:transparent;color:white;
      border:0;font-size:25px;cursor:pointer
    }
    #es-ai-messages{
      flex:1;overflow-y:auto;padding:15px;
      display:flex;flex-direction:column;gap:12px
    }
    .es-ai-msg{
      padding:12px;border-radius:13px;
      white-space:pre-wrap;overflow-wrap:anywhere;
      max-width:90%;background:#edf2f8
    }
    .es-ai-msg.mine{
      align-self:flex-end;background:#193c66;color:white
    }
    #es-ai-form{
      display:flex;gap:8px;padding:12px;
      border-top:1px solid #ddd
    }
    #es-ai-input{
      flex:1;min-width:0;padding:12px;
      border:1px solid #ccc;border-radius:9px;
      font-size:16px
    }
    #es-ai-send{
      background:#193c66;color:white;
      border:0;border-radius:9px;padding:10px 14px
    }
  `;
  document.head.appendChild(css);

  const open=document.createElement('button');
  open.id='es-ai-open';
  open.textContent='✦ AI-assistent';

  const panel=document.createElement('section');
  panel.id='es-ai-panel';
  panel.hidden=true;
  panel.innerHTML=`
    <div class="es-ai-header">
      <span>✦ ES Digital AI</span>
      <button id="es-ai-close" type="button"
        aria-label="Luk chat">×</button>
    </div>
    <div id="es-ai-messages"
      role="log" aria-live="polite"></div>
    <form id="es-ai-form">
      <input id="es-ai-input" maxlength="2000"
        placeholder="Skriv til din AI..." required>
      <button id="es-ai-send" type="submit">Send</button>
    </form>
  `;

  workspace.append(open,panel);

  const messages=panel.querySelector('#es-ai-messages');
  const input=panel.querySelector('#es-ai-input');
  const sendButton=panel.querySelector('#es-ai-send');

  function addMessage(text,mine=false){
    const el=document.createElement('div');
    el.className='es-ai-msg'+(mine?' mine':'');
    el.textContent=text;
    messages.appendChild(el);
    messages.scrollTop=messages.scrollHeight;
    return el;
  }

  addMessage('Hej! Jeg er din ES Digital AI. Hvad skal vi arbejde på i dag?');

  open.onclick=()=>{
    panel.hidden=false;
    open.hidden=true;
    open.style.display='none';
    input.focus();
  };

  panel.querySelector('#es-ai-close').onclick=()=>{
    panel.hidden=true;
    open.hidden=false;
    open.style.display='';
  };

  panel.querySelector('#es-ai-form').onsubmit=async e=>{
    e.preventDefault();
    const question=input.value.trim();
    if(!question)return;

    addMessage(question,true);
    input.value='';
    input.disabled=true;
    sendButton.disabled=true;

    const pending=addMessage('AI skriver...');
    try{
      const result=await api('ai',{message:question});
      pending.textContent=result.answer||'Intet svar modtaget.';
    }catch(err){
      pending.textContent='Fejl: '+err.message;
    }finally{
      input.disabled=false;
      sendButton.disabled=false;
      input.focus();
      messages.scrollTop=messages.scrollHeight;
    }
  };
})();

/* ES Digital - Tilbud v2 */
(function(){
  const chat=document.querySelector('#es-ai-messages');
  if(!chat)return;

  const css=document.createElement('style');
  css.textContent=`
  #es-offer-preview[hidden]{display:none!important}
  #es-offer-preview{
    position:fixed;inset:0;z-index:100000;
    background:#f3f6fa;overflow-y:auto;
    overscroll-behavior:contain;
    -webkit-overflow-scrolling:touch
  }
  .es-offer-toolbar{
    position:sticky;top:0;z-index:2;
    background:#193c66;color:white;
    padding:14px;display:flex;flex-wrap:wrap;
    gap:9px;align-items:center
  }
  .es-offer-toolbar button{
    border:1px solid #fff;background:white;
    color:#193c66;padding:12px;border-radius:9px;
    font-weight:700;font-size:14px;cursor:pointer
  }
  .es-offer-paper{
    background:white;color:#182b42;
    max-width:800px;margin:20px auto;
    padding:28px;border-radius:12px;
    box-shadow:0 3px 15px #0001;
    line-height:1.6;overflow-wrap:anywhere
  }
  .es-offer-paper h1{font-size:30px;color:#193c66}
  .es-offer-paper h2{font-size:21px;color:#193c66}
  .es-offer-paper h3{font-size:17px;color:#193c66}
  .es-offer-paper table{
    border-collapse:collapse;width:100%;
    font-size:13px;margin:15px 0
  }
  .es-offer-paper td,.es-offer-paper th{
    border:1px solid #ccd5df;padding:8px;
    text-align:left;overflow-wrap:anywhere
  }
  .es-offer-paper th{background:#edf2f8}
  .es-offer-paper ul{padding-left:22px}
  .es-offer-actions{
    display:flex;flex-wrap:wrap;gap:8px;margin-top:12px
  }
  .es-offer-actions button{
    background:#193c66;color:white;
    border:0;border-radius:8px;
    padding:10px 12px;cursor:pointer
  }
  @media(max-width:600px){
    .es-offer-paper{margin:8px;padding:18px}
    .es-offer-paper table{font-size:11px}
  }
  @media print{
    @page{size:A4;margin:15mm}
    body > *:not(#es-offer-preview){
      display:none!important
    }
    #es-offer-preview{
      position:static!important;
      display:block!important;
      background:white!important;
      overflow:visible!important
    }
    .es-offer-toolbar{display:none!important}
    .es-offer-paper{
      max-width:none;margin:0;padding:0;
      box-shadow:none;border-radius:0
    }
    .es-offer-paper tr{break-inside:avoid}
  }`;
  document.head.appendChild(css);

  const preview=document.createElement('section');
  preview.id='es-offer-preview';
  preview.hidden=true;
  preview.setAttribute('role','dialog');
  preview.setAttribute('aria-modal','true');
  preview.setAttribute('aria-label','Vis tilbud');

  preview.innerHTML=`
    <div class="es-offer-toolbar">
      <button type="button" id="es-offer-close">
        ← Luk tilbud
      </button>
      <button type="button" id="es-offer-print">
        Udskriv / Gem PDF
      </button>
      <button type="button" id="es-offer-copy">
        Kopiér
      </button>
    </div>
    <article class="es-offer-paper">
      <h1>ES Digital</h1>
      <div id="es-offer-document"></div>
    </article>
  `;
  document.body.appendChild(preview);

  const documentBox=preview.querySelector(
    '#es-offer-document'
  );
  let currentText='';
  let lastFocus=null;

  function formatText(raw){
    const root=document.createElement('div');
    let list=null,table=null;

    function add(tag,text,parent=root){
      const el=document.createElement(tag);
      el.textContent=text;
      parent.appendChild(el);
      return el;
    }

    for(const original of raw.split('\n')){
      const line=original.trim();
      if(!line){
        list=null;table=null;continue;
      }

      if(/^[-|:\s]+$/.test(line))continue;

      const h=line.match(/^(#{1,3})\s+(.+)/);
      if(h){
        list=null;table=null;
        add(h[1].length===1?'h1':
            h[1].length===2?'h2':'h3',h[2]);
        continue;
      }

      if(line.startsWith('|')&&line.endsWith('|')){
        const cells=line.slice(1,-1)
          .split('|').map(s=>s.trim());
        if(cells.every(s=>/^:?-{3,}:?$/.test(s)))
          continue;

        list=null;
        if(!table)table=add('table','');
        const row=document.createElement('tr');
        const tag=table.rows.length===0?'th':'td';
        for(const cell of cells)
          add(tag,cell.replace(/\*\*/g,''),row);
        table.appendChild(row);
        continue;
      }

      table=null;
      if(/^[-*]\s+/.test(line)){
        if(!list)list=add('ul','');
        add('li',line.replace(/^[-*]\s+/,'')
          .replace(/\*\*/g,''),list);
        continue;
      }

      list=null;
      add('p',line.replace(/\*\*/g,''));
    }
    return root;
  }

  function openOffer(raw){
    currentText=raw;
    lastFocus=document.activeElement;
    documentBox.replaceChildren(formatText(raw));
    preview.hidden=false;
    preview.scrollTop=0;
    preview.querySelector('#es-offer-close').focus();
  }

  function closeOffer(){
    preview.hidden=true;
    if(lastFocus&&lastFocus.isConnected)
      lastFocus.focus();
  }

  preview.querySelector('#es-offer-close')
    .addEventListener('click',closeOffer);

  preview.querySelector('#es-offer-print')
    .addEventListener('click',()=>{
      if(typeof window.print==='function'){
        window.print();
      }else{
        alert('Brug Safari Del > Udskriv for at gemme PDF.');
      }
    });

  preview.querySelector('#es-offer-copy')
    .addEventListener('click',async()=>{
      try{
        await navigator.clipboard.writeText(currentText);
        alert('Tilbuddet er kopieret.');
      }catch{
        alert('Kunne ikke kopiere automatisk.');
      }
    });

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!preview.hidden)closeOffer();
  });

  function upgrade(){
    chat.querySelectorAll('.es-ai-msg').forEach(node=>{
      if(node.classList.contains('mine'))return;
      if(node.dataset.offerV2)return;
      const raw=node.textContent.trim();
      if(raw.length<80||raw==='AI skriver...'||
         raw.startsWith('Fejl:'))return;

      node.dataset.offerV2='true';
      const actions=document.createElement('div');
      actions.className='es-offer-actions';

      const view=document.createElement('button');
      view.type='button';
      view.textContent='Vis tilbud';
      view.addEventListener('click',()=>openOffer(raw));

      actions.appendChild(view);
      node.appendChild(actions);
    });
  }

  const observer=new MutationObserver(upgrade);
  observer.observe(chat,{
    childList:true,subtree:true,characterData:true
  });
  upgrade();
})();
