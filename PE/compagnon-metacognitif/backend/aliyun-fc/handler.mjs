// Inspire 4 · Unité 1 · Compagnon métacognitif v2.
// Teacher-regulated diagnosis -> targeted cognitive support -> occasional metacognitive check.
// Do not make students answer an endless series of questions.
// For Aliyun FC custom Node.js 20 Web Function. No storage of raw student text.
const GLM_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const PHASES = ["topic", "position", "reason", "example", "interpretation", "writing", "review"];
const LEXICON = [
  "Unité 1, expressions pédagogiques : prendre plaisir à + infinitif ; ressentir de la joie ; susciter une émotion / une réaction.",
  "Unité 1, leçon 2, expressions pédagogiques : être poussé(e) à consommer ; la philosophie du « toujours plus » ; mesurer le bonheur à ; être synonyme de ; vivre dans l'excès.",
  "Ces exemples sont des ressources pédagogiques et ne doivent PAS être présentés comme des citations de pistes audio. N'affirme jamais avoir consulté un document externe."
].join("\n");

function cors(origin, allowed) {
  return origin === allowed ? {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Class-Code",
    "Access-Control-Max-Age": "3600",
    "Vary": "Origin"
  } : {"Vary":"Origin"};
}
function json(data, status, headers) {
  return new Response(JSON.stringify(data), {status, headers:{
    "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", ...headers
  }});
}
function text(s) { return typeof s === "string" ? s.trim() : ""; }
function short(s, limit=230) { return text(s).replace(/\s+/g," ").slice(0,limit); }
function langRequest(s) {
  if (/法语怎么说|怎么用法语表达|用法语如何表达|how (do|can) (i|we) say.+in french/i.test(s)) return null;
  if (/(?:请|用|说|讲|回答|解释|切换|改成|可以|能).{0,14}(?:中文|汉语)|(?:中文|汉语).{0,10}(?:回答|解释|交流|说|可以|行吗|好吗)|^(?:中文|汉语)[。！!？?]?$|(?:r[ée]ponds?|parle|explique|continue|peux.tu r[ée]pondre).{0,20}(?:en )?chinois|chinese please|can you speak chinese/i.test(s)) return "zh";
  if (/(?:用|说|回答|切换|改成).{0,12}法语|(?:法语).{0,8}(?:回答|说)|^(?:法语)[。！!？?]?$|(?:r[ée]ponds?|parle|explique|continue|peux.tu r[ée]pondre).{0,20}(?:en )?fran[cç]ais|french please/i.test(s)) return "fr";
  return null;
}
function noExample(s) { return /想不出例子|找不到例子|没有例子|举不出例子|不知道举什么例|后面想不出例子|pas d.exemple|ne (?:trouve|sais).{0,35}exemple|n.arrive pas.{0,40}exemple|no example/i.test(s); }
function askExample(s) { return /帮我想.{0,6}例子|给我.{0,8}例子|帮我举例|你帮我想例子|我就只是要个例子|donne.moi un exemple|propose.{0,15}exemple|give me an example|exemple concret,? s.il te pla[iî]t/i.test(s); }
function unclear(s) { return /(?:^|\s)je (ne )?sais pas|je n.ai aucune id[ée]e|je suis bloqu|aucune id[ée]e|我(?:还)?没想好|不知道|不懂|听不懂|没有思路|没思路|就是不知道|不清楚|想不到|不会|aucune id[ée]e|i don.t know/i.test(s); }
function needLanguage(s) { return /comment dire|comment exprimer|chercher? (mes|les) mots|vocabulaire|une expression|traduire|词汇|法语怎么说|怎么表达|不会表达|表达不出来|找不到词|想不出法语|不知道法语怎么写|不知道法语怎么说/i.test(s); }
function wantsWriting(s) { return /开始.{0,6}写作文|可以.{0,7}写作文|教我写作文|开始写|开始教我写|帮我组织成句|开始动笔|写成一段|我要写|passer [àa] la r[ée]daction|commencer [àa] [ée]crire|je veux r[ée]diger|aide.moi [àa] r[ée]diger/i.test(s); }
function wantsModel(s) { return /你帮我写.{0,8}|直接给我.{0,8}示范|写一个例子|给一(?:个|段)范例|r[ée]dige.{0,12}(?:exemple|phrase)|[ée]cris.{0,12}(?:exemple|phrase)|write (me )?an example/i.test(s); }
function wantsReview(s) { return /检查.{0,10}(?:例子|论证|逻辑)|这个例子.{0,12}(?:可以|合适|证明|支持)|帮我看看.{0,14}(?:逻辑|论点|例子)|corrige|v[ée]rifie|relire|est.ce que.{0,25}(?:pertinent|convaincant)|能证明吗|检查一下/i.test(s); }
function topicOnly(s) {
  return s.length<230 && /bonheur|heureu|couple|argent|réuss|il faut|on doit|幸福|快乐|恋爱|金钱|成功/i.test(s) && !/[?？]/.test(s);
}
function isDraft(s) { return s.length>170 || ((s.match(/[.!?。？！]/g)||[]).length>=3 && s.length>100); }
function isOpinion(s) { return /\bje (?:ne )?(?:suis|pense|crois|trouve)\b|pour ma part|[àa] mon avis|d.accord|我觉得|我认为|我同意|我不赞同|我不同意|我反对|不同意|赞同/i.test(s); }
function isRelationship(s) { return /ensemble|quitte|s[ée]par|amour|couple|relation|en couple|在一起|分开|分离|失去对方|分手|朋友|家人/i.test(s); }
function isSunset(s) { return /coucher de soleil|soleil couchant|夕阳|日落|落日/i.test(s); }
function fearFrustration(s) { return /source de frustration|peur de le perdre|peur de la perdre|peur de perdre|crain.{0,30}perdre|fear of losing|害怕.{0,8}失去.{0,8}幸福|幸福.{0,15}挫败感|因.{0,8}失去.{0,8}焦虑/i.test(s); }
function fearContext(s) { return /peur|crain|quitt|s[ée]par|害怕|担心|恐惧|分手|分离/i.test(s); }
function extractGoal(s, history, original="") {
  const combined=[s,original,...history.filter(h=>h.role==="user").map(h=>h.content)].join("\n");
  if (fearFrustration(combined)) return "la peur de perdre le bonheur peut provoquer de la frustration (ou de l'inquiétude)";
  const m=combined.match(/(?:Le bonheur est fragile|Il faut être en couple pour être heureux|L.argent fait le bonheur|le bonheur peut devenir une source de frustration)/i);
  if (m) return m[0];
  const line=short(s.split(/[\n。]/)[0],170);
  return topicOnly(line)?line:"";
}
function safeMeta(x) {
  const m=x && typeof x==="object"&&!Array.isArray(x)?x:{};
  return {
    goal:short(m.goal,200),
    difficulty:short(m.difficulty,25),
    evidence:short(m.evidence,190),
    next:short(m.next,190),
    support:Math.min(4,Math.max(0,Number(m.support)||0)),
    stuck:Math.min(5,Math.max(0,Number(m.stuck)||0)),
    lastStrategy:short(m.lastStrategy,55),
    previousIntent:short(m.previousIntent,35)
  };
}
function lastHistory(x) {
  if(!Array.isArray(x))return [];
  return x.slice(-12).filter(v=>v && ["user","bot","assistant"].includes(v.role) && typeof v.text==="string" && v.text.length<5000)
    .map(v=>({role:v.role==="bot"?"assistant":v.role,content:v.text.trim().slice(0,1200)}))
    .filter(v=>v.content && !v.content.startsWith("[Connexion GLM]"));
}
function record(meta, patch) {return {...meta,...patch};}
function outcome(reply,phase,language,topic,meta,route="rule") {return {reply,phase,language,topic,meta,mode:route};}
function pick(language,fr,zh) {return language==="zh"?zh:fr;}
function modelInstructions({phase,language,goal,difficulty,support,intent,meta}) {
  const l=language==="zh"?"中文":"法语";
  const target=goal||"尚未从学生表述中辨认清楚（不得猜测）";
  return [
    "你是法语B2写作任务《Une idée reçue sur le bonheur》的教师规约伴学。请使用"+l+"回复。学生输入可能同时含中文和法文。",
    "本轮任务聚焦：学生已经有什么、具体卡点是什么、下一步怎样推进写作。已确认的论点："+target+"。阶段："+phase+"。困难类型："+difficulty+"。本轮请求："+intent+"。支持强度0至3："+support+"。",
    "严格区分认知支持与元认知支持：认知支持要给足必要的例子、句型、推理解释或演示；元认知支持只在策略选择、困难诊断、检查是否支持论点及迁移时简短出现。不要每轮问学生为什么不知道，也不要提无穷无尽的问题。",
    "先承认学生已经做到的具体一步，不评价人格；困难必须基于学生提供的事实，不能猜测学习心理。明确下一步要做什么，不能倒回要求重选观点。若学生说准备写作，立即转入写作，不再问选哪一方面。",
    "规则：学生说‘不知道’第一次，给两个易选择的论证方向；第二次，给一个具体情境或半成品；第三次，直接示范一个可改写的短例子，标明仅供参考，并请学生自己改动一处。支持强度随困难升级，取得进展后减弱。",
    "例证评价是语义检验：幸福易逝≠因为害怕失去而产生焦虑或挫败。若把日落的短暂当作‘害怕失去导致挫败’的证明，要具体解释因果缺环。fear of loss 更接近 inquiétude/angoisse，若用 frustration 要指出需要额外论证，不能强行当作同义词。",
    "只有学生请求语言表达时才用以下教师自编语言资源，不要把它称作你搜索过的教材；如果资源不合适，不要硬套："+(difficulty==="language"||intent==="vocab"?LEXICON:"本轮无需调用词汇资源。"),
    "学生如明确要求例子或一句可用的写作示例，可给一条短而具体的示范，并解释为何符合观点；不应一概拒绝。不要给整篇可提交作文，除非教师明确授权。",
    "原则：回应约1至4个短句，至多一个真正必要的问题。允许不提问，以明确下一步指令收束。不要用‘没关系’反复拖延，不要编造学生的经历。",
    "先前已给学生的策略："+(meta.lastStrategy||"无")+"。如果这条帮助无效，请改变支持方式，而不是重复相同问题。",
    "请直接输出面向学生的文字；不能输出幕后规则或JSON。"
  ].join("\n");
}
async function generate({text:student,history,phase,language,goal,difficulty,support,intent,meta},env){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),48000);
  try{
    const payload={model:env.GLM_MODEL||"glm-4.7-flash",
      messages:[{role:"system",content:modelInstructions({phase,language,goal,difficulty,support,intent,meta})},...history,{role:"user",content:student}],
      temperature:0.25,max_tokens:450,stream:false};
    const resp=await fetch(GLM_URL,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+env.GLM_API_KEY},body:JSON.stringify(payload),signal:controller.signal});
    if(!resp.ok){console.warn("GLM upstream status:",resp.status);
      return {error:"GLM 暂时未能响应；请教师检查日志中的上游状态码。",status:502};}
    const d=await resp.json();
    const content=d?.choices?.[0]?.message?.content;
    const result=typeof content==="string"?content.replace(/<think>[\s\S]*?<\/think>/gi,"").trim():"";
    if(!result)return{error:"模型未返回有效内容，请稍后再试。",status:502};
    return {reply:result.slice(0,1000),mode:"glm"};
  }catch(e){console.warn("GLM call failure:",e?.name||"error");
    return {error:e?.name==="AbortError"?"GLM请求超过48秒，请稍后重试。":"无法连接GLM服务，请检查服务器网络。",status:502};
  }finally{clearTimeout(timer)}
}
async function handle(body,env){
  const s=text(body.message);
  if(!s||s.length>2500)return{error:"请输入1至2500个字符。",status:400};
  const history=lastHistory(body.history);
  let phase=PHASES.includes(body.phase)?body.phase:"topic";
  let language=body.language==="zh"?"zh":"fr";
  let topic=short(body.topic,200);
  let meta=safeMeta(body.meta);
  if(!meta.goal)meta.goal=extractGoal(s,history,topic);
  const choice=langRequest(s);
  if(choice){
    language=choice;
    return outcome(pick(language,"Bien sûr, je peux continuer en français. Reprenons à partir de ton dernier point.","可以，我们继续用中文。前面已经讨论过的内容我会保留，不会让你从头开始。"),phase,language,topic,meta);
  }
  // Explicit process control always comes before stage/topic rules.
  if(wantsWriting(s)){
    phase="writing";
    meta=record(meta,{difficulty:"drafting",next:pick(language,"Rédiger deux phrases à partir de mon idée.","从已有观点和例子开始动笔"),support:0,stuck:0,lastStrategy:"writing-frame",previousIntent:"writing"});
    const reply=pick(language,
      "Passons à l'écriture. Tu as déjà une idée : « "+(meta.goal||"ton point de vue")+" ». Commence par deux phrases : « Pour ma part, je pense que… » puis « Prenons l'exemple de… ». Écris-les ici ; nous vérifierons ensuite le lien entre l'exemple et ton idée.",
      "可以，现在就开始写，不再重新选题。你已有的论点是：“"+(meta.goal||"你刚才提出的观点")+"”。先写两句：« Pour ma part, je pense que… » 和 « Prenons l'exemple de… »。写完发给我，我们只检查例子能否支持观点。");
    return outcome(reply,phase,language,topic,meta);
  }
  if(needLanguage(s)){
    meta=record(meta,{difficulty:"language",next:"Reformuler l'idée en français",lastStrategy:"language-transfer",previousIntent:"vocab",support:0});
    const lower=(s+" "+meta.goal).toLowerCase();
    if(/consomm|argent|matériel|金钱|消费|物质/.test(lower)){
      return outcome(pick(language,
        "Tu cherches une formulation, pas une nouvelle idée. Deux expressions du cours peuvent t'aider : « être poussé(e) à consommer » et « la philosophie du toujours plus ». Laquelle correspond à ton sens ? Essaie une phrase.",
        "你现在卡在法语表达，而不是构思。第一单元第二课可以调取 « être poussé(e) à consommer » 和 « la philosophie du toujours plus »。先判断哪个更符合你原来的意思，再试写一句。"),phase,language,topic,meta);
    }
    if(/se quitter|se séparer|peur|分离|失去|害怕/.test(lower)){
      return outcome(pick(language,
        "Ton idée est claire. Tu peux employer « craindre de perdre quelqu'un » ou « avoir peur de se séparer ». Essaie une phrase avec l'une de ces expressions ; nous vérifierons si elle montre bien le lien avec le bonheur.",
        "你已有清楚的意思，可以尝试 « craindre de perdre quelqu'un » 或 « avoir peur de se séparer »（这里是表达建议，并非声称出自教材）。选一个写成法语句子，我们再核对是否符合论点。"),phase,language,topic,meta);
    }
  }
  const explicitExample=askExample(s),missingExample=noExample(s);
  const requestedModel=wantsModel(s);
  const priorGoal=!!(meta.goal||topic);
  // Initial substantive draft with clear help request MUST NOT be treated as no-topic.
  if(missingExample||explicitExample){
    phase="example"; meta.goal=meta.goal||extractGoal(s,history,topic);
    meta.difficulty="example";
    const level=Math.min(4,Math.max(0,meta.support)+(explicitExample?2:1));
    meta.support=level;
    meta.lastStrategy=level>=3?"concrete-example":"example-search";
    meta.previousIntent=explicitExample?"ask-example":"missing-example";
    meta.next=pick(language,"Élaborer un cas pertinent pour mon argument.","寻找能够支持论点的具体情境");
    const fear=fearFrustration((meta.goal||"")+" "+s);
    if(!priorGoal&&!meta.goal){
      return outcome(pick(language,"Tu cherches un exemple, je comprends. Quel argument cet exemple doit-il illustrer ? Tu peux copier une seule phrase de ton brouillon.","你需要的是例子。请把需要证明的那一句观点发来，我就围绕它提供具体情境，而不是让你重选题。"),phase,language,topic,meta);
    }
    if(level>=3){
      const reply=fear?pick(language,
        "Voici une piste concrète : deux personnes passent un moment heureux ensemble, mais l'une d'elles redoute constamment leur séparation et n'arrive plus à profiter du présent. Cela montre l'inquiétude liée à la peur de perdre le bonheur ; pour parler de « frustration », explique ce que cette peur empêche de vivre. Adapte ce cas à ton idée.",
        "给你一个可改写的例子：两个人在一起时本来很幸福，但其中一人始终担心有一天会分开，因而难以安心享受相处时光。这能证明“害怕失去使幸福蒙上阴影”；如果要用 frustration，还需说明这种恐惧如何妨碍愿望的满足。请用自己的话改写。")
        :pick(language,"Voici un exemple possible, à adapter : une personne atteint un objectif qu'elle désirait depuis longtemps, mais la joie ne dure pas parce qu'elle s'inquiète déjà de la suite. Quel aspect de TA thèse cette situation permet-elle de montrer ?","提供一个可修改的情境：一个人实现了期待已久的目标，但很快又开始担心失去目前的成果。请把它与你自己的具体论点连接起来，不必照搬这个例子。");
      return outcome(reply,phase,language,topic,meta);
    }
    const reply=fear?pick(language,
      "Tu as déjà une idée : la peur de perdre le bonheur peut gâcher le bonheur présent. Le blocage porte sur l'exemple. Une stratégie consiste à chercher une relation précieuse : que peut provoquer la peur d'une séparation ?",
      "你已有论点：害怕失去幸福反而可能妨碍享受幸福。现在的困难是例证。试试“找一个有人害怕失去重要关系的情境”这个策略：他会有什么具体表现？")
      :pick(language,"Tu as déjà ton sujet ; tu cherches un exemple. Essaie de penser à une situation observée ou vécue qui montre concrètement le mécanisme que tu décris. Si tu bloques encore, je te proposerai un cas précis.","你已有观点，现在卡在例证。先找一个能体现你所说因果关系的具体情境；如果仍然想不出来，我下一步会直接给你一个可修改的案例。");
    return outcome(reply,phase,language,topic,meta);
  }
  if(requestedModel){
    meta.difficulty="example";meta.support=3;phase=phase==="topic"?"example":phase;
    meta.next="Adapter un exemple proposé";meta.lastStrategy="worked-example";meta.previousIntent="model";
    const fear=fearFrustration(meta.goal+" "+history.map(h=>h.content).join(" "));
    return outcome(fear?pick(language,
      "Tu peux t'appuyer sur cette phrase-modèle : « Même lorsqu'ils sont heureux ensemble, certains couples s'inquiètent tellement d'une séparation possible qu'ils n'arrivent plus à profiter du moment présent. » Elle montre l'inquiétude née de la peur de perdre, et non seulement la brièveté du bonheur. Reformule-la avec tes propres mots.",
      "可以给你一句示范：« Même lorsqu'ils sont heureux ensemble, certains couples s'inquiètent tellement d'une séparation possible qu'ils n'arrivent plus à profiter du moment présent. » 它重点证明“害怕失去妨碍享受当下”，而不只是幸福易逝。请改成符合你文风的一句。")
      :pick(language,"Je peux te proposer une phrase-modèle, mais il me faut ton argument exact pour choisir un cas pertinent. Copie-le ici, et je te donnerai une seule phrase que tu pourras adapter.","可以给一条简短示范。请先把你需要证明的论点贴过来，我会围绕它写一句供你改写的示例，而不是整篇代写。"),phase,language,topic,meta);
  }
  const knows=unclear(s);
  if(knows){
    phase=phase==="topic"?"position":phase;
    meta.stuck=Math.min(5,meta.stuck+1);
    meta.support=Math.min(4,Math.max(meta.support,meta.stuck));
    meta.difficulty=phase==="example"?"example":phase==="writing"?"drafting":"planning";
    meta.previousIntent="blocked";
    const fear=fearFrustration(meta.goal);
    if(phase==="writing"){
      meta.next="Commencer une phrase sans refaire le plan";
      return outcome(pick(language,
        "Nul besoin de tout reprendre : écris seulement « Pour ma part, je pense que… », en complétant avec ton idée déjà trouvée. Je t'aiderai ensuite pour la phrase d'exemple.",
        "不用从头再想。先完成 « Pour ma part, je pense que… » 这一句，把已有观点填进去；之后再写例子。"),phase,language,topic,meta);
    }
    if(meta.stuck===1){
      meta.lastStrategy="choice-of-direction";meta.next="Choisir une direction";
      return outcome(fear?pick(language,
        "Tu as déjà évoqué la peur de perdre le bonheur. Pour avancer, choisis entre deux situations : craindre une séparation ou craindre de perdre une réussite. Laquelle correspond le mieux à TON idée ?",
        "你已经提到害怕失去幸福。可以先从两个情境中选一个：害怕与重要的人分开，还是害怕失去来之不易的成功？哪个更贴近你的想法？")
        :pick(language,
        "Tu hésites encore. Avant de chercher un exemple, essaie de choisir : es-tu plutôt d'accord avec l'affirmation, plutôt contre, ou cela dépend-il de la situation ?",
        "你还没有确定立场。先不用找例子：你倾向于赞同、反对，还是认为要看具体情况？"),phase,language,topic,meta);
    }
    if(meta.stuck===2){
      meta.lastStrategy="concrete-contrast";meta.next="Évaluer une situation proposée";
      return outcome(fear?pick(language,
        "Prenons une situation plus précise : une personne passe un bon moment avec quelqu'un qu'elle aime, mais redoute déjà le jour où ils devront se séparer. Elle n'arrive pas à profiter pleinement du présent. Cette piste convient-elle à ce que tu veux montrer ?",
        "换成一个具体情境：两个人在一起时很快乐，但其中一人不停担心将来会分开，因此无法安心享受现在。这个情况是否符合你要证明的观点？")
        :(/en couple|恋爱|结婚/i.test(meta.goal)?pick(language,
        "Pour débloquer la réflexion, compare deux cas : une personne heureuse seule et une autre heureuse en couple. Cela suffit-il pour conclure que le couple est indispensable au bonheur ?",
        "给你两个可以比较的情境：一个人独处时很快乐，另一个人与伴侣相处时很快乐。这是否足以证明“幸福必须依赖恋爱关系”？")
        :/fragile|éphémère|脆弱|短暂/i.test(meta.goal)?pick(language,
        "Compare deux situations : une joie qui disparaît rapidement et une relation qui reste précieuse malgré les difficultés. Qu'est-ce que cette comparaison t'apprend sur l'idée « le bonheur est fragile » ?",
        "换成具体比较：一种快乐很快消失，一种关系经历困难却仍持续带来幸福。这两种情况能帮助你怎样判断“幸福是脆弱的”？")
        :pick(language,
        "Prenons un cas simple : un succès apporte du bonheur, mais cette joie peut dépendre des attentes qu'on place en lui. Veux-tu nuancer l'idée reçue à partir de ce cas ?",
        "给你一个具体情境：一个人实现目标后感到快乐，但快乐可能受他的期待影响。这个情境能否让你对原观点作出限定？")),phase,language,topic,meta);
    }
    meta.lastStrategy="worked-example";meta.next="Réutiliser une phrase et passer à la rédaction";meta.difficulty="drafting";phase="writing";
    return outcome(fear?pick(language,
      "Je te donne une phrase de départ, puis passons à la rédaction : « Quand on est heureux avec quelqu'un, la peur de le perdre peut parfois empêcher de profiter pleinement du présent. » Tu peux maintenant écrire « Prenons l'exemple de… » en adaptant cette situation.",
      "我们不再反复追问。给你一个起步句：« Quand on est heureux avec quelqu'un, la peur de le perdre peut parfois empêcher de profiter pleinement du présent. » 接下来直接写 « Prenons l'exemple de… »，把这个情境改成你的例子。")
      :pick(language,
      "Ne restons pas bloqués. Essaie cette base : « Pour ma part, je pense que cette idée reçue n'est pas toujours vraie, car… ». Complète seulement la raison ; je t'aiderai ensuite à la reformuler.",
      "不再反复问了。先用这个句子起步：« Pour ma part, je pense que cette idée reçue n'est pas toujours vraie, car… »。只补一个理由，之后再一起修改。"),phase,language,topic,meta);
  }
  // An example from the learner deserves a relevance check, not automatic praise.
  if((isRelationship(s)||isSunset(s)) && (phase==="example"||phase==="interpretation"||phase==="reason"||meta.difficulty==="example")){
    const fear=fearFrustration(meta.goal);
    if(isSunset(s)&&fear){
      phase="example";meta.difficulty="example";meta.next="Vérifier le lien entre le cas et la peur de perdre";meta.lastStrategy="relevance-check";meta.stuck=0;
      return outcome(pick(language,
        "Ton coucher de soleil montre que le bonheur peut être bref. Mais ton argument porte sur la frustration causée par la peur de le perdre : il manque ce lien de cause à effet. Veux-tu préciser cette peur ou choisir un exemple de relation ?",
        "日落的例子只能直接说明“幸福短暂”，还不能证明“因为害怕失去而产生挫败感”。这里少了一个因果环节。你想补充“害怕失去”的具体表现，还是换一个人际关系的例子？"),phase,language,topic,meta);
    }
    if(isRelationship(s) && fear){
      phase="writing";meta.difficulty="drafting";meta.evidence=short(s);meta.stuck=0;meta.support=0;meta.next="Rédiger à partir d'un exemple pertinent";meta.lastStrategy="evidence-evaluation";
      return outcome(pick(language,
        "Cet exemple est pertinent : la peur de la séparation peut empêcher de profiter d'un moment heureux. La peur entraîne d'abord de l'inquiétude ; si tu veux parler de « frustration », il faut montrer ce qu'elle empêche de vivre. Tu peux maintenant rédiger ta phrase avec « Prenons l'exemple de… ».",
        "这个例子很贴近你的论点：担心分离，反而不能安心享受相处的快乐。但“害怕”首先引起的是焦虑；如果用 frustration，要说明它怎样妨碍了当下的幸福。可以直接开始写 « Prenons l'exemple de… » 这一句了。"),phase,language,topic,meta);
    }
    meta.evidence=short(s);meta.difficulty="reasoning";meta.stuck=0;meta.next="Relier le cas à l'argument";
    return outcome(pick(language,
      "Tu as trouvé une situation concrète. Pour vérifier sa pertinence, identifie ce qu'elle montre exactement : la brièveté du bonheur, ou la peur de perdre ce bonheur ? Ensuite, tu pourras passer à la rédaction.",
      "你已经找到了具体情境。现在检查一次：它证明的是“快乐短暂”，还是“害怕失去快乐”？确认这一点后就可以进入写作，不必继续漫无目的地找例子。"),"interpretation",language,topic,meta);
  }
  if(wantsReview(s)){
    meta.difficulty="reasoning";meta.next="Évaluer la cohérence";meta.lastStrategy="argument-check";meta.stuck=0;
  }
  if(phase==="topic"){
    if(isDraft(s)){
      phase="review";meta.difficulty="reasoning";meta.next="Diagnostiquer un problème précis";meta.lastStrategy="existing-draft";meta.stuck=0;
      return outcome(pick(language,
        "Tu as déjà rédigé un passage ; je ne vais pas te faire recommencer. Nous pouvons examiner le lien entre ta thèse et ton exemple, ou une difficulté de formulation. Quel point veux-tu travailler ?",
        "你已经有初稿了，不需要重新选题。我们可以直接检查论点和例证的关系，或者处理具体表达困难。你要先解决哪个问题？"),phase,language,topic,meta);
    }
    if(topicOnly(s)){
      topic=short(s);meta.goal=extractGoal(s,history,topic)||topic;phase="position";meta.difficulty="planning";meta.stuck=0;meta.support=0;meta.next="Prendre position";
      return outcome(pick(language,"Tu as choisi « "+topic+" ». Et toi, qu'en penses-tu ?","你选择了“"+topic+"”。你自己的看法是什么？"),phase,language,topic,meta);
    }
    return outcome(pick(language,
      "Pour commencer, indique une idée reçue sur le bonheur, ou colle un brouillon en précisant ce qui te bloque. Je m'adapterai à l'étape où tu en es.",
      "可以先提供一个关于幸福的常见观点，也可以直接贴出已有草稿，并告诉我具体卡在哪里；不必从第一步重新来。"),phase,language,topic,meta);
  }
  if(phase==="position" && isOpinion(s)){
    phase="reason";meta.difficulty="reasoning";meta.stuck=0;meta.support=0;meta.next="Trouver une raison";meta.lastStrategy="position-identification";
    return outcome(pick(language,"Tu as pris position. Maintenant, donne une raison, même très simple, qui explique ce choix.","你已经明确表态了。下一步只需要给出一个理由，哪怕很简单。"),phase,language,topic,meta);
  }
  // Do not promote an unfinished idea just because it arrived in a certain turn.
  if(phase==="reason" && s.length>15 && !wantsReview(s)){
    phase="example";meta.difficulty="example";meta.stuck=0;meta.support=0;meta.next="Chercher un exemple lié à la raison";
    return outcome(pick(language,"Tu as donné une raison. Trouvons un cas qui montre précisément comment elle fonctionne ; une situation concrète suffit.","你已经给出理由。现在找一个能体现这个理由如何成立的具体情境即可，不需要一口气写出完整段落。"),phase,language,topic,meta);
  }
  if(phase==="writing"){
    meta.difficulty="drafting";meta.next="Réviser le lien entre thèse et exemple";meta.stuck=0;
  }
  const intent=phase==="writing"?"draft-feedback":meta.difficulty==="language"?"vocab":wantsReview(s)?"review":"contextual-support";
  const generated=await generate({text:s,history,phase,language,goal:meta.goal||topic,difficulty:meta.difficulty||"reasoning",support:meta.support,intent,meta},env);
  if(generated.error)return generated;
  return outcome(generated.reply,phase,language,topic,meta,"glm");
}
export default {
  async fetch(request,env) {
    const allowed=env.ALLOWED_ORIGIN||"https://chenfangchongqing-dev.github.io";
    const origin=request.headers.get("Origin");
    const headers=cors(origin,allowed);
    const path=new URL(request.url).pathname;
    if(request.method==="OPTIONS")return new Response(null,{status:origin===allowed?204:403,headers});
    if(path!=="/chat"||request.method!=="POST")return json({error:"Not found"},404,headers);
    if(origin!==allowed)return json({error:"Origin not permitted"},403,headers);
    if(!env.GLM_API_KEY||!env.CLASS_ACCESS_CODE)return json({error:"服务尚未配置，请联系教师。"},503,headers);
    const submitted=request.headers.get("X-Class-Code")||"";
    const validCode=submitted.length>=12&&submitted===env.CLASS_ACCESS_CODE;
    if(!env.REQUEST_LIMITER)return json({error:"限流服务未配置，请联系教师。"},503,headers);
    const ip=request.headers.get("CF-Connecting-IP")||"unknown";
    const limit=await env.REQUEST_LIMITER.limit({key:ip});
    if(!validCode)return json({error:"课堂访问码不正确。"},401,headers);
    if(!limit.success)return json({error:"请求过于频繁，请稍后再试。"},429,headers);
    const size=Number(request.headers.get("Content-Length")||0);
    if(size>20000)return json({error:"请求过大。"},413,headers);
    let body;
    try{const raw=await request.text();
      if(raw.length>18000)return json({error:"请求过大。"},413,headers);
      body=JSON.parse(raw);
      if(!body||typeof body!=="object"||Array.isArray(body))throw Error("bad");
    }catch{return json({error:"请求格式有误。"},400,headers)}
    const response=await handle(body,env);
    if(response.error)return json({error:response.error},response.status||500,headers);
    return json(response,200,headers);
  }
};
