// Exo individual accounts for Cloudflare Pages + D1.
// The router runs only when EXO_AUTH_MODE is pilot or individual.
// No secrets, passwords, or student identifiers are embedded in the front end.
const PREFIX="/_account", SESSION_COOKIE="__Host-exo_user", TTL=8*60*60;
const ITER=260000, ENC=new TextEncoder(), DEC=new TextDecoder();
const STYLE='*{box-sizing:border-box}html{font-family:Arial,system-ui,sans-serif;background:#f5f8fc;color:#1d3351}body{margin:0;min-height:100vh;padding:26px 16px;display:grid;place-items:center}.panel{width:min(570px,100%);padding:30px;background:white;border:1px solid #dbe6f2;box-shadow:0 18px 45px #23446a14;border-radius:22px}h1{font:700 30px/1.2 Georgia,serif;margin:4px 0 10px}h2{font-size:17px;color:#32506d}p{color:#60758d;line-height:1.6}label{display:block;margin:15px 0 5px;font-size:13px;font-weight:700}input,textarea,select{display:block;width:100%;padding:12px;border:1px solid #c1d0df;border-radius:11px;font:inherit}textarea{min-height:120px}button,.btn{display:inline-block;text-decoration:none;border:0;border-radius:11px;padding:12px 18px;background:#315f8b;color:white;font:700 14px Arial,sans-serif;cursor:pointer}.outline{background:#eff5fb;color:#285582}.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:17px}.hint{font-size:12px;color:#75889a;margin-top:13px}.error{background:#fff0ee;color:#a43730;padding:12px;border-radius:11px}.success{background:#edf7ef;color:#306a41;padding:12px;border-radius:11px}.over{color:#5483b6;font-size:11px;letter-spacing:.24em;font-weight:bold}.avatar{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0}.avatar label{border:1px solid #c6d9e6;border-radius:15px;padding:15px;cursor:pointer;margin:0;display:flex;align-items:center;gap:8px}.avatar input{width:auto}.stat{padding:12px;border-radius:12px;background:#f1f7fc}.small{font-size:12px}.adminlist{max-height:240px;overflow:auto}.adminlist li{padding:6px 0;border-bottom:1px solid #ebf0f5}.muted{color:#6e8195}.passwords{white-space:pre-wrap;word-break:break-word;padding:14px;background:#eff6fc;border:1px solid #c5d7e6;border-radius:11px;font:13px/1.6 ui-monospace,monospace}a{color:#28588a}';
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function doc(title,body){return ['<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="referrer" content="no-referrer"><title>',esc(title),' · Exo</title><style>',STYLE,'</style></head><body><main class="panel"><div class="over">EXO · PARCOURS PERSONNEL</div>',body,'</main></body></html>'].join("");}
function send(html,status=200){return new Response(html,{status,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"private, no-store","X-Frame-Options":"DENY","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'","Referrer-Policy":"no-referrer"}});}
function error(message,status=400){return send(doc("提示",'<h1>无法继续</h1><p class="error">'+esc(message)+'</p><div class="row"><a class="btn outline" href="/_account">返回登录</a></div>'),status);}
function redirect(to,cookie){const h=new Headers({"Location":to,"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"});if(cookie)h.append("Set-Cookie",cookie);return new Response(null,{status:303,headers:h});}
function cleanNext(raw){if(typeof raw!=="string"||!raw.startsWith("/")||raw.startsWith("//")||raw.length>700||raw.includes("\\")||/[\x00-\x1f]/.test(raw)||raw.startsWith(PREFIX)||raw.startsWith("/_class-access"))return "/";return raw;}
function safeUser(s){const v=String(s??"").trim().normalize("NFKC").toLowerCase();return /^[a-z][a-z0-9._-]{3,31}$/.test(v)?v:null;}
function formField(form,key,max){const v=form.get(key);return typeof v==="string"&&v.length<=max?v:null;}
function now(){return Math.floor(Date.now()/1000);}
function rbytes(n){const x=new Uint8Array(n);crypto.getRandomValues(x);return x;}
function b64(a){let s="";for(const c of a)s+=String.fromCharCode(c);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
function un64(s){const b=s.replace(/-/g,"+").replace(/_/g,"/");return Uint8Array.from(atob(b+"=".repeat((4-b.length%4)%4)),c=>c.charCodeAt(0));}
async function sha(v){return b64(new Uint8Array(await crypto.subtle.digest("SHA-256",ENC.encode(v))));}
async function pbkdf2(password,salt,iter=ITER){const k=await crypto.subtle.importKey("raw",ENC.encode(password),{name:"PBKDF2"},false,["deriveBits"]);const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:un64(salt),iterations:iter,hash:"SHA-256"},k,256);return b64(new Uint8Array(bits));}
function secureEquals(a,b){if(typeof a!=="string"||typeof b!=="string")return false;const aa=ENC.encode(a),bb=ENC.encode(b);let diff=aa.length^bb.length;for(let i=0;i<Math.max(aa.length,bb.length);i++)diff|=(aa[i]||0)^(bb[i]||0);return diff===0;}
async function passRecord(password){const salt=b64(rbytes(16));return {salt,hash:await pbkdf2(password,salt),iterations:ITER};}
function passwordOK(p){return typeof p==="string"&&p.length>=12&&p.length<=128;}
function sessionCookie(token){return SESSION_COOKIE+"="+token+"; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age="+TTL;}
function expiredCookie(){return SESSION_COOKIE+"=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0";}
function cookieOf(req){const c=(req.headers.get("Cookie")||"").split(";").map(s=>s.trim()).find(s=>s.startsWith(SESSION_COOKIE+"="));const t=c?c.slice(SESSION_COOKIE.length+1):null;return t&&/^[A-Za-z0-9_-]{40,60}$/.test(t)?t:null;}
function sameOrigin(req){const u=new URL(req.url),o=req.headers.get("Origin"),site=req.headers.get("Sec-Fetch-Site");return (!o||o===u.origin)&&(!site||["same-origin","none"].includes(site));}
async function posted(req){if(!sameOrigin(req))throw Error("Origin rejected");if(Number(req.headers.get("Content-Length")||0)>14000)throw Error("Form too large");return await req.formData();}
async function findSession(req,db){const token=cookieOf(req);if(!token)return null;const hash=await sha(token);const row=await db.prepare("SELECT u.id,u.username,u.role,u.avatar,u.must_change,u.disabled,s.token_hash,s.expires_at FROM exo_sessions s JOIN exo_users u ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>? LIMIT 1").bind(hash,now()).first();return row&&!row.disabled?row:null;}
async function makeSession(userId,db){const token=b64(rbytes(32));await db.prepare("INSERT INTO exo_sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)").bind(await sha(token),userId,now(),now()+TTL).run();return sessionCookie(token);}
async function revokeSession(req,db){const token=cookieOf(req);if(token)await db.prepare("DELETE FROM exo_sessions WHERE token_hash=?").bind(await sha(token)).run();}
function loginPage(next="/",message=""){return doc("Connexion",'<h1>Mon espace Exo</h1><p>每位学习者使用自己的账号登录。账号由教师创建，首次登录后设置个人密码。</p>'+(message?'<p class="error">'+esc(message)+'</p>':"")+'<form method="post" action="/_account/login"><input name="next" type="hidden" value="'+esc(cleanNext(next))+'"><label for="username">账号 · Identifiant</label><input id="username" name="username" autocomplete="username" minlength="4" maxlength="32" required><label for="password">密码 · Mot de passe</label><input id="password" name="password" type="password" autocomplete="current-password" required><div class="row"><button type="submit">登录并继续 →</button><a href="/" class="btn outline">返回首页</a></div></form><p class="hint">请勿分享密码。忘记密码请联系任课教师重置。</p>');}
function passwordPage(next="/",message=""){return doc("设置新密码",'<h1>设置个人密码</h1><p>为了保护你的学习记录，首次登录必须修改教师发放的临时密码。</p>'+(message?'<p class="error">'+esc(message)+'</p>':"")+'<form method="post" action="/_account/password"><input type="hidden" name="next" value="'+esc(cleanNext(next))+'"><label>当前密码</label><input type="password" autocomplete="current-password" name="old" required><label>新密码（至少 12 个字符）</label><input type="password" autocomplete="new-password" name="fresh" minlength="12" maxlength="128" required><label>再次输入新密码</label><input type="password" autocomplete="new-password" name="again" minlength="12" maxlength="128" required><div class="row"><button>保存新密码并继续</button></div></form>');}
function setupPage(message=""){return doc("教师初始化",'<h1>教师账号初始化</h1><p>仅用于首次设置教师管理账号。需要 Cloudflare 中设置的随机初始化密钥，完成后应删除该密钥。</p>'+(message?'<p class="error">'+esc(message)+'</p>':"")+'<form method="post" action="/_account/setup"><label>初始化密钥</label><input name="secret" type="password" autocomplete="off" required><label>教师用户名（拉丁字母开头，4–32 位）</label><input name="username" value="exo.prof" required><label>教师个人密码（至少 12 位）</label><input name="password" type="password" minlength="12" maxlength="128" required><div class="row"><button>创建教师账号</button></div></form>');}
async function dashboard(user,db){
  const teacher=user.role==="teacher";
  const main='<h1>Bonjour, '+esc(user.username)+' !</h1><p>这是你的独立 Exo 账号。个人学习进度以后会与你的账号关联。</p><div class="stat">身份：'+(teacher?'教师 · Enseignant':'学习者 · Apprenant')+'<br>当前形象：'+(user.avatar==="boy"?"抱蓝色笔记本的男生":"抱蓝色笔记本的女生")+'</div><h2>选择学习形象</h2><form method="post" action="/_account/avatar"><div class="avatar"><label><input type="radio" name="avatar" value="girl" '+(user.avatar!=="boy"?"checked":"")+'> 女生 · Carnet bleu</label><label><input type="radio" name="avatar" value="boy" '+(user.avatar==="boy"?"checked":"")+'> 男生 · Carnet bleu</label></div><button type="submit">保存形象</button></form><div class="row"><a class="btn" href="/Events/au-cafe-de-flore/">进入 Café de Flore ↗</a><a href="/_account/password" class="btn outline">修改密码</a>'+(teacher?'<a class="btn outline" href="/_account/admin">管理学生账号</a>':"")+'</div><form action="/_account/logout" method="post"><div class="row"><button class="outline">退出登录</button></div></form>';
  return send(doc("个人空间",main));
}
async function adminPage(db,message="",credentials=""){
  const {results=[]}=await db.prepare("SELECT username,avatar,disabled,must_change FROM exo_users WHERE role='student' ORDER BY created_at DESC LIMIT 100").all();
  const list=results.map(u=>'<li><strong>'+esc(u.username)+'</strong> · '+(u.disabled?'已停用':u.must_change?'等待首次改密':'已激活')+'</li>').join("");
  const body='<h1>学生账号管理</h1><p>由教师创建每位学生的独立账号。初始密码只显示一次，学生登录后必须修改。</p>'+(message?'<p class="success">'+esc(message)+'</p>':"")+(credentials?'<h2>请现在安全保存并单独发送给学生</h2><div class="passwords">'+esc(credentials)+'</div><p class="hint">此页关闭后不再显示初始密码。请不要将账号与密码清单公开在课程网页或微信群。</p>':"")+'<form action="/_account/admin/create" method="post"><label>学生用户名（每行一个，最多 15 个）</label><textarea name="usernames" placeholder="stu001&#10;stu002&#10;stu003" required></textarea><div class="row"><button>创建独立账号及临时密码</button></div></form><h2>重置学生密码</h2><form action="/_account/admin/reset" method="post"><label>需要重置的用户名</label><input name="username" autocomplete="off" required><div class="row"><button class="outline">生成新的临时密码</button></div></form><h2>账号列表（最近 100 个）</h2><ul class="adminlist">'+list+'</ul><div class="row"><a class="btn outline" href="/_account">返回我的空间</a></div>';
  return send(doc("教师账号管理",body));
}
export async function exoAccountRouter(ctx){
  const {request:req,env}=ctx,u=new URL(req.url),path=u.pathname,db=env&&env.EXO_DB;
  const mode=env&&env.EXO_AUTH_MODE;
  if(!["pilot","individual"].includes(mode))return null;
  // The public homepage remains unchanged during the pilot and after activation.
  if(path==="/"||path==="/index.html")return ctx.next();
  if(path.startsWith("/_account")){
    if(!db)return error("个人账号数据库尚未配置。请由教师先完成 Cloudflare D1 连接。",503);
    if(path==="/_account/setup"){
      const teacher=await db.prepare("SELECT id FROM exo_users WHERE role='teacher' LIMIT 1").first();
      if(teacher)return error("教师账号已初始化。请使用登录入口。",403);
      if(req.method==="GET")return send(setupPage());
      if(req.method!=="POST")return error("Method not allowed",405);
      let f;try{f=await posted(req)}catch(_){return error("请求未通过安全校验",403)}
      const secret=formField(f,"secret",256),username=safeUser(f.get("username")),password=formField(f,"password",128);
      if(!env.EXO_BOOTSTRAP_SECRET||env.EXO_BOOTSTRAP_SECRET.length<32||!secret||!secureEquals(secret,env.EXO_BOOTSTRAP_SECRET))return error("初始化密钥无效",403);
      if(!username||!passwordOK(password))return send(setupPage("用户名或密码不符合要求"),400);
      const p=await passRecord(password);
      try{await db.prepare("INSERT INTO exo_users(id,username,role,avatar,password_salt,password_hash,iterations,must_change,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),username,"teacher","girl",p.salt,p.hash,p.iterations,0,now(),now()).run();}
      catch(_){return error("初始化失败，请检查数据库或账号是否已存在。",409)}
      return send(doc("初始化成功",'<h1>教师账号已创建 ✓</h1><p>现在可以用个人账号登录并创建学生账号。</p><p class="error">请立即在 Cloudflare 删除 EXO_BOOTSTRAP_SECRET。</p><a class="btn" href="/_account">开始登录</a>'));
    }
    if(path==="/_account/login"){
      if(req.method!=="POST")return error("Method not allowed",405);
      let f;try{f=await posted(req)}catch(_){return error("请求未通过安全校验",403)}
      const next=cleanNext(formField(f,"next",700)),username=safeUser(f.get("username")),password=formField(f,"password",128);
      if(!username||!password)return send(loginPage(next,"用户名或密码错误"),401);
      const user=await db.prepare("SELECT id,username,role,password_salt,password_hash,iterations,must_change,failed_attempts,locked_until,disabled FROM exo_users WHERE username=? LIMIT 1").bind(username).first();
      const hash=user?await pbkdf2(password,user.password_salt,user.iterations):await pbkdf2(password,b64(new Uint8Array(16)));
      if(!user||user.disabled||user.locked_until>now()||!secureEquals(hash,user.password_hash)){
        if(user&&!user.disabled&&user.locked_until<=now()){const failures=(user.failed_attempts||0)+1;await db.prepare("UPDATE exo_users SET failed_attempts=?,locked_until=? WHERE id=?").bind(failures>=5?0:failures,failures>=5?now()+15*60:0,user.id).run();}
        return send(loginPage(next,"用户名或密码错误，连续失败会短暂锁定账号"),401);
      }
      await db.prepare("UPDATE exo_users SET failed_attempts=0,locked_until=0 WHERE id=?").bind(user.id).run();
      const cookie=await makeSession(user.id,db);
      return redirect(user.must_change?"/_account/password?next="+encodeURIComponent(next):next,cookie);
    }
    let user=await findSession(req,db);
    if(path==="/_account"||path==="/_account/"){
      if(req.method!=="GET")return error("Method not allowed",405);
      return user?dashboard(user,db):send(loginPage(cleanNext(u.searchParams.get("next"))));
    }
    if(path==="/_account/logout"){
      if(req.method!=="POST")return error("Method not allowed",405);
      if(!sameOrigin(req))return error("Forbidden",403);
      await revokeSession(req,db);return redirect("/_account",expiredCookie());
    }
    if(!user)return req.method==="GET"?redirect("/_account?next="+encodeURIComponent(u.pathname+u.search)):error("需要先登录",401);
    if(path==="/_account/password"){
      if(req.method==="GET")return send(passwordPage(cleanNext(u.searchParams.get("next"))));
      if(req.method!=="POST")return error("Method not allowed",405);
      let f;try{f=await posted(req)}catch(_){return error("请求未通过安全校验",403)}
      const old=formField(f,"old",128),fresh=formField(f,"fresh",128),again=formField(f,"again",128),next=cleanNext(formField(f,"next",700));
      if(!passwordOK(fresh)||fresh!==again||!old||fresh===old)return send(passwordPage(next,"请输入不同于原密码的至少 12 位新密码，两次输入必须相同"),400);
      const rec=await db.prepare("SELECT password_salt,password_hash,iterations FROM exo_users WHERE id=?").bind(user.id).first();
      if(!rec||!secureEquals(await pbkdf2(old,rec.password_salt,rec.iterations),rec.password_hash))return send(passwordPage(next,"原密码不正确"),401);
      const pp=await passRecord(fresh);
      await db.batch([db.prepare("UPDATE exo_users SET password_salt=?,password_hash=?,iterations=?,must_change=0,updated_at=? WHERE id=?").bind(pp.salt,pp.hash,ITER,now(),user.id),db.prepare("DELETE FROM exo_sessions WHERE user_id=?").bind(user.id)]);
      const cookie=await makeSession(user.id,db);
      return redirect(next==="/"?"/_account":next,cookie);
    }
    if(user.must_change)return redirect("/_account/password");
    if(path==="/_account/avatar"){
      if(req.method!=="POST")return error("Method not allowed",405);
      let f;try{f=await posted(req)}catch(_){return error("请求未通过安全校验",403)}
      const avatar=f.get("avatar");if(!["boy","girl"].includes(avatar))return error("无效的形象",400);
      await db.prepare("UPDATE exo_users SET avatar=?,updated_at=? WHERE id=?").bind(avatar,now(),user.id).run();return redirect("/_account");
    }
    if(path==="/_account/admin"&&req.method==="GET")return user.role==="teacher"?adminPage(db):error("仅教师可访问",403);
    if(path==="/_account/admin/create"||path==="/_account/admin/reset"){
      if(user.role!=="teacher"||req.method!=="POST")return error("仅教师可操作",403);
      let f;try{f=await posted(req)}catch(_){return error("请求未通过安全校验",403)}
      if(path.endsWith("/create")){
        const raw=formField(f,"usernames",5000);
        if(!raw)return error("请输入学生账号",400);
        const names=raw.split(/[\n\r,;]+/).map(s=>safeUser(s)).filter(Boolean);
        if(names.length<1||names.length>15||new Set(names).size!==names.length)return error("每次输入 1–15 个有效且不重复的学生用户名",400);
        const rows=[],credentials=[];
        for(const username of names){const initial=b64(rbytes(15));const p=await passRecord(initial);
          rows.push(db.prepare("INSERT INTO exo_users(id,username,role,avatar,password_salt,password_hash,iterations,must_change,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),username,"student","girl",p.salt,p.hash,ITER,1,now(),now()));
          credentials.push(username+"    "+initial);
        }
        try{await db.batch(rows)}catch(_){return error("创建失败：请检查是否有已存在的用户名。该批次未发放密码。",409)}
        return adminPage(db,"已创建 "+names.length+" 个学生账号。",credentials.join("\n"));
      }
      const username=safeUser(f.get("username"));if(!username)return error("无效用户名",400);
      const target=await db.prepare("SELECT id FROM exo_users WHERE username=? AND role='student'").bind(username).first();
      if(!target)return error("未找到该学生账号",404);
      const initial=b64(rbytes(15)),p=await passRecord(initial);
      await db.batch([db.prepare("UPDATE exo_users SET password_salt=?,password_hash=?,iterations=?,must_change=1,failed_attempts=0,locked_until=0,updated_at=? WHERE id=?").bind(p.salt,p.hash,ITER,now(),target.id),db.prepare("DELETE FROM exo_sessions WHERE user_id=?").bind(target.id)]);
      return adminPage(db,"已重置临时密码。",username+"    "+initial);
    }
    return error("页面不存在",404);
  }
  if(mode!=="individual")return null; // Pilot mode retains the former shared course access.
  if(!db)return error("个人账号数据库尚未配置，请联系教师。",503);
  // All learning modules, including the Café de Flore game, now require a personal account.
  const person=await findSession(req,db);
  if(!person){
    if(req.method!=="GET"&&req.method!=="HEAD")return error("请先登录",401);
    return redirect("/_account?next="+encodeURIComponent(cleanNext(u.pathname+u.search)));
  }
  if(person.must_change)return redirect("/_account/password?next="+encodeURIComponent(cleanNext(u.pathname+u.search)));
  let p=u.pathname;
  for(let i=0;i<3;i++){try{const dec=decodeURIComponent(p);if(dec===p)break;p=dec}catch(_){return error("无效路径",400)}}
  p=p.replace(/\/+/g,"/").toLowerCase();
  const isCafe=p==="/events/au-cafe-de-flore"||p.startsWith("/events/au-cafe-de-flore/");
  const teacher=(p==="/events"||p.startsWith("/events/"))&&!isCafe||
    p==="/pe/qualite"||p==="/pe/qualite/"||p==="/pe/qualite/index.html"||
    ["/pe/qualite/activites","/pe/qualite/deux-chaines","/pe/qualite/ai-demo"].some(x=>p===x||p.startsWith(x+"/"));
  if(teacher&&person.role!=="teacher")return error("该内容仅限教师账号访问",403);
  return ctx.next();
}
