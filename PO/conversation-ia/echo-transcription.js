/* Écho · optional live captions and post-call transcript (student pilot).
   Transcripts remain in browser memory until refresh or starting a new session.
   No upload, background saving or API credentials are implemented here.
   All server events are untrusted; render via textContent.
*/
(function(root){
 "use strict";
 function create(){
   const toggle=document.getElementById("transcript-toggle");
   const content=document.getElementById("transcript-content");
   const list=document.getElementById("transcript-lines");
   const note=document.getElementById("transcript-note");
   const copy=document.getElementById("transcript-copy");
   const download=document.getElementById("transcript-download");
   if(!toggle||!content||!list||!note||!copy||!download)return null;
   let entries=[];
   let currentStudent=null, currentEcho=null, counter=0;
   let keyed=new Map();
   const MAX_TURNS=500;
   function setOpen(open){
     content.hidden=!open;
     toggle.setAttribute("aria-expanded",String(open));
     toggle.textContent=open?"Masquer la transcription":"Afficher la transcription";
   }
   function now(){return new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});}
   function make(role,key){
     const entry={role,key:key||"",text:"",final:false,provisional:"",node:null,body:null};
     const wrapper=document.createElement("div");
     wrapper.className="transcript-turn "+(role==="student"?"from-student":"from-echo");
     const head=document.createElement("div");
     head.className="transcript-speaker";
     const who=document.createElement("strong");
     who.textContent=role==="student"?"Moi":"Écho";
     const time=document.createElement("span");
     time.textContent=now();
     head.append(who,time);
     const message=document.createElement("p");
     message.className="transcript-utterance";
     wrapper.append(head,message);
     entry.node=wrapper;entry.body=message;
     entries.push(entry);
     list.append(wrapper);
     if(key)keyed.set(role+":"+key,entry);
     if(role==="student")currentStudent=entry;else currentEcho=entry;
     if(entries.length>MAX_TURNS){
       const oldest=entries.shift();
       oldest.node.remove();
       if(oldest.key)keyed.delete(oldest.role+":"+oldest.key);
       note.textContent="Une conversation très longue peut dépasser l’historique affiché. Pense à copier ton échange avant de recommencer.";
     }
     return entry;
   }
   function locate(role,key){
     const existing=key?keyed.get(role+":"+key):null;
     if(existing)return existing;
     const recent=role==="student"?currentStudent:currentEcho;
     if(recent && !recent.final && (!recent.key||recent.key.startsWith("pending-"))){
       if(key){if(recent.key)keyed.delete(role+":"+recent.key);recent.key=key;keyed.set(role+":"+key,recent);}
       return recent;
     }
     return make(role,key||"pending-"+(++counter));
   }
   function update(entry,text,done){
     if(!entry)return;
     entry.text=String(text||"").slice(0,20000);
     entry.final=!!done;
     entry.body.textContent=entry.text;
     entry.node.classList.toggle("provisional",!entry.final);
     entry.node.hidden=!entry.text.trim();
     const hasEntries=entries.some(e=>e.text.trim().length>0);
     copy.disabled=!hasEntries;
     download.disabled=!hasEntries;
     if(!content.hidden && hasEntries)list.scrollTop=list.scrollHeight;
   }
   function reset(){
     entries=[];keyed=new Map();
     currentStudent=null;currentEcho=null;counter=0;
     list.replaceChildren();
     note.textContent="Écho transcrit les paroles en français. Le texte reconnu automatiquement peut comporter des erreurs et ne constitue pas une correction linguistique.";
     copy.disabled=true;download.disabled=true;
     setOpen(false);
   }
   function getTranscript(){
     return entries.filter(e=>e.text.trim()).map(e=>(e.role==="student"?"Moi":"Écho")+" : "+e.text.trim()).join("\n\n");
   }
   function getStudentTranscript(){
     return entries.filter(e=>e.role==="student" && e.final && e.text.trim()).map(e=>e.text.trim()).join("\n");
   }
   function onEvent(event){
     if(!event || typeof event.type!=="string")return;
     const type=event.type, key=event.item_id||event.response_id||"";
     if(type==="input_audio_buffer.speech_started"){
       if(!currentStudent||currentStudent.final)make("student","pending-"+(++counter));
     }else if(type==="conversation.item.input_audio_transcription.delta"){
       const target=locate("student",key);
       const text=typeof event.text==="string"?event.text:"";
       const stash=typeof event.stash==="string"?event.stash:"";
       update(target,text+stash,false);
     }else if(type==="conversation.item.input_audio_transcription.completed"){
       const target=locate("student",key);
       update(target,typeof event.transcript==="string"?event.transcript:target.text,true);
     }else if(type==="conversation.item.input_audio_transcription.failed"){
       note.textContent="Une partie de ta voix n’a pas pu être transcrite. La conversation vocale peut néanmoins continuer.";
       if(currentStudent && !currentStudent.text)currentStudent.final=true;
     }else if(type==="response.audio_transcript.delta"){
       const target=locate("echo",key);
       update(target,target.text+String(event.delta||""),false);
     }else if(type==="response.audio_transcript.done"){
       const target=locate("echo",key);
       update(target,typeof event.transcript==="string"?event.transcript:target.text,true);
     }
   }
   function finish(){
     if(entries.some(e=>e.text.trim()))setOpen(true);
   }
   toggle.addEventListener("click",()=>setOpen(content.hidden));
   copy.addEventListener("click",async()=>{
     const text=getTranscript();if(!text)return;
     try{
       await navigator.clipboard.writeText(text);
       const original=copy.textContent;
       copy.textContent="Copié !";
       setTimeout(()=>{copy.textContent=original;},1600);
     }catch{
       note.textContent="La copie automatique n’est pas disponible. Tu peux sélectionner le texte de l’échange et le copier manuellement.";
     }
   });
   download.addEventListener("click",()=>{
     const text=getTranscript();if(!text)return;
     const data=new Blob(["Écho · Conversation orale\n\n"+text+"\n"],{type:"text/plain;charset=utf-8"});
     const url=URL.createObjectURL(data);
     const link=document.createElement("a");
     link.href=url;
     const date=new Date();
     link.download="Echo-transcription-"+date.toISOString().slice(0,10)+".txt";
     document.body.append(link);link.click();link.remove();
     setTimeout(()=>URL.revokeObjectURL(url),1000);
   });
   reset();
   return Object.freeze({reset,onEvent,finish,getTranscript,getStudentTranscript});
 }
 root.ECHO_TRANSCRIPTION=Object.freeze({create,version:"2026-11-13.1"});
})(typeof window!=="undefined"?window:globalThis);