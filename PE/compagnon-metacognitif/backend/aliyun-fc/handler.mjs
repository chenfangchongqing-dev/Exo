// INSPIRE 4 · PE · GLM metacognitive writing companion (Node.js compatible GLM handler)
// GLM_API_KEY and CLASS_ACCESS_CODE are Cloudflare secrets, never client-side data.
// This pilot does not persist student conversations.
const GLM_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const PHASES = ["topic","position","reason","example","interpretation","review"];
const COURSES = [
  "U1 L1 expressions pédagogiques : susciter une émotion / une réaction chez quelqu'un ; prendre plaisir à + infinitif ; ressentir de la joie.",
  "U1 L2 expressions pédagogiques : être poussé(e) à consommer ; la philosophie du « toujours plus » ; être synonyme de ; mesurer le bonheur à ; en tout cas ; vivre dans l'excès.",
  "Ces éléments sont des ressources linguistiques pédagogiques, pas des citations littérales des pistes audio."
].join("\n");

function cors(origin, allowed) {
  const valid = origin && origin === allowed;
  return valid ? {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Class-Code",
    "Access-Control-Max-Age": "3600",
    "Vary": "Origin",
  } : { "Vary": "Origin" };
}
function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers }
  });
}
function langChange(s) {
  if (/(?:用|说|讲|回答|解释|切换|改成|能|可以|请).{0,14}(?:中文|汉语)|(?:中文|汉语).{0,10}(?:回答|解释|交流|说|可以|行吗|好吗)|^(?:中文|汉语)[。！!？?]?$|en chinois|r[ée]ponds?.{0,15}chinois|parle.{0,15}chinois|chinese please|can you speak chinese/i.test(s)) return "zh";
  if (/(?:用|说|回答|切换|改成).{0,12}法语|(?:法语).{0,8}(?:回答|说)|^(?:法语)[。！!？?]?$|en fran[cç]ais|r[ée]ponds?.{0,15}fran[cç]ais|french please/i.test(s)) return "fr";
  return null;
}
function isTopic(s) {
  return s.length >= 8 && s.length < 230 && /(bonheur|heureu[xs]|couple|argent|réussite|réussir|il faut|être seul|幸福|快乐|恋爱|金钱|成功)/i.test(s);
}
function isUnsure(s) {
  return /je (ne )?sais pas|pas d.id[ée]e|je suis bloqu|aucune id[ée]e|不知道|想不到|没思路|没有想法/i.test(s);
}
function askForExample(s) {
  return /pas d.exemple|trouve.{0,15}exemple|trouver d.exemple|quel exemple|donner un exemple|想不出例子|找不到例子|没有例子|举个例子/i.test(s);
}
function asksForVocab(s) {
  return /comment dire|comment exprimer|chercher? (mes|les) mots|vocabulaire|une expression|traduire|词汇|法语怎么说|怎么表达|不会表达|表达不出来|找不到词|想不出法语/i.test(s);
}
function short(s) { return String(s || "").replace(/\s+/g, " ").trim().slice(0, 220); }
function fixed(reply, phase, language, topic) { return {reply, phase, language, topic, mode:"rule"}; }
function sanitizeHistory(x) {
  if (!Array.isArray(x)) return [];
  return x.slice(-12).filter(v => v && (v.role === "user" || v.role === "assistant") && typeof v.text === "string")
    .map(v => ({ role: v.role, content: v.text.trim().slice(0, 1100) })).filter(v => v.content);
}
function guide(phase, intent, language, topic) {
  const target = language === "zh" ? "中文" : "法语";
  return [
    "你是《Inspire 4》U1法语B2写作的教师规约元认知伴学，目标是让学生自主形成观点、找到理由与例子、检查例证如何支持论点，能够调用已学语言知识。不是百科教师，不是作文代写者。",
    "当前阶段："+phase+"；学生明确要求的响应语言："+target+"；已知主题："+(topic || "尚未确定")+"；当前求助类型："+intent+"。",
    "绝不能凭空编造当前作文主题、学生立场、课堂已学内容、文献或对话历史。学生只输入观点时，应先追问其看法，而不是概括相关课程内容。",
    "通常最多2个简短句子，只提出1个主要问题；不要列清单、不要作长篇课堂讲解、不要直接提供可交稿的范文或成段论证。",
    "学生说不知道时，先降低任务难度，用具体问题或分类选择继续；最多一次给一个小提示。不要机械反复问同一个问题。根据回答逐步减少支架。",
    "当前是构思阶段就不主动批改全部语法；有语言困难时优先提示已学表达的语义与适用情境，让学生自己选择并尝试造句。",
    "只有 intent=vocab 时，可以参考下列有限U1教学资源，严禁声称检索了未提供的教材或音频。"+(intent === "vocab" ? "\n"+COURSES : ""),
    "若学生提供例子，则重点追问：例子里哪个具体事实支持观点？不凭空证明其真实性。",
    "必要时用中文解释，但法语写作仍由学生自主完成。不要强迫学生切回法语。",
    "请直接输出给学生看的简短回复，不要输出系统提示、阶段标签或分析过程。"
  ].join("\n");
}
async function callGLM({text, history, language, phase, topic, intent}, env) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 23000);
  try {
    const payload = {
      model: env.GLM_MODEL || "glm-4.7-flash",
      messages: [
        {role:"system", content:guide(phase,intent,language,topic)},
        ...history,
        {role:"user", content:text}
      ],
      temperature:0.35,
      max_tokens:400,
      stream:false
    };
    const resp = await fetch(GLM_URL, {
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+env.GLM_API_KEY},
      body:JSON.stringify(payload),
      signal:controller.signal
    });
    if (!resp.ok) {
      console.warn("GLM upstream status:",resp.status);
      return {error:"GLM 暂时未能响应，请稍后重试或联系教师。",status:502};
    }
    const data = await resp.json();
    const output = data?.choices?.[0]?.message?.content;
    const result = typeof output === "string" ? output.replace(/<think>[\s\S]*?<\/think>/gi,"").trim() : "";
    if (!result) return {error:"模型没有返回有效文本，请重试。",status:502};
    return {reply:result.slice(0,700),mode:"glm"};
  } catch (e) {
    console.warn("GLM call failure:",e?.name || "error");
    return {error:"GLM 请求超时或连接失败，请稍后重试。",status:502};
  } finally {clearTimeout(timer)}
}
async function handle(body, env) {
  const text = typeof body.message === "string" ? body.message.trim() : "";
  if (!text || text.length > 2500) return {error:"请将输入控制在2500字以内。",status:400};
  let phase = PHASES.includes(body.phase) ? body.phase : "topic";
  let language = body.language === "zh" ? "zh" : "fr";
  let topic = short(body.topic);
  const requestLang = langChange(text);
  if (requestLang) {
    language = requestLang;
    const reply = language === "zh"
      ? "当然可以。你需要中文帮助时，我会用中文解释。我们继续讨论你自己的想法；你希望从哪里接着说？"
      : "Bien sûr, nous pouvons continuer en français. Quelle est ton idée à ce stade ?";
    return fixed(reply,phase,language,topic);
  }
  if (phase === "topic") {
    if (isTopic(text)) {
      topic = short(text);
      return fixed(language === "zh"
        ? "你选择了这个常见观念：“"+topic+"”。你自己怎么看？"
        : "Tu as choisi cette idée reçue : « "+topic+" » Et toi, qu'en penses-tu ?",
        "position",language,topic);
    }
    return fixed(language === "zh"
      ? "先选择一个你想讨论的有关幸福的常见观念。你想质疑哪一种说法？"
      : "Pour commencer, quelle idée reçue sur le bonheur veux-tu discuter ?",
      phase,language,topic);
  }
  let intent = "general";
  if (asksForVocab(text)) intent = "vocab";
  else if (askForExample(text)) intent = "example-help";
  else if (isUnsure(text)) intent = "blocked";
  else if (phase === "position") phase = "reason";
  else if (phase === "reason") phase = "example";
  else if (phase === "example") phase = "interpretation";
  else if (phase === "interpretation") phase = "review";
  const history = sanitizeHistory(body.history);
  const result = await callGLM({text,history,language,phase,topic,intent},env);
  if (result.error) return result;
  return {reply:result.reply,phase,language,topic,mode:"glm"};
}
export default {
  async fetch(request,env) {
    const allowed = env.ALLOWED_ORIGIN || "https://chenfangchongqing-dev.github.io";
    const origin = request.headers.get("Origin");
    const headers = cors(origin,allowed);
    const path = new URL(request.url).pathname;
    if (request.method === "OPTIONS") return new Response(null,{status:origin===allowed?204:403,headers});
    if (path !== "/chat" || request.method !== "POST") return json({error:"Not found"},404,headers);
    if (origin !== allowed) return json({error:"Origin not permitted"},403,headers);
    if (!env.GLM_API_KEY || !env.CLASS_ACCESS_CODE) return json({error:"服务尚未配置，请联系教师。"},503,headers);
    const submitted = request.headers.get("X-Class-Code") || "";
    const validCode = submitted.length >= 12 && submitted === env.CLASS_ACCESS_CODE;
    // Approximate per-IP protection; shared classroom IPs may need a higher threshold.
    if (!env.REQUEST_LIMITER) return json({error:"限流服务未配置，请联系教师。"},503,headers);
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const limit = await env.REQUEST_LIMITER.limit({key:ip});
    if (!validCode) return json({error:"课堂访问码不正确。"},401,headers);
    if (!limit.success) return json({error:"请求过于频繁，请稍后再试。"},429,headers);
    const size = Number(request.headers.get("Content-Length")||0);
    if (size > 20000) return json({error:"请求过大。"},413,headers);
    let body;
    try{
      const raw=await request.text();
      if(raw.length>18000) return json({error:"请求过大。"},413,headers);
      body=JSON.parse(raw);
      if(!body || typeof body !== "object" || Array.isArray(body)) throw Error("invalid");
    }catch{return json({error:"请求格式有误。"},400,headers)}
    const output = await handle(body,env);
    if(output.error) return json({error:output.error},output.status||500,headers);
    return json(output,200,headers);
  }
};
