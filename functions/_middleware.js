// Cloudflare Pages middleware: public homepage + password-protected modules and teacher area.
// COURSE_ACCESS_CODE is a module password independent of Idée's own GLM class code.
// Configure encrypted secrets COURSE_ACCESS_CODE, PROF_ACCESS_CODE,
// SESSION_SIGNING_KEY in the exo-fr Pages project before deployment.
const LOGIN="/_class-access", COOKIE="__Host-exo_access", MAX_AGE=28800;
const enc=new TextEncoder();
function staffRoute(path){
  let p=path;
  for(let i=0;i<3;i++){try{const d=decodeURIComponent(p);if(d===p)break;p=d;}catch(_){return true;}}
  p=p.replace(/\/+/g,"/").toLowerCase();
  return p==="/events"||p.startsWith("/events/")||p==="/pe/qualite/activites"||p.startsWith("/pe/qualite/activites/");
}
function safeNext(p,teacher){
  if(typeof p!=="string"||!p.startsWith("/")||p.startsWith("//")||p.length>600||
     p.includes("\\")||/[\r\n\x00-\x1f]/.test(p)||p.startsWith(LOGIN))return teacher?"/Events/":"/";
  return p;
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function page(mode,next,error){
  const t=mode==="prof",title=t?"Espace enseignant":"高级法语综合课";
  const label=t?"临时活动访问密码 · Accès enseignant":"板块统一访问密码 · Code d’accès";
  return ['<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>',
   esc(title),' | Exo</title><style>',
   '*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f7fb;color:#17233d;padding:20px;font:16px/1.5 Arial,system-ui,sans-serif}',
   '.panel{width:min(440px,100%);padding:36px 32px;border:1px solid #e5e7eb;background:white;border-radius:18px;box-shadow:0 15px 45px #15234014}',
   'h1{font-size:28px;margin:0 0 9px}p{color:#64748b;margin:0 0 24px}.overline{font-size:12px;font-weight:bold;letter-spacing:.1em;color:#64748b}',
   'label{display:block;font-size:14px;font-weight:bold;margin-bottom:8px}input{display:block;width:100%;border:1px solid #b9c7d9;border-radius:10px;padding:13px;margin-bottom:15px;font:inherit}',
   'button{width:100%;border:0;border-radius:10px;background:#27364f;color:#fff;padding:13px;font:inherit;font-weight:bold;cursor:pointer}',
   '.error{padding:10px 12px;border:1px solid #fecdd3;border-radius:8px;background:#fff1f2;color:#9f1239;margin-bottom:13px}.back{display:block;text-align:center;margin-top:19px;color:#64748b;text-decoration:none;font-size:13px}',
   '</style></head><body><main class="panel"><div class="overline">EXO · FRANÇAIS</div><h1>',esc(title),'</h1><p>',
   t?'教学研讨与临时活动 · 教师专用':'进入学习板块前请输入统一访问密码','</p>',
   error?'<div role="alert" class="error">'+esc(error)+'</div>':'',
   '<form method="post" action="',LOGIN,'"><input type="hidden" name="mode" value="',t?'prof':'student',
   '"><input type="hidden" name="next" value="',esc(next),'"><label for="code">',label,
   '</label><input id="code" name="code" type="password" autocomplete="off" maxlength="256" required autofocus>',
   '<button type="submit">',t?'进入教师区域':'进入学习平台','</button></form>',
   t?'<a class="back" href="/_class-access">← Retour au cours</a>':'','</main></body></html>'
  ].join("");
}
function hardened(r){
 const out=new Response(r.body,r);
 out.headers.set("Cache-Control","private, no-store");
 out.headers.set("Vary","Cookie");
 out.headers.set("X-Content-Type-Options","nosniff");
 return out;
}
function show(mode,next,error=""){
 return hardened(new Response(page(mode,next,error),{status:error?401:200,
  headers:{"Content-Type":"text/html; charset=utf-8","X-Frame-Options":"DENY"}}));
}
function redirect(path,cookie){
 const h=new Headers({"Location":path,"Cache-Control":"no-store"});
 if(cookie)h.append("Set-Cookie",cookie);
 return new Response(null,{status:303,headers:h});
}
function b64(b){return btoa(String.fromCharCode(...b)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
function un64(s){const b=s.replace(/-/g,"+").replace(/_/g,"/");return Uint8Array.from(atob(b+"=".repeat((4-b.length%4)%4)),c=>c.charCodeAt(0));}
async function signingKey(secret){return crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);}
async function token(role,secret){
 const data=b64(enc.encode(JSON.stringify({v:1,role,exp:Date.now()+MAX_AGE*1000})));
 const sig=await crypto.subtle.sign("HMAC",await signingKey(secret),enc.encode(data));
 return data+"."+b64(new Uint8Array(sig));
}
async function roleFrom(request,secret){
 const item=(request.headers.get("Cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE+"="));
 if(!item||item.length>2048)return null;
 try{
  const parts=item.slice(COOKIE.length+1).split(".");
  if(parts.length!==2)return null;
  const valid=await crypto.subtle.verify("HMAC",await signingKey(secret),un64(parts[1]),enc.encode(parts[0]));
  if(!valid)return null;
  const obj=JSON.parse(new TextDecoder().decode(un64(parts[0])));
  if(obj.v!==1||!["student","prof"].includes(obj.role)||!Number.isFinite(obj.exp)||obj.exp<=Date.now()||
    obj.exp>Date.now()+MAX_AGE*1000+60000)return null;
  return obj.role;
 }catch(_){return null;}
}
async function equals(a,b){
 if(typeof a!=="string"||typeof b!=="string")return false;
 const d=await Promise.all([crypto.subtle.digest("SHA-256",enc.encode(a)),crypto.subtle.digest("SHA-256",enc.encode(b))]);
 const x=new Uint8Array(d[0]),y=new Uint8Array(d[1]);let mismatch=0;
 for(let i=0;i<x.length;i++)mismatch|=x[i]^y[i];
 return mismatch===0;
}
export async function onRequest(ctx){
 const {request,env}=ctx,url=new URL(request.url),path=url.pathname;
 // The homepage remains public even without configured secrets. Every module
 // and teacher-only file is checked below, including direct asset URLs.
 if(request.method==="GET" && (path==="/" || path==="/index.html")) return ctx.next();
 // Never bypass protection for protected resources when the configuration is absent.
 if(!env||typeof env.COURSE_ACCESS_CODE!=="string"||env.COURSE_ACCESS_CODE.length<12||
    typeof env.PROF_ACCESS_CODE!=="string"||env.PROF_ACCESS_CODE.length<12||
    typeof env.SESSION_SIGNING_KEY!=="string"||env.SESSION_SIGNING_KEY.length<32||
    env.COURSE_ACCESS_CODE===env.PROF_ACCESS_CODE)
  return hardened(new Response("Access is not configured. Contact your teacher.",{status:503}));
 if(path===LOGIN&&request.method==="GET"){
  const mode=url.searchParams.get("mode")==="prof"?"prof":"student";
  return show(mode,safeNext(url.searchParams.get("next"),mode==="prof"));
 }
 if(path===LOGIN&&request.method==="POST"){
  const origin=request.headers.get("Origin"),site=request.headers.get("Sec-Fetch-Site");
  if((origin&&origin!==url.origin)||(site&&!["same-origin","none"].includes(site)))
   return new Response("Forbidden",{status:403});
  if(Number(request.headers.get("Content-Length")||"0")>4096)return new Response("Request too large",{status:413});
  let data;
  try{data=await request.formData();}catch(_){return new Response("Invalid form",{status:400});}
  const mode=data.get("mode")==="prof"?"prof":"student",next=safeNext(data.get("next"),mode==="prof");
  const value=data.get("code");
  if(typeof value!=="string"||value.length<1||value.length>256)return show(mode,next,"访问码不正确，请重试。");
  const isTeacher=await equals(value,env.PROF_ACCESS_CODE);
  const isStudent=mode==="prof"?false:await equals(value,env.COURSE_ACCESS_CODE);
  if(!isTeacher&&!isStudent)return show(mode,next,"访问码不正确，请重试。");
  const role=isTeacher?"prof":"student";
  if(role!=="prof"&&staffRoute(new URL(next,url.origin).pathname))return show("prof",next,"该区域需要教师访问码。");
  const valueCookie=COOKIE+"="+await token(role,env.SESSION_SIGNING_KEY)+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age="+MAX_AGE;
  return redirect(next,valueCookie);
 }
 if(path===LOGIN+"/logout"&&request.method==="POST"){
  const origin=request.headers.get("Origin");
  if(origin&&origin!==url.origin)return new Response("Forbidden",{status:403});
  return redirect(LOGIN,COOKIE+"=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
 }
 if(path===LOGIN||path.startsWith(LOGIN+"/"))return new Response("Method not allowed",{status:405});
 const role=await roleFrom(request,env.SESSION_SIGNING_KEY),teacher=staffRoute(path);
 if(!role||(teacher&&role!=="prof"))
  return redirect(LOGIN+"?mode="+(teacher?"prof":"student")+"&next="+encodeURIComponent(path+url.search));
 return hardened(await ctx.next());
}
