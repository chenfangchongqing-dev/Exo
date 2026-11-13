/* Écho — shared features for the student pilot and teacher debugging page.
   WebRTC and the teacher's existing SDP relay stay unchanged.
   Controls and AI captions flow over the oai-events DataChannel.
   Continuous ASR is disabled. The Faire le point button initiates the bilan directly.
   No extra transcript storage, external post-call model, or embedded API key.
*/
(function(root){
 "use strict";
 const TRIGGER="Écho, on fait le point ?";
 const PROMPT=[
   "",
   "BILAN MÉTACOGNITIF — DÉCLENCHEUR UNIQUE",
   "Deux moyens équivalents de demander le bilan : la demande ORALE « Écho, on fait le point ? » pendant la conversation, ou le bouton « Faire le point » sur la page.",
   "Écoute et comprends directement la demande orale dans le flux audio de la conversation, même si la transcription ASR continue est désactivée. Dès que l'apprenant dit « Écho, on fait le point ? », appelle l'outil publish_language_toolbox, puis réalise le bref bilan oral. Ne demande pas de consigne supplémentaire.",
   "Si l'apprenant utilise la phrase dans une discussion sur les expressions françaises sans demander un bilan, vérifie brièvement son intention avant de déclencher l'outil.",
   "Retiens 3 à 6 ressources réellement utiles au regard de ce qu'il a essayé d'exprimer : vocabulaire thématique, collocations, expressions ou structures adaptées, avec un exemple de réemploi relié à ses propos.",
   "Si l'apprenant a exprimé une généralisation ou une opinion trop absolue et qu'une nuance a été travaillée pendant l'échange, tu peux proposer dans la boîte à outils une formulation réutilisable (« dans certains cas », « cela dépend », « il faut distinguer »), avec un exemple fidèle à sa pensée. N'attribue jamais une opinion, une faute ou un progrès qui n'a pas été observé. Le bilan n'est ni une leçon morale ni une note sur ses convictions.",
   "Tu ne dois marquer deja_utilisee que si tu as véritablement entendu l'apprenant utiliser l'expression. Toute proposition nouvelle ou reformulation est a_reemployer.",
   "Ne fabrique jamais d'erreur, de citation ou de réussite attribuée à l'apprenant. Si les observations sont insuffisantes, reste prudent et limite le nombre de ressources.",
   "Après l'exécution de l'outil, poursuis avec un retour ORAL bref et naturel. Demande d'abord à l'apprenant ce qui lui a paru facile ou difficile, puis mentionne un point observé et une stratégie de réemploi.",
   "Le texte de la boîte à outils apparaît sur la page : ne lis pas cette liste à voix haute.",
   "Aucun bilan automatique pendant une conversation ordinaire. N'exécute pas l'outil sans demande expresse ou sans déclenchement du bouton « Faire le point »."
 ].join("\n");
 const FORCE_SUFFIX="\nL'apprenant vient d'activer explicitement « Écho, on fait le point ? ». Ton action immédiate doit être d'appeler publish_language_toolbox pour fournir les ressources écrites, puis tu fais un bref bilan oral. Il ne faut pas demander au préalable un sujet ou une consigne.";
 function normalized(value){
   return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
 }
 function isTrigger(text){
   return normalized(text)==="echo on fait le point";
 }
 function create(options){
   const opt=options||{};
   const captions=null; // Continuous ASR disabled; the model keeps its conversational context.
   const toolbox=root.ECHO_TOOLBOX?.create?.()||null;
   let pending=[];
   let handled=new Set();
   let toolCount=0;
   let promptBase="";
   let requested=false;
   let toolCalled=false;
   let forceAttempts=0;
   let forcePending=false;
   let awaitingUpdate=false;
   let responseInProgress=false;
   let sessionRef=null;
   const MAX_CALLS=3;
   function log(message){if(typeof opt.log==="function")try{opt.log(message);}catch{}}
   function configure(instructions){
     promptBase=String(instructions||"")+"\n"+PROMPT;
     return {
       input_audio_transcription:null,
       instructions:promptBase,
       tools:root.ECHO_TOOLBOX?.definition?[root.ECHO_TOOLBOX.definition]:[]
     };
   }
   function reset(){
     pending=[];
     handled=new Set();
     toolCount=0;requested=false;toolCalled=false;
     forceAttempts=0;forcePending=false;awaitingUpdate=false;
     responseInProgress=false;sessionRef=null;
     captions?.reset?.();
     toolbox?.clear?.();
   }
   function finish(){
     captions?.finish?.();
     if(requested&&!toolCalled)toolbox?.setUnavailable?.();
     pending=[];
   }
   function send(session,event){
     const channel=session?.eventChannel;
     if(!session||session.stopped||!channel||channel.readyState!=="open")return false;
     try{channel.send(JSON.stringify(event));return true}catch{return false}
   }
   function updateForBilan(session){
     if(!session||session.stopped||awaitingUpdate||forceAttempts>=2||toolCalled)return false;
     if(responseInProgress){forcePending=true;return true;}
     forcePending=false;
     forceAttempts++;
     awaitingUpdate=send(session,{
       event_id:"event_"+crypto.randomUUID(),
       type:"session.update",
       session:{instructions:promptBase+FORCE_SUFFIX}
     });
     if(awaitingUpdate){
       log("Rappel du bilan envoyé au modèle");
       toolbox?.waiting?.();
     }else{
       toolbox?.setUnavailable?.();
     }
     return awaitingUpdate;
   }
   function requestBilan(session){
     if(!session||session.stopped||!session.connected||!session.eventChannel)return false;
     if(requested&&toolCalled)return false;
     requested=true;
     toolbox?.waiting?.();
     return updateForBilan(session);
   }
   function doPending(session){
     if(!pending.length)return false;
     let count=0;
     while(pending.length && count<MAX_CALLS){
       const call=pending.shift();
       if(!call?.call_id||handled.has(call.call_id))continue;
       handled.add(call.call_id);
       count++;toolCount++;
       let ok=false;
       if(call.name==="publish_language_toolbox" && toolbox && toolCount<=MAX_CALLS){
         try{
           const args=JSON.parse(call.arguments||"{}");
           const observed=""; // No verified student transcript.
           ok=toolbox.receive(args,observed);
           toolCalled=ok;
           requested=true;
           log(ok?"Boîte à outils prête":"Outil appelé sans ressources exploitables");
         }catch{
           toolbox?.setUnavailable?.();
           log("Écho a renvoyé un format de boîte à outils non valide");
         }
       }
       if(!send(session,{
         event_id:"event_"+crypto.randomUUID(),type:"conversation.item.create",
         item:{type:"function_call_output",call_id:call.call_id,output:JSON.stringify({
           success:ok,
           message:ok
             ?"La boîte à outils est visible sur la page. Réponds maintenant à l'oral avec un bilan bref et naturel, sans lire les expressions."
             :"La boîte à outils n'a pas pu être affichée. Fais un bilan oral bref et prudent."
         })}
       }))return false;
     }
     if(count>0){
       const ok=send(session,{
         event_id:"event_"+crypto.randomUUID(),type:"response.create",
         response:{modalities:["text","audio"]}
       });
       if(ok){log("Reprise du bilan oral après la boîte à outils");opt.onBilanContinue?.();}
       return ok;
     }
     return false;
   }
   function onEvent(session,message){
     if(!session||session.stopped||!message)return false;
     sessionRef=session;
     try{captions?.onEvent?.(message);}catch{}
     switch(message.type){
       case "session.updated":
         if(awaitingUpdate){
           awaitingUpdate=false;
           const ok=send(session,{
             event_id:"event_"+crypto.randomUUID(),type:"response.create",
             response:{modalities:["text","audio"]}
           });
           if(ok){log("Déclenchement du bilan à la demande");return true}
           toolbox?.setUnavailable?.();
         }
         return false;
       case "response.created":
         responseInProgress=true;
         return false;
       case "response.function_call_arguments.done":{
         const cid=String(message.call_id||"");
         if(!cid||handled.has(cid)||pending.some(x=>x.call_id===cid))return true;
         pending.push({call_id:cid,name:String(message.name||""),arguments:String(message.arguments||"").slice(0,120000)});
         requested=true;
         toolbox?.waiting?.();
         log("Préparation de Ma boîte à outils");
         return true;
       }
       case "response.done":
         responseInProgress=false;
         if(pending.length)return doPending(session);
         if(toolCalled)return false;
         if(requested&&!awaitingUpdate){
           if(forceAttempts<1)return updateForBilan(session);
           toolbox?.setUnavailable?.();
         }
         if(forcePending)return updateForBilan(session);
         return false;
       case "error":
         if(awaitingUpdate){awaitingUpdate=false;toolbox?.setUnavailable?.();}
         return false;
       default:return false;
     }
   }
   return Object.freeze({configure,reset,finish,requestBilan,onEvent,transcript:captions,toolbox,trigger:TRIGGER});
 }
 root.ECHO_PILOT_FEATURES=Object.freeze({create,isTrigger,trigger:TRIGGER,version:"2026-11-13.5"});
})(typeof window!=="undefined"?window:globalThis);