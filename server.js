const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=__dirname;
const {Pool}=require('pg');
const initial={clients:[{id:'fe-leasing',name:'FE Leasing',website:'https://feleasing.dk',industry:'Billeasing',status:'onboarding',connection:'not_connected',monthlyFee:null,renewal:null,notes:'Kundeprofil klargjort. Hjemmesiden er ikke tilsluttet.'}],tasks:[{id:'t1',clientId:'fe-leasing',title:'Bekræft tilladelse og adgang til domæne',done:false},{id:'t2',clientId:'fe-leasing',title:'Afklar hosting og hjemmesideplatform',done:false},{id:'t3',clientId:'fe-leasing',title:'Godkend kontaktoplysninger og juridiske tekster',done:false},{id:'t4',clientId:'fe-leasing',title:'Opsæt testadresse og integration',done:false}],changes:[],invoices:[]};
const PORT=Number(process.env.PORT||3000),PASSWORD=process.env.ADMIN_PASSWORD,SECRET=process.env.SESSION_SECRET;
if(!PASSWORD||PASSWORD.length<20||!SECRET||SECRET.length<32||!process.env.DATABASE_URL)throw Error('ADMIN_PASSWORD (min 20 tegn), SESSION_SECRET (min 32 tegn) og DATABASE_URL skal angives i Render');
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.PGSSL==='require'?{rejectUnauthorized:false}:undefined});
async function init(){await pool.query('CREATE TABLE IF NOT EXISTS app_state (id integer PRIMARY KEY, payload jsonb NOT NULL)');await pool.query('INSERT INTO app_state(id,payload) VALUES (1,$1::jsonb) ON CONFLICT (id) DO NOTHING',[JSON.stringify(initial)])}
async function read(){const r=await pool.query('SELECT payload FROM app_state WHERE id=1');return r.rows[0].payload}
async function mutate(fn){const c=await pool.connect();try{await c.query('BEGIN');const r=await c.query('SELECT payload FROM app_state WHERE id=1 FOR UPDATE');const d=r.rows[0].payload;const result=fn(d);if(result&&result.error){await c.query('ROLLBACK');return result}await c.query('UPDATE app_state SET payload=$1::jsonb WHERE id=1',[JSON.stringify(d)]);await c.query('COMMIT');return result||{ok:true}}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}}
const sessions=new Map(),attempts=new Map();
function send(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj))}
function auth(req){const c=(req.headers.cookie||'').match(/(?:^|; )fe_session=([^;]+)/);return !!(c&&sessions.has(c[1])&&sessions.get(c[1])>Date.now())}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>100000)reject(Error('For stor anmodning'))});req.on('end',()=>{try{resolve(JSON.parse(s||'{}'))}catch{reject(Error('Ugyldig JSON'))}})})}
function clean(v,n=200){return String(v??'').trim().slice(0,n)}function uid(){return crypto.randomUUID()}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer(async(req,res)=>{const u=new URL(req.url,'http://localhost');try{
if(u.pathname==='/api/login'&&req.method==='POST'){const ip=req.socket.remoteAddress||'unknown';const a=attempts.get(ip)||{count:0,until:0};if(a.until>Date.now())return send(res,429,{error:'Prøv igen senere'});const b=await body(req);const x=Buffer.from(clean(b.password,500)),y=Buffer.from(PASSWORD);if(x.length!==y.length||!crypto.timingSafeEqual(x,y)){a.count++;if(a.count>=8){a.until=Date.now()+15*60000;a.count=0}attempts.set(ip,a);return send(res,401,{error:'Forkert adgangskode'})}attempts.delete(ip);const token=crypto.randomBytes(32).toString('hex');sessions.set(token,Date.now()+86400000);res.setHeader('Set-Cookie',`fe_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${process.env.NODE_ENV==='production'?'; Secure':''}`);return send(res,200,{ok:true})}
if(u.pathname==='/api/logout'&&req.method==='POST'){const m=(req.headers.cookie||'').match(/fe_session=([^;]+)/);if(m)sessions.delete(m[1]);res.setHeader('Set-Cookie','fe_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict');return send(res,200,{ok:true})}
if(u.pathname.startsWith('/api/')){
if(!auth(req))return send(res,401,{error:'Log ind først'});

if(u.pathname==='/api/ai'&&req.method==='POST'){
  if(!process.env.OPENAI_API_KEY)
    return send(res,503,{error:'AI-nøgle mangler på serveren'});

  const now=Date.now();
  const token=(req.headers.cookie||'')
    .match(/(?:^|; )fe_session=([^;]+)/)?.[1];
  const key='ai:'+token;
  const limit=attempts.get(key)||{count:0,until:now+60000};

  if(limit.until<=now){
    limit.count=0;
    limit.until=now+60000;
  }
  if(limit.count>=5)
    return send(res,429,{error:'Vent et minut før næste AI-spørgsmål'});

  limit.count++;
  attempts.set(key,limit);

  const b=await body(req);
  if(typeof b.message!=='string'||!b.message.trim()||
     b.message.length>2000)
    return send(res,400,{error:'Beskeden skal være på 1-2000 tegn'});

  try{
    const response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{
        'Authorization':'Bearer '+process.env.OPENAI_API_KEY,
        'Content-Type':'application/json'
      },
      signal:AbortSignal.timeout(30000),
      body:JSON.stringify({
        model:'gpt-4.1-mini',
        instructions:`Du er ES Digital AI, en professionel
          dansk assistent for et webbureau.
          Hjælp med hjemmesider, kundeservice,
          tilbud, markedsføring og forretningsidéer.
          Svar på dansk, klart og praktisk.
          Opfind ikke kundeoplysninger eller priser.
          Du kan ikke ændre hjemmesider, sende
          fakturaer eller udføre handlinger.`,
        input:b.message.trim(),
        max_output_tokens:600,
        store:false
      })
    });

    if(!response.ok){
      console.error('OpenAI API-status:',response.status);
      return send(res,502,{
        error:response.status===429
          ?'AI-kvoten er nået. Kontrollér API-betaling.'
          :'AI-tjenesten kunne ikke svare'
      });
    }

    const data=await response.json();
    const answer=(data.output||[])
      .flatMap(item=>item.content||[])
      .filter(item=>item.type==='output_text')
      .map(item=>item.text)
      .join('\n');

    return send(res,200,{
      answer:answer||'AI gav ikke et tekstsvar. Prøv igen.'
    });
  }catch(e){
    console.error('AI-forbindelsesfejl:',e.name);
    return send(res,502,{
      error:'Kunne ikke kontakte AI-tjenesten'
    });
  }
}
if(u.pathname==='/api/state'&&req.method==='GET')return send(res,200,await read());
if(req.method!=='POST')return send(res,405,{error:'Metode ikke tilladt'});
const b=await body(req);
const result=await mutate(d=>{
if(u.pathname==='/api/client'){const c=d.clients.find(x=>x.id===b.id);if(c){c.name=clean(b.name,100)||c.name;c.website=clean(b.website,300);c.industry=clean(b.industry,100);c.status=['onboarding','active','paused'].includes(b.status)?b.status:c.status;c.monthlyFee=b.monthlyFee===''||b.monthlyFee==null?null:Math.max(0,Number(b.monthlyFee)||0);c.renewal=clean(b.renewal,10)||null;c.notes=clean(b.notes,2000)}else{if(!clean(b.name))return {error:'Navn mangler',code:400};d.clients.push({id:uid(),name:clean(b.name,100),website:clean(b.website,300),industry:clean(b.industry,100),status:'onboarding',connection:'not_connected',monthlyFee:null,renewal:null,notes:''})}return {ok:true}}
if(u.pathname==='/api/task'){if(!d.clients.some(c=>c.id===b.clientId))return {error:'Ukendt kunde',code:400};d.tasks.push({id:uid(),clientId:b.clientId,title:clean(b.title,300),done:false});return {ok:true}}
if(u.pathname==='/api/task/toggle'){const t=d.tasks.find(x=>x.id===b.id);if(!t)return {error:'Ikke fundet',code:404};t.done=!!b.done;return {ok:true}}
if(u.pathname==='/api/change'){if(!d.clients.some(c=>c.id===b.clientId))return {error:'Ukendt kunde',code:400};if(!clean(b.request))return {error:'Beskriv ændringen',code:400};d.changes.unshift({id:uid(),clientId:b.clientId,request:clean(b.request,4000),status:'draft',createdAt:new Date().toISOString()});return {ok:true}}
if(u.pathname==='/api/change/status'){const c=d.changes.find(x=>x.id===b.id);if(!c)return {error:'Ikke fundet',code:404};if(!['draft','approved','cancelled'].includes(b.status))return {error:'Ugyldig status',code:400};c.status=b.status;return {ok:true,notice:'Godkendt i ES-Digital. Ingen hjemmeside er ændret.'}}
if(u.pathname==='/api/invoice'){if(!d.clients.some(c=>c.id===b.clientId))return {error:'Ukendt kunde',code:400};d.invoices.push({id:uid(),clientId:b.clientId,description:clean(b.description,200),amount:Math.max(0,Number(b.amount)||0),paid:!!b.paid,date:new Date().toISOString().slice(0,10)});return {ok:true}}
return {error:'Ukendt API',code:404};
});return send(res,result.code||(result.error?400:200),result)
}
let f=u.pathname==='/'?'/index.html':u.pathname;if(f.includes('..')||f.startsWith('/data/')||f.startsWith('/.')||f==='/server.js'||f==='/package.json'||f==='/README.md')return send(res,403,{error:'Ingen adgang'});const file=path.join(ROOT,f);if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return send(res,404,{error:'Ikke fundet'});res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'"});fs.createReadStream(file).pipe(res)
}catch(e){send(res,500,{error:'Serverfejl: '+e.message})}});init().then(()=>server.listen(PORT,()=>console.log(`ES-Digital: http://localhost:${PORT}`))).catch(e=>{console.error('Databasefejl:',e.message);process.exit(1)});
