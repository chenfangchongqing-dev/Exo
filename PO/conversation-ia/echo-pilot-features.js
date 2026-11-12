/* Écho · shared optional transcription + metacognitive toolbox.
   Used by BOTH the student pilot and the teacher WebRTC debugging page.
   WebRTC media and SDP exchange remain unchanged.
   Model events are delivered via existing oai-events DataChannel.
   No transcript or toolbox is sent to any extra external endpoint.
*/
(function(root){
 "use strict";
 const EXTRA_RULES=[
   "",
   "RÉCAPITULATIF ORAL ET BOÎTE À OUTILS",
   "Si l'apprenant demande explicitement un bilan, une récapitulation ou une boîte à outils, prépare une boîte à outils personnalisée en appelant l'outil publish_language_toolbox une fois dans cette séquence.",
   "L'outil doit produire de 3 à 6 expressions, collocations ou structures réellement utiles pour les propos de l'apprenant : expression française, rôle dans son idée, exemple français court, catégorie, origine.",
   "Ne marque deja_utilisee que lorsqu'une expression a réellement été prononcée par l'apprenant. Une suggestion, une correction ou une expression prononcée uniquement par Écho doit être marquée a_reemployer.",
   "Ne fabrique jamais de citation, d'erreur attribuée à l'apprenant, de diagnostic CECRL ou d'appréciation infondée. Si le dialogue a été trop bref, reste prudent.",
   "Après l'appel de l'outil et son résultat, poursuis avec un bilan ORAL court : commence par demander à l'apprenant ce qui lui a semblé facile ou difficile, puis propose une réussite observable et une stratégie concrète. Ne lis pas à haute voix toute la boîte à outils affichée sur la page.",
   "N'appelle pas l'outil pendant une conversation ordinaire si aucun bilan n'a été demandé. L'apprenant est libre de refuser le bilan."
 ].join("\n");

 function create(options){
   const opt=options||{};
   const captions=root.ECHO_TRANSCRIPTION?.create?.()||null;
   const toolbox=root.ECHO_TOOLBOX?.create?.()||null;
   const pending=[];
   const handled=new Set();
   let toolCount=0;
   const MAX_TOOL_CALLS_PER_SESSION=4;

   function logger(msg){
     if(typeof opt.log==="function")try{opt.log(msg);}catch{}
   }
   function configure(instructions){
     return {
       input_audio_transcription:{model:"qwen3-asr-flash-realtime"},
       instructions:String(instructions||"")+"\n"+EXTRA_RULES,
       tools:toolbox ? [root.ECHO_TOOLBOX.definition] : []
     };
   }
   function reset(){
     pending.length=0;handled.clear();toolCount=0;
     captions?.reset?.();
     toolbox?.clear?.();
   }
   function finish(){
     captions?.finish?.();
     if(pending.length>0){pending.length=0;toolbox?.setUnavailable?.();}
   }
   function send(session,body){
     const ch=session?.eventChannel;
     if(!session||session.stopped||!ch||ch.readyState!=="open")return false;
     ch.send(JSON.stringify(body));
     return true;
   }
   function processToolCalls(session){
     if(!pending.length||session.stopped)return false;
     let processed=0;
     while(pending.length && processed<MAX_TOOL_CALLS_PER_SESSION){
       const call=pending.shift();
       if(!call||handled.has(call.call_id))continue;
       handled.add(call.call_id);processed++;
       let ok=false;
       if(call.name==="publish_language_toolbox" && toolbox && toolCount<MAX_TOOL_CALLS_PER_SESSION){
         toolCount++;
         try{
           const parsed=JSON.parse(call.arguments||"{}");
           const observed=captions?.getStudentTranscript?.()||"";
           ok=toolbox.receive(parsed,observed);
           logger(ok?"Boîte à outils personnalisée affichée":"Boîte à outils reçue, mais données insuffisantes");
         }catch(e){
           logger("Boîte à outils : paramètres non valides");
           toolbox?.setUnavailable?.();
         }
       }
       const output=JSON.stringify({
         success:ok,
         displayed:ok,
         information:ok
           ?"La boîte à outils est affichée sur la page. Fais maintenant le bilan oral sans lire la liste."
           :"L'outil n'a pas pu afficher de ressources pertinentes. Donne un bilan oral prudent."
       });
       const sent=send(session,{
         event_id:"event_"+crypto.randomUUID(),
         type:"conversation.item.create",
         item:{type:"function_call_output",call_id:call.call_id,output}
       });
       if(!sent){toolbox?.setUnavailable?.();return false}
     }
     if(processed>0){
       const continued=send(session,{
         event_id:"event_"+crypto.randomUUID(),
         type:"response.create",
         response:{modalities:["text","audio"]}
       });
       if(continued){
         logger("Le modèle reprend le bilan oral après l'outil");
         if(typeof opt.onBilanContinue==="function")try{opt.onBilanContinue();}catch{}
       }
       return continued;
     }
     return false;
   }
   function onEvent(session,message){
     if(!session||session.stopped||!message)return false;
     try{captions?.onEvent?.(message);}catch{}
     switch(message.type){
       case "response.function_call_arguments.done":{
         const callId=String(message.call_id||"");
         if(!callId||handled.has(callId)||pending.some(x=>x.call_id===callId))return true;
         pending.push({
           call_id:callId,
           name:String(message.name||""),
           arguments:String(message.arguments||"").slice(0,150000)
         });
         toolbox?.waiting?.();
         logger("Appel de l'outil : "+String(message.name||"inconnu"));
         return true;
       }
       case "response.done":
         if(pending.length>0)return processToolCalls(session);
         return false;
       default:
         return false;
     }
   }
   return Object.freeze({configure,reset,finish,onEvent,transcript:captions,toolbox});
 }
 root.ECHO_PILOT_FEATURES=Object.freeze({create,version:"2026-11-13.1"});
})(typeof window!=="undefined"?window:globalThis);
