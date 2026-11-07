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

  console.log("PASS 8 model-mocked scenarios: S12, S09, S02, full Chinese/French essay requests, limited example, guard, assignment description");
}finally{
  globalThis.fetch=realFetch;
}
