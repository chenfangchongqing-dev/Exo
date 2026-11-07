// Run with Node.js 20+: node tests/regression.mjs
// These are deterministic server tests with mocked GLM replies, not an online model assessment.
import assert from "node:assert/strict";
import agent from "../handler.mjs";

let modelCalls=0;
let nextModelReply="Une personne redoute la fin d'une soirée agréable. Cela peut illustrer l'inquiétude.";
const realFetch=globalThis.fetch;
globalThis.fetch=async (_url, _options)=>{
  modelCalls++;
  return new Response(JSON.stringify({choices:[{message:{content:nextModelReply}}]}),{
    status:200,headers:{"Content-Type":"application/json"}
  });
};
const origin="https://chenfangchongqing-dev.github.io";
const code="private-test-code-12345";
const env={
  ALLOWED_ORIGIN:origin,
  CLASS_ACCESS_CODE:code,
  GLM_API_KEY:"MOCK-KEY-NOT-REAL",
  GLM_MODEL:"glm-4.7-flash",
  REQUEST_LIMITER:{limit:async()=>({success:true})}
};
async function ask(body){
  const request=new Request("https://sample.invalid/chat",{
    method:"POST",headers:{"Origin":origin,"X-Class-Code":code,"Content-Type":"application/json"},
    body:JSON.stringify({phase:"topic",language:"fr",history:[],meta:{},...body})
  });
  const response=await agent.fetch(request,env);
  const result=await response.json();
  assert.equal(response.status,200,JSON.stringify(result));
  return result;
}
function shortResponse(r){
  assert.equal(typeof r.reply,"string");
  assert.ok(r.reply.length<650,"Answer should be brief, not an essay");
  assert.ok(!/\*\*Introduction\b/i.test(r.reply),"Should never emit an essay introduction");
}
try{
  const s12=await ask({message:"Je pense que le bonheur peut devenir une source de frustration, mais je ne trouve pas d’exemple."});
  assert.equal(s12.meta.difficulty,"example");
  shortResponse(s12);

  const s09=await ask({message:"J’ai une idée sur les photos d’hôtels de luxe sur les réseaux sociaux, mais je bloque en français."});
  assert.equal(s09.meta.difficulty,"language");
  shortResponse(s09);

  const s02=await ask({message:"Je pense que le stress peut coexister avec le bonheur. Mon exemple : des avocats qui négocient en Afrique. Est-ce pertinent ?"});
  assert.equal(s02.meta.difficulty,"reasoning");
  shortResponse(s02);

  const before=modelCalls;
  const complete=await ask({message:"你直接帮我写一篇嘛",phase:"example",meta:{
    goal:"Je pense que le bonheur peut devenir une source de frustration",difficulty:"example",support:1
  }});
  assert.equal(complete.language,"zh");
  assert.equal(complete.phase,"example");
  assert.ok(complete.reply.includes("frustration"));
  shortResponse(complete);
  assert.equal(modelCalls,before,"A full essay request must not reach the model");

  const french=await ask({message:"Rédige une rédaction complète à ma place.",phase:"writing",meta:{
    difficulty:"language",goal:"Le bonheur est complexe",task:"argumenter"
  }});
  assert.equal(french.phase,"writing");
  shortResponse(french);
  assert.equal(modelCalls,before,"French full-essay request must not reach GLM");

  const example=await ask({message:"Donne-moi un exemple concret.",phase:"example",meta:{
    goal:"Le travail peut apporter de la satisfaction",difficulty:"example"
  }});
  shortResponse(example);
  assert.equal(modelCalls,before+1,"A request for one concrete example must remain allowed");
  assert.equal(example.reply,nextModelReply);

  nextModelReply="---\n\n**Introduction :**\nLe bonheur semble merveilleux et inspire de grandes ambitions.\n\n**Exemple :**\nPrenons le cas d'un personnage inventé qui gagne beaucoup d'argent et vit dans le luxe.\n\n**Conclusion :**\nLe bonheur est un phénomène complexe.";
  const guarded=await ask({message:"Merci, je voudrais approfondir ce point.",phase:"writing",meta:{
    goal:"La vie peut être stressante",task:"argumenter",difficulty:"drafting"
  }});
  shortResponse(guarded);
  assert.ok(!guarded.reply.includes("Le bonheur semble merveilleux"));
  assert.equal(modelCalls,before+2,"Output checks apply after the model call");

  const notEssay=await ask({message:"Je dois rédiger une rédaction pour demain, mais je n’ai pas d’exemple."});
  assert.equal(notEssay.meta.difficulty,"example","Describing an assignment must not be treated as demanding an essay");


  // Reproduce the classroom screenshot: a developed Chinese argument, then two
  // increasingly explicit requests for French formulation support.
  const mixedS09="On entend souvent dire que la course sans fin au bonheur matériel. Pour ma part, je pense que c’est vrai. Il y a objets luxuriante dont on peut jouir et nous pouvons les voir sur les réseaux sociaux, donc nous ne pouvons pas restreindre\n我们因为看到别人分享出来的更高品质的生活而无法遏制自己的向往和贪欲。比如，有许多人拼团订一间豪华酒店的房间，轮流拍照以模仿那些真正有能力承担这种生活的人。这样的例子展示出人对物质生活的追求是无法停止的。";
  const first09=await ask({message:mixedS09});
  assert.equal(first09.phase,"writing");
  assert.equal(first09.meta.difficulty,"language");
  assert.equal(first09.meta.support,1);
  assert.ok(first09.reply.includes("susciter l'envie"));
  const h1=[{role:"user",text:mixedS09},{role:"bot",text:first09.reply}];
  const second09=await ask({message:"不知道法语要怎么写？",
    language:first09.language,phase:first09.phase,meta:first09.meta,history:h1});
  assert.equal(second09.meta.difficulty,"language");
  assert.equal(second09.meta.support,2);
  assert.ok(second09.reply.includes("句架"));
  const h2=[...h1,{role:"user",text:"不知道法语要怎么写？"},{role:"bot",text:second09.reply}];
  const third09=await ask({message:"不会写法语",language:second09.language,
    phase:second09.phase,meta:second09.meta,history:h2});
  assert.equal(third09.meta.support,3);
  assert.ok(third09.reply.includes("局部示范"));
  assert.ok(third09.reply.includes("迁移"));
  const h3=[...h2,{role:"user",text:"不会写法语"},{role:"bot",text:third09.reply}];
  const beforeTransfer=modelCalls;
  const transferred=await ask({message:"Les réseaux sociaux suscitent l'envie de mener une vie plus luxueuse.",
    language:third09.language,phase:third09.phase,meta:third09.meta,history:h3});
  assert.equal(transferred.phase,"writing");
  assert.equal(transferred.meta.previousIntent,"language-transfer");
  assert.equal(modelCalls,beforeTransfer+1,
    "Learner-authored French must be sent to GLM for genuine contextual feedback");
  console.log("PASS S09 escalation: mixed draft -> sentence frame -> short model -> learner transfer (model mocked)");
  console.log("PASS 8 model-mocked scenarios: S12, S09, S02, full Chinese/French essay requests, limited example, guard, assignment description");
}finally{
  globalThis.fetch=realFetch;
}
