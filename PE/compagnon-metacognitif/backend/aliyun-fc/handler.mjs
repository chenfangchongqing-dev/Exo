// Inspire 4 · Teacher-regulated writing companion v3 (S12 / S09 / S02 pilot).
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
function needLanguage(s) { return /comment dire|comment exprimer|chercher? (mes|les) mots|vocabulaire|une expression|traduire|词汇|法语怎么说|怎么表达|不会表达|表达不出来|找不到词|想不出法语|不知道法语怎么写|不知道法语怎么说|不知道.{0,6}法语.{0,10}(?:写|表达)|不会.{0,6}写法语|不会写法语|法语(?:句子)?写不出来|用法语(?:写|说)不出来|je ne sais pas [ée]crire en fran[cç]ais|je n.arrive pas [àa] [ée]crire en fran[cç]ais/i.test(s); }
function wantsCompleteDraft(s){
 const v=String(s||"").trim();
 const cVerb=/(?:你|请|帮我|替我|给我|为我|直接|能不能|可不可以).{0,20}(?:写|代写|生成|完成|写完|写好)/i;
 const cScope=/(?:一篇|整篇|全文|整份|完整(?:的)?(?:作文|文章|短文|范文|论文)|整篇文章|一整篇|这篇|那篇|全部内容)/;
 const cTemplate=/(?:给我|发我|想看|有没有|提供).{0,16}(?:一篇|整篇|全文|完整(?:的)?(?:作文|文章|短文|范文)|范文)/;
 const french=/^\s*(?:s.il te pla[iî]t[, ]*)?(?:r[ée]dige\b|[ée]cris\b|fais\b|compose\b|donne[- ]moi|(?:peux|pourrais)[- ]tu (?:me )?(?:r[ée]diger|[ée]crire|faire|donner)|tu (?:peux|pourrais) (?:me )?(?:r[ée]diger|[ée]crire|faire|donner)).{0,55}(?:r[ée]daction|texte complet|texte entier|essai complet|dissertation|article complet|composition|devoir complet|l.essai|tout le texte)/i;
 const english=/^\s*(?:(?:can|could|would) you\s+)?(?:write|draft|generate|finish|complete|give me|do).{0,55}(?:my|an?|the|whole|entire|full).{0,20}(?:essay|full paper|article|assignment|composition|whole text|entire text)/i;
 return(cVerb.test(v)&&cScope.test(v))||cTemplate.test(v)||french.test(v)||english.test(v);
}
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
  const first=short(s.split(/(?:[.!?。？！]\s+|\n)/)[0],190);
  if(/je pense|je crois|pour ma part|je voudrais garder|j.ai une id[ée]e sur|我认为|我觉得/i.test(first))return first;
  const earlier=history.filter(h=>h.role==="user").map(h=>h.content).reverse()
    .find(h=>/je pense|je crois|pour ma part|j.ai une id[ée]e|我认为|我觉得/i.test(h));
  return earlier?short(earlier.split(/(?:[.!?。？！]\s+|\n)/)[0],190):short(original,190);
}
function safeMeta(x) {
  const m=x && typeof x==="object"&&!Array.isArray(x)?x:{};
  return {
    goal:short(m.goal,200),
    task:short(m.task,60),
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
function excessiveWritingOutput(s){
 const v=String(s||"").trim();
 const headings=(v.match(/(?:^|\n)\s*(?:#{1,3}\s*)?(?:\*{1,2})?(?:introduction|d[ée]veloppement|exemple|conclusion|引言|正文|结论|示例)(?:\*{1,2})?\s*[:：]/gim)||[]).length;
 const paragraphs=(v.match(/\n\s*\n/g)||[]).length;
 const sentences=(v.match(/[.!?。！？](?:\s|$)/g)||[]).length;
 return v.length>650||headings>=2||(paragraphs>=2&&v.length>400)||(sentences>=6&&v.length>450);
}
function boundedAlternative(language,difficulty){
 const zh=language==="zh";
 if(difficulty==="example")return zh?"先不把例子扩写成整篇文章。请只选一个具体情境，说明谁遇到了什么，以及它与既有观点有什么联系。我们可以先检查这一步。":"Nous allons rester sur un exemple, sans rédiger tout le devoir. Choisis une situation précise et vérifions quel fait soutient réellement ton idée.";
 if(difficulty==="language")return zh?"先聚焦最难表达的一句话。请说清楚原意，我可以提示一个短语或局部句式，再由你尝试组织法语。":"Concentrons-nous sur une phrase difficile. Précise le sens voulu ; je pourrai proposer une expression ou une structure courte à réutiliser.";
 if(difficulty==="reasoning")return zh?"先检查现有论据：哪些是可观察的事实，哪些只是推断？你可以选择补充依据或缩小结论，而不必重写整篇文章。":"Vérifions d'abord le raisonnement : qu'est-ce qui est observable et qu'est-ce qui reste une hypothèse ? Tu pourras ensuite ajuster la conclusion.";
 return zh?"先把这一步缩小：你已经写出了什么，目前最需要解决哪一个问题？我会针对这一处提供帮助，不直接展开整篇文章。":"Avançons sur un seul point : qu'as-tu déjà écrit et quel problème précis souhaites-tu résoudre ? Nous travaillerons sur cette étape.";
}
function modelInstructions({phase,language,goal,difficulty,support,intent,meta}) {
  const l=language==="zh"?"中文":"法语";
  const target=goal||"尚未从学生表述中辨认清楚（不得猜测）";
  return [
    "你是高校法语B1-B2写作伴学助手，在教师规约下提供帮助。当前优先测试 Unité 1 的三种教学困难，但不得预设学生正在讨论幸福、某项题目或特定立场。先读学生真实的任务与求助，再用"+l+"回复。学生输入可能含中文与法文。",
    "本轮任务："+(meta.task||"尚需明确")+"。学生已经表达的内容（不是你替他补出的观点）："+target+"。当前支架类别："+difficulty+"；当前阶段："+phase+"；本轮求助："+intent+"；强度："+support+"。",
    "严格区分认知支持与元认知支持：认知支持要给足必要的例子、句型、推理解释或演示；元认知支持只在策略选择、困难诊断、检查是否支持论点及迁移时简短出现。不要每轮问学生为什么不知道，也不要提无穷无尽的问题。学生已提供中文论述而法语表达受阻时，不得反复询问题目；先分解一个意义单位，给可调用的词汇、句架和一个局部示范，随后检查学生自行试写的句子以及迁移。",
    "先承认学生已经做到的具体一步，不评价人格；困难必须基于学生提供的事实，不能猜测学习心理。明确下一步要做什么，不能倒回要求重选观点。若学生说准备写作，立即转入写作，不再问选哪一方面。",
    "支架不能机械按‘选题—表态—理由—例子’排列。根据本轮真实困难选择：构思给具体线索；语言阻断给短语/局部句式并让学生尝试；论证缺口区分事实、推断与证据；学生已提出有界限的结论时承认其判断并进入写作。帮助不足时再升级，学生能前进就及时撤除。",
    "进行语义检验时以学生文本为依据。若学生讨论‘害怕幸福结束’，区分忧虑和挫败感；若讨论‘职业压力与幸福’，区分工作事实、可能自豪与有证据的幸福感；若讨论‘社交媒体刺激消费’，不要擅自补入消费动机、经历或课文原话。这些只是识别原则，不是强制每轮使用的主题。",
    "只在学生需要语言帮助时使用以下少量教师整理的表达线索："+(difficulty==="language"||intent==="vocab"?LEXICON:"本轮不需额外提供词汇。")+"。这不是实时知识库检索：未实际检索时不能声称‘刚刚查到’、给虚构条目编号或把教师例句当作教材音频原句。",
    "学生如明确请求一个例子，可给一条标明是假设的短而具体的情境，并解释它支持的是哪一部分观点；不能自动套用‘害怕失去幸福’示例。不要写可直接提交的完整作文。",
    "整篇作文或大段范文请求必须限缩到当前写作障碍，不能用带有 Introduction、Exemple、Conclusion 的结构化文章来绕过限制；短语、单句、局部示范允许提供。",
    "原则：通常1至3个短句，至多一个主要问题。学生已给出内容时先承认已完成的具体部分，再处理真正卡点；允许直接给小范围认知支持，不要把元认知训练变成机械追问。不要编造学生的经历。",
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
      temperature:0.25,max_tokens:300,stream:false};
    const resp=await fetch(GLM_URL,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+env.GLM_API_KEY},body:JSON.stringify(payload),signal:controller.signal});
    if(!resp.ok){console.warn("GLM upstream status:",resp.status);
      return {error:"GLM 暂时未能响应；请教师检查日志中的上游状态码。",status:502};}
    const d=await resp.json();
    const content=d?.choices?.[0]?.message?.content;
    const result=typeof content==="string"?content.replace(/<think>[\s\S]*?<\/think>/gi,"").trim():"";
    if(!result)return{error:"模型未返回有效内容，请稍后再试。",status:502};
    if(excessiveWritingOutput(result))return {reply:boundedAlternative(language,difficulty),mode:"guard",guarded:true};
    return {reply:result,mode:"glm",guarded:false};
  }catch(e){console.warn("GLM call failure:",e?.name||"error");
    return {error:e?.name==="AbortError"?"GLM请求超过48秒，请稍后重试。":"无法连接GLM服务，请检查服务器网络。",status:502};
  }finally{clearTimeout(timer)}
}
function identifyTask(s, previous="") {
  if(/synth[ée]tis|synth[èe]se|多篇.{0,6}整合|综合多篇|合并信息/i.test(s))return "synthétiser";
  if(/r[ée]sum[ée]|r[ée]sumer|概述|摘要|总结文本/i.test(s))return "résumer";
  if(/d[ée]cri|description|描写|描述人物|描述场景/i.test(s))return "décrire";
  if(/raconter|r[ée]cit|讲述经历|叙述经历/i.test(s))return "raconter";
  if(/argument|id[ée]e re[cç]ue|prise de position|th[èe]se|point de vue|(?:mon )?exemple.{0,70}(?:pertinent|preuve)|论证|论点|观点论述/i.test(s))return "argumenter";
  return previous;
}
function newNeedLanguage(s) {
  return needLanguage(s)||/je (?:suis |me sens )?bloqu[ée]e?\s+en\s+fran[cç]ais|je bloque en fran[cç]ais|je manque de mots|je n.arrive pas [àa] (?:l.)?exprimer en fran[cç]ais|语言表达困难|说不出法语/i.test(s);
}
function needLink(s) {
  return /comment le relier|comment la relier|comment relier|lien entre|quel lien|en quoi.{0,50}(?:prouve|montre|soutient)|rapport avec ma th[èe]se|est.ce pertinent|est.ce que.{0,55}pertinent|能(?:否)?证明|如何(?:与|和).{0,25}(?:观点|论点).*联系|和论点有什么关系|推理缺口|能说明什么/i.test(s);
}
function makesNuance(s) {
  return /sans dire que tous|sans dire que tout|ne (?:signifie|veux) pas dire que tous|sans (?:pour autant )?g[ée]n[ée]raliser|peut donner de la satisfaction|可以.{0,16}但不代表所有|不等于所有|并非所有|不想说所有|不代表每个/i.test(s);
}
function effortToConnect(s) {
  return /n.arrive pas [àa] profiter|ne peux pas profiter|j.ai peur que.{0,100}se terminent|redoute.{0,100}fin|害怕.{0,20}结束.{0,40}(?:享受|开心)|不能享受当下|无法享受当下/i.test(s);
}
function hasLanguageAttempt(s) {
  return /(?:pouss[ée]s?\s+[àa]\s+consommer|[êe]tre\s+pouss[ée]|nous\s+poussent\s+[àa]\s+consommer)/i.test(s);
}
function namesConsumption(s) {
  return /donnent? envie.{0,70}(?:acheter|consommer)|consommer.{0,25}(?:plus|davantage)|消费欲望|让(?:别人|人们).{0,25}(?:买|消费)/i.test(s);
}
function clearWorkGoal(s) {
  const first=text(s).split(/(?:[.!?。？！]\s+|\n)/)[0].trim();
  if(/(?:je pense|je crois|je voudrais garder|pour ma part|j.ai une id[ée]e sur|我认为|我觉得|我的观点是)/i.test(first)) return short(first,190);
  return "";
}
function preexistingStudentWork(s) {
  return isDraft(s)||/\bmon exemple\b|j.ai une id[ée]e sur|je pense que|je voudrais garder l.id[ée]e|j.ai d[ée]j[àa] un brouillon|已有初稿|我已经写了|我认为/i.test(s);
}
// Recognise an existing mixed Chinese/French draft and its continuing language block.
function s09Mixed(v) {
  return (v.match(/[\u3400-\u9fff]/g)||[]).length>=45 &&
    (v.match(/[A-Za-z\u00c0-\u024f]/g)||[]).length>=75;
}
function s09Topic(v) {
  return (/(?:r[ée]seaux sociaux|社交媒体|网络分享)/i.test(v) &&
    /(?:酒店|h[ôo]tel|拼团|轮流拍照|模仿|高品质|奢华|luxueux|luxe|物质生活)/i.test(v))
    || /拼团.{0,16}酒店|轮流拍照/i.test(v);
}
function s09Draft(v,history) {
  if(s09Mixed(v)&&s09Topic(v))return v;
  return history.filter(t=>t.role==="user").map(t=>t.content).reverse()
    .find(t=>s09Mixed(t)&&s09Topic(t))||"";
}
function s09FrenchSentence(v){
  return !/[\u3400-\u9fff]/.test(v) && !needLanguage(v) &&
    (v.match(/[A-Za-z\u00c0-\u024f]{2,}/g)||[]).length>=7 &&
    /r[ée]seaux|envie|lux|imit|h[ôo]tel|impression|satisfaction/i.test(v);
}
function s09FullTranslation(v) {
  return /(?:把|将|帮我).{0,18}(?:整段|全部|整篇|全文).{0,10}(?:翻译|写成法语)|(?:整段|全文).{0,8}(?:翻译|法语)/i.test(v);
}

async function handle(body,env){
  const s=text(body.message);
  if(!s||s.length>2500)return {error:"请输入1至2500个字符。",status:400};
  const history=lastHistory(body.history);
  let phase=PHASES.includes(body.phase)?body.phase:"topic";
  let language=body.language==="zh"?"zh":"fr";
  let topic=short(body.topic,200);
  let meta=safeMeta(body.meta);
  meta.task=identifyTask(s,meta.task);
  const previousDifficulty=meta.difficulty;
  const previousIntent=meta.previousIntent;
  const studentWork=clearWorkGoal(s);
  if(!meta.goal&&studentWork)meta.goal=studentWork;
  const reply=(fr,zh,newPhase,patch={})=>{
    if(newPhase)phase=newPhase;
    meta=record(meta,patch);
    return outcome(pick(language,fr,zh),phase,language,topic,meta);
  };
  const choice=langRequest(s);
  if(choice){
    language=choice;
    return outcome(pick(language,
      "Bien sûr, nous pouvons continuer en français. Tu n'as pas besoin de recommencer ton travail.",
      "可以，我们用中文继续。前面已经形成的思路会保留，不用重新选题。"),phase,language,topic,meta);
  }

  // A whole-essay request needs targeted help, not a complete model essay.
  // Keep the diagnosed need, regardless of the earlier step shown in the interface.
  if(wantsCompleteDraft(s)){
    if(/[\u3400-\u9fff]/.test(s))language="zh";
    const existingGoal=meta.goal||extractGoal("",history,topic);
    if(existingGoal&&!meta.goal)meta.goal=existingGoal;
    if(meta.difficulty==="example"||phase==="example"){
      const loss=fearFrustration(existingGoal);
      return reply(
        loss?"Tu as déjà une idée et tu cherches un exemple. Restons sur une situation courte : une personne redoute la fin d'un moment heureux au point de ne plus en profiter. Cela illustre d'abord l'inquiétude ; pour parler de frustration, il faudrait préciser ce qui est empêché. À toi de vérifier le lien avec ta thèse.":"Tu as déjà une idée ; nous allons seulement chercher un exemple qui l'éclaire. Choisis une situation précise et repère ce qu'elle montre vraiment, avant de rédiger toi-même.",
        loss?"你已经有观点，当前缺的是例子。先考虑一个短情境：有人担心快乐时刻即将结束，以致无法享受当下。它首先说明的是担忧；如果想论证 frustration，还需要解释究竟什么愿望受到了阻碍。先由你判断是否采用这个例子。":"你已经有观点，我们先只解决例证：选一个具体情境，说明发生了什么、它究竟支持观点中的哪一部分，再由你自己动笔。",
        "example",{difficulty:"example",next:"Choisir et vérifier un exemple",support:1,lastStrategy:"bounded-example-support",previousIntent:"whole-text-request"});
    }
    if(meta.difficulty==="language"){
      return reply(
        "Tu as déjà une idée. Nous allons travailler sur une expression à la fois : indique le sens que tu veux donner, puis essaie de formuler une phrase avec une structure courte.",
        "你已经有想法，先只解决最难表达的一句话。请说清楚原意，我可以提供短语或局部句式，再由你自己组织法语。",
        "writing",{difficulty:"language",next:"Formuler une phrase",support:1,lastStrategy:"local-language-cue",previousIntent:"whole-text-request"});
    }
    if(meta.difficulty==="reasoning"||phase==="review"){
      return reply(
        "Tu as déjà des idées à défendre. Avant de développer ton texte, vérifions ce que ton exemple prouve réellement et ce qui reste une hypothèse. Tu pourras ensuite rédiger une conclusion plus précise.",
        "你已经有论点和例证，先检查它们的关系：哪些属于可观察的事实，哪些只是推断？你可以选择补充依据或限定结论，再继续写作。",
        "review",{difficulty:"reasoning",next:"Vérifier le lien entre fait et conclusion",support:1,lastStrategy:"local-argument-check",previousIntent:"whole-text-request"});
    }
    return reply(
      "Nous pouvons avancer sans rédiger tout le texte : présente la consigne ou une idée déjà préparée, puis nous traiterons une difficulté à la fois.",
      "我们先不生成整篇文章。请告诉我写作要求或已经形成的想法，我们从你最需要帮助的一步开始。",
      phase,{difficulty:"planning",next:"Définir le prochain petit pas",support:1,lastStrategy:"task-diagnosis",previousIntent:"whole-text-request"});
  }

  // S09: honour the student's already-developed idea before offering graded language support.
  const draft09=s09Draft(s,history);
  if(draft09 && (s09Mixed(s)||newNeedLanguage(s)||s09FrenchSentence(s)||
      s09FullTranslation(s)||(previousDifficulty==="language"&&s.length<35))){
    const first=s09Mixed(s)&&s09Topic(s);
    const attempting=s09FrenchSentence(s);
    const support=meta.difficulty==="language"?meta.support:0;
    if(!meta.goal){const z=draft09.match(/[\u3400-\u9fff][\s\S]{35,}/);meta.goal=short(z?z[0]:draft09,190);}
    meta.task="argumenter";
    if(/[\u3400-\u9fff]/.test(s))language="zh";
    if(attempting){
      const result=await generate({text:s,history,phase:"writing",language,goal:meta.goal,
        difficulty:"language",support:0,intent:"check-meaning-and-transfer",meta:
        record(meta,{lastStrategy:"learner-french-attempt"})},env);
      if(result.error)return result;
      return outcome(result.reply,"writing",language,topic,record(meta,{difficulty:"language",
        next:"Réemployer une expression pour présenter l'exemple de l'hôtel",support:0,
        stuck:0,lastStrategy:"transfer-after-feedback",previousIntent:"language-transfer"}),result.mode);
    }
    if(first){
      return reply(
        "Tu as déjà un avis et un exemple : les images d'une vie luxueuse suscitent l'envie ; certaines personnes imitent cette vie pour une satisfaction passagère. Exprimons d'abord la première idée avec « susciter l'envie de » ou « un mode de vie luxueux ». Essaie une phrase, puis nous vérifierons le sens.",
        "你已经写出法语开头，也有完整的中文观点和例子。我们先拆成三层：①社交媒体的奢华生活引发向往；②有人拼团订豪华酒店拍照模仿；③由此得到短暂满足。先尝试第①层，可用 « susciter l'envie de »、« un mode de vie luxueux »，自己写一句法语。",
        "writing",{difficulty:"language",next:"Formuler la première idée en français",support:1,
          lastStrategy:"meaning-split",previousIntent:"language-first-attempt"});
    }
    if(support<2 && !s09FullTranslation(s)){
      return reply(
        "Tu as déjà donné le sens. Voici un début à compléter : « Sur les réseaux sociaux, les images d'un mode de vie luxueux peuvent ... ». Pour dire « éveiller le désir », essaie « susciter l'envie de + infinitif ». Complète cette seule phrase.",
        "不用再解释题目或观点。先借用一个句架：« Sur les réseaux sociaux, les images d'un mode de vie luxueux peuvent ... »。表达“引发向往”可选 « susciter l'envie de + infinitif »。请先补全这一句，不必翻译整段。",
        "writing",{difficulty:"language",next:"Compléter la phrase avec susciter l'envie",support:2,
          lastStrategy:"sentence-frame",previousIntent:"language-guided-attempt"});
    }
    return reply(
      "Voici une phrase modèle courte, pas une traduction de ton paragraphe : « Les images de vies luxueuses sur les réseaux sociaux peuvent susciter l'envie de mener une vie semblable. » Maintenant, réutilise « imiter un mode de vie » ou « donner l'impression de » pour raconter l'exemple de l'hôtel avec tes mots.",
      "这里给一句局部示范，不整段代写：« Les images de vies luxueuses sur les réseaux sociaux peuvent susciter l'envie de mener une vie semblable. » 接着，请自己选择 « imiter un mode de vie » 或 « donner l'impression de »，写出拼团订酒店拍照的细节。这是语言资源向新句子的迁移。",
      "writing",{difficulty:"language",next:"Réemployer l'expression dans l'exemple de l'hôtel",support:3,
        lastStrategy:"model-and-transfer",previousIntent:"language-adaptation"});
  }

  // A student's explicit request is more important than the old phase.
  if(wantsWriting(s)){
    return reply(
      "Tu peux passer à la rédaction à partir de ce que tu as déjà préparé. Écris une ou deux phrases, puis dis-moi quel point tu veux vérifier ; nous n'allons pas recommencer par le choix du sujet.",
      "可以直接根据已有思路开始写。先写一两句，再告诉我想检查什么；不需要重新选题。",
      "writing",{difficulty:"drafting",next:"Rédiger un passage puis le vérifier",support:0,stuck:0,lastStrategy:"draft-in-own-words",previousIntent:"writing"});
  }

  // Explicitly narrowed conclusions are decisions, not new topic proposals (S02 T3).
  if(makesNuance(s)){
    if(studentWork)meta.goal=studentWork;
    const isWork=/(?:avocats|n[ée]gociation|travail exigeant|professionnel|律师|谈判|高强度工作)/i.test(s+" "+history.map(h=>h.content).join(" "));
    return reply(
      isWork?"Tu limites maintenant ta conclusion : un travail exigeant peut apporter de la satisfaction, sans que cela soit vrai de tous les professionnels. Garde cette nuance et vérifie que ton exemple justifie bien cette possibilité ; tu peux ensuite rédiger.":"Tu as limité la portée de ta conclusion. Vérifie maintenant que ton exemple soutient cette version nuancée, puis continue ton texte.",
      isWork?"你已经主动限定结论：高强度工作可能带来满足感，但不能推断所有人都幸福。保留这一限定，检查例证能否支持这种可能性，然后继续写。":"你已经主动限定结论。现在检查例子是否支持调整后的主张，然后继续写作。",
      "review",{difficulty:"reasoning",next:"Conserver la nuance et rédiger",support:0,stuck:0,lastStrategy:"self-limitation",previousIntent:"revision-decision"});
  }

  // Already diagnosing an example: respond to its connection before asking for another (S12 T2/T3).
  if(previousDifficulty==="example" && effortToConnect(s)){
    meta.evidence=short(s,190);
    const vacation=/(?:vacances|假期)/i.test(s+" "+history.map(h=>h.content).join(" "));
    return reply(
      vacation?"Ton exemple montre maintenant une relation précise : tu crains la fin des vacances et cela t'empêche de profiter du moment présent. Il étaye donc l'idée d'une inquiétude liée à la perte possible du bonheur. Si tu conserves « frustration », il faudra préciser ce que cette peur empêche de vivre.":"Tu as expliqué comment la peur d'une perte peut modifier le vécu d'une situation. Précise ce que ton exemple prouve avant d'en tirer une conclusion générale.",
      vacation?"你已经把例子中的因果关系说出来了：担心假期结束，因此无法享受当下。这能支持“害怕失去带来忧虑”，但如果仍用 frustration，需要进一步说明受阻的愿望或体验。":"你已经说明担忧怎样影响具体体验。接下来请判断这段经历实际证明了什么，不要扩大结论。",
      "interpretation",{difficulty:"reasoning",next:"Vérifier la portée de mon exemple",support:0,stuck:0,lastStrategy:"causal-link-check",previousIntent:"evaluate-example"});
  }
  if(previousDifficulty==="example" && needLink(s)){
    meta.evidence=short(s,190);
    const vacation=/(?:vacances|假期)/i.test(s+" "+history.map(h=>h.content).join(" "));
    return reply(
      vacation?"Tu as choisi les vacances comme situation. Pour vérifier le lien avec ton idée, distingue le fait que les vacances se terminent et la crainte de leur fin. En quoi cette crainte pourrait-elle changer la façon de profiter du moment ?":"Tu as déjà un exemple : distingue ce qui s'y passe et ce que tu veux démontrer. Quel détail permet de relier les deux ?",
      vacation?"你已经找到“假期”这个情境。要说明它与论点的关系，关键不是假期会结束，而是“害怕结束”如何影响当下的幸福体验。它具体改变了什么？":"你已经有例子了。请区分其中发生的事实和准备证明的观点：哪个细节能够连接两者？",
      "interpretation",{difficulty:"example",next:"Expliquer le lien entre situation et idée",support:1,stuck:0,lastStrategy:"separate-fact-and-fear",previousIntent:"link-example"});
  }

  // The learner may have an idea but be blocked in French (S09 T1).
  if(newNeedLanguage(s)){
    const alreadyPrecise=namesConsumption(s)||/en fran[cç]ais\s*:\s*["«]/i.test(s);
    if(!alreadyPrecise){
      return reply(
        "Tu as déjà une idée ; le problème semble surtout être la formulation en français. Quelle idée précise veux-tu exprimer ? Tu peux d'abord me l'expliquer avec tes propres mots, même en chinois.",
        "你已经有想法了，困难主要在法语表达。先用自己的话说明想表达的准确意思，也可以暂时用中文；我会据此提供适量的语言线索。",
        "writing",{difficulty:"language",next:"Préciser le sens avant de formuler",support:0,stuck:0,lastStrategy:"meaning-first",previousIntent:"language-clarification"});
    }
    meta.difficulty="language";
  }

  // After the learner clarifies their meaning, recall one useful expression without writing a whole paragraph (S09 T2).
  if((previousDifficulty==="language"||meta.difficulty==="language") && namesConsumption(s) && !hasLanguageAttempt(s)){
    const hotels=/(?:photos d.h[ôo]tels|酒店照片)/i.test(s+" "+history.map(h=>h.content).join(" "));
    return reply(
      "Pour exprimer cette influence, la tournure « être poussé(e) à consommer » peut convenir. Essaie de l'intégrer toi-même dans une phrase "+(hotels?"sur les photos d'hôtels":"adaptée à ton contexte")+" ; nous vérifierons ensuite si elle traduit bien ton idée.",
      "可以考虑使用 « être poussé(e) à consommer » 表达受到消费刺激。请你先自己把它放进"+(hotels?"描述酒店照片":"当前情境")+"的法语句子中，我们再检查是否忠于原意。",
      "writing",{difficulty:"language",next:"Essayer une phrase avec l'expression",support:1,stuck:0,lastStrategy:"phrase-cue",previousIntent:"language-practice"});
  }
  if(previousDifficulty==="language" && hasLanguageAttempt(s)){
    return reply(
      "Ta phrase exprime bien une incitation à consommer. Tu as reformulé toi-même l'idée de départ. Quel point de vue veux-tu maintenant appuyer grâce à cette observation ?",
      "你已经自己写出了表达消费诱导的句子，基本保留了原意。这个观察准备支持你的哪个观点？",
      "review",{difficulty:"reasoning",next:"Relier l'observation à mon idée",support:0,stuck:0,lastStrategy:"transfer-then-connect",previousIntent:"language-transfer-complete"});
  }

  // Relevance checks take priority over routine prompts to choose a topic (S02 T1).
  if(wantsReview(s)||needLink(s)){
    const hasExample=/\bmon exemple\b|avocats|n[ée]goci|律师|谈判|vacances|假期/i.test(s);
    if(hasExample){
      meta.evidence=short(s,190);
      const lawyers=/(?:avocats|n[ée]gociation|律师|谈判)/i.test(s+" "+history.map(h=>h.content).join(" "));
      return reply(
        lawyers?"Tu as déjà une idée et un exemple. Pour évaluer sa pertinence, distingue ce qu'on observe et ce qu'on en déduit : négocier sous pression ne prouve pas à lui seul qu'on éprouve du bonheur. Quel indice permettrait d'étayer ce sentiment de satisfaction ?":"Tu as déjà un exemple : distingue le fait que tu décris et la conclusion que tu veux en tirer. Quel détail permet de soutenir cette conclusion ?",
        lawyers?"你已经有观点和例子。判断它是否恰当，要区分可观察的工作事实与“他们因此感到幸福”的推断。有什么依据能够支持后一种感受？":"你已经有例子了。请区分实际事实和准备得出的结论，再判断哪个细节可以支持这一结论。",
        "review",{difficulty:"reasoning",next:"Vérifier ce que prouve l'exemple",support:0,stuck:0,lastStrategy:"fact-versus-inference",previousIntent:"argument-check"});
    }
    return reply(
      "Pour vérifier ton argument, précise d'abord ce que ton exemple montre réellement, puis compare-le à la conclusion que tu veux défendre. Quel lien souhaites-tu examiner ?",
      "先区分例子实际说明的事实与自己希望得出的结论，再检查两者之间是否存在推理缺口。你想检验哪一个联系？",
      "review",{difficulty:"reasoning",next:"Vérifier la relation entre fait et conclusion",support:0,stuck:0,lastStrategy:"argument-check",previousIntent:"argument-check"});
  }

  // An existing example does not become a proof simply because it includes an optimistic possibility (S02 T2).
  if(previousDifficulty==="reasoning" && /peuvent|pourraient|可能|可以/.test(s) &&
     /fier|fiert[ée]|satisfaction|heureux|bonheur|满足|自豪|幸福/i.test(s)){
    meta.evidence=short(s,190);
    const lawyers=/(?:avocats|n[ée]gociation|律师|谈判)/i.test(s+" "+history.map(h=>h.content).join(" "));
    return reply(
      lawyers?"« Peuvent être fiers » indique une possibilité, et non un sentiment constaté chez tous les avocats. Tu peux conserver cette hypothèse en limitant ta conclusion, ou préciser ce qui pourrait la rendre plausible.":"« Peuvent » exprime une possibilité et non une preuve. Tu peux nuancer ta conclusion ou chercher un indice qui rende cette hypothèse plausible.",
      lawyers?"“可能感到自豪”表达的是一种可能性，并不是已被证实的幸福感。你可以适当限定结论，也可以补充使这种推断成立的依据。":"“可能”表示一种假设，不等于证据。可以限定结论，也可以补充支持该推断的事实。",
      "review",{difficulty:"reasoning",next:"Limiter ma conclusion ou étayer l'hypothèse",support:0,stuck:0,lastStrategy:"fact-versus-hypothesis",previousIntent:"revise-inference"});
  }

  // Example search: start from the learner's claim; increase support only if the first hint fails.
  if(noExample(s)||askExample(s)){
    const wanted=askExample(s);
    meta.goal=meta.goal||extractGoal(s,history,topic);
    const level=previousDifficulty==="example"?Math.min(3,meta.support+1):(wanted?2:0);
    if(!meta.goal){
      return reply("Pour t'aider, j'ai besoin de la phrase ou de l'idée que cet exemple doit illustrer. Tu peux la copier ici.",
        "请给出这个例子需要说明的具体观点，我会从你已有的内容出发。",
        "example",{difficulty:"example",next:"Préciser l'idée à illustrer",support:0,stuck:0,lastStrategy:"clarify-goal",previousIntent:"need-example"});
    }
    const fear=fearFrustration(meta.goal+" "+s);
    if(level>=2 && !fear){
      const m=record(meta,{difficulty:"example",next:"Adapter un exemple à mon idée",support:level,stuck:0,lastStrategy:"concrete-example",previousIntent:"example-support"});
      const generated=await generate({text:s,history,phase:"example",language,goal:m.goal||topic,
        difficulty:"example",support:level,intent:"concrete-example",meta:m},env);
      if(generated.error)return generated;
      return outcome(generated.reply,"example",language,topic,m,"glm");
    }
    if(level>=2){
      return reply("Voici un cas possible à adapter : une personne attend un moment heureux, mais redoute tellement qu'il se termine qu'elle n'arrive plus à en profiter. Ce cas montre l'inquiétude liée à la perte possible, pas automatiquement la frustration.",
        "可以考虑这个假设情境：某人期待一段快乐时光，却担心它会结束，反而不能好好享受。它体现的是担忧，不能自动证明 frustration。",
        "example",{difficulty:"example",next:"Adapter et vérifier un exemple",support:level,stuck:0,lastStrategy:"concrete-example",previousIntent:"example-support"});
    }
    return reply(
      fear?"Tu as déjà une idée ; le blocage concerne l'exemple. Cherche un moment où la crainte de perdre quelque chose de précieux empêche de profiter du présent. Quelle situation te vient à l'esprit ?":"Tu as déjà une idée ; le blocage concerne l'exemple. Cherche une situation concrète où l'on peut observer le mécanisme que tu décris. Quel fait le montrerait ?",
      fear?"你已有观点，困难在找例子。试着找一个因担心失去而影响当下体验的具体情境。有什么观察？":"你已有观点，困难在找例子。试着找一个能体现你所说机制的具体情境，有什么可观察的事实？",
      "example",{difficulty:"example",next:"Trouver un cas pertinent",support:0,stuck:0,lastStrategy:"situation-search",previousIntent:"need-example"});
  }
  // Follow-ups must respect the student's current difficulty even if the old stage was 'topic'.
  if(previousDifficulty==="example" && preexistingStudentWork(s)){
    meta.evidence=short(s,190);
    return reply(
      "Tu as maintenant une situation à utiliser. Pour vérifier sa pertinence, repère le détail qui soutient réellement ton idée et celui qui reste à expliquer ; nous pouvons ensuite passer à la rédaction.",
      "你已经提出一个具体情境。接下来只检查它的哪个细节真正支持论点、哪个环节还需要解释，然后就可以写作。",
      "interpretation",{difficulty:"reasoning",next:"Relier mon exemple à mon idée",support:0,stuck:0,lastStrategy:"relevance-check",previousIntent:"example-proposed"});
  }
  if(previousDifficulty==="language" && s.length>12){
    const next=await generate({text:s,history,phase:"writing",language,goal:meta.goal||topic,
      difficulty:"language",support:meta.support,intent:"vocab",meta},env);
    if(next.error)return next;
    return outcome(next.reply,"writing",language,topic,record(meta,{difficulty:"language",next:"Essayer une formulation adaptée",previousIntent:"language-feedback"}),"glm");
  }
  if(previousDifficulty==="reasoning" && s.length>12){
    return reply(
      "Tu as précisé ton raisonnement. Pour avancer, conserve ce qui est effectivement étayé par ton exemple et limite ce qui reste une hypothèse. Tu peux maintenant essayer une formulation plus précise.",
      "你已经补充了论证思路。请保留例子真正支持的部分，对尚未证实的推断作限定，然后尝试写出更准确的句子。",
      "review",{difficulty:"reasoning",next:"Reformuler avec une conclusion proportionnée",support:0,stuck:0,lastStrategy:"evidence-scope",previousIntent:"reasoning-continuation"});
  }

  // A ready draft or a task statement is not the same as having no idea.
  if(/^j.ai d[ée]j[àa] un brouillon[.!? ]*$/i.test(s)){
    return reply("Tu peux coller ton brouillon ici et préciser le point que tu voudrais travailler.","请把初稿贴出来，并说明最希望先检查什么。","topic",
      {difficulty:"planning",next:"Partager le brouillon et préciser le besoin",support:0,stuck:0,lastStrategy:"task-first",previousIntent:"ask-draft"});
  }
  if(isDraft(s)||/我已经写好|已有初稿/i.test(s)){
    return reply(
      "Tu as déjà un texte sur lequel travailler. Souhaites-tu examiner d'abord l'organisation des idées, la pertinence d'un argument ou une difficulté de formulation ?",
      "你已经有初稿，不需要回到选题。可以先从结构、论证或语言表达中选择一个最希望解决的问题。",
      "review",{difficulty:"drafting",next:"Choisir une priorité de révision",support:0,stuck:0,lastStrategy:"draft-diagnosis",previousIntent:"draft-review"});
  }
  if(/je voudrais commencer un texte|j.ai d[ée]j[àa] un brouillon|je bloque sur une id[ée]e ou une formulation/i.test(s)||
    /^je veux [ée]crire|^comment commencer|^我想开始写/i.test(s)){
    return reply(
      "D'accord. Présente-moi la consigne de ton travail ou une idée que tu as déjà, puis indique ce qui te pose problème. Nous commencerons à l'endroit utile pour toi.",
      "好的。请告诉我当前的写作题目或已经有的想法，以及你最需要帮助的地方。我们直接从那里开始。",
      "topic",{difficulty:"planning",next:"Préciser la tâche et le besoin",support:0,stuck:0,lastStrategy:"task-first",previousIntent:"clarify-task"});
  }
  if(isOpinion(s)||preexistingStudentWork(s)){
    if(!meta.goal)meta.goal=short(s,190);
    return reply(
      "Tu as déjà posé une idée. Pour avancer sans tout recommencer, souhaites-tu travailler surtout sa justification, un exemple qui la soutienne ou sa formulation en français ?",
      "你已经提出了想法。接下来可以聚焦理由、例证或法语表达。你目前最需要解决哪一项？",
      "position",{difficulty:"planning",next:"Choisir l'aide utile à mon idée",support:0,stuck:0,lastStrategy:"need-diagnosis",previousIntent:"clarify-need"});
  }
  if(!meta.goal&&!meta.task){
    return reply(
      "Je peux t'aider à préparer, rédiger ou réviser ton texte. Quelle est ta consigne ou la difficulté que tu rencontres actuellement ?",
      "我可以帮助你构思、起草或修改法语文本。你现在的写作任务是什么，或者遇到了什么具体困难？",
      "topic",{difficulty:"planning",next:"Identifier le travail et le blocage",support:0,stuck:0,lastStrategy:"task-first",previousIntent:"clarify-task"});
  }
  const generated=await generate({text:s,history,phase,language,goal:meta.goal||topic,difficulty:meta.difficulty||"planning",support:meta.support,intent:"contextual-support",meta},env);
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
