/* Écho · pilot language toolbox
   The Realtime model calls publish_language_toolbox only on a requested bilan.
   The server data-channel tool arguments are suggestions to be checked by the learner;
   this module never trusts HTML from the model and stores nothing remotely.
*/
(function(root){
 "use strict";
 const definition={
   type:"function",
   function:{
     name:"publish_language_toolbox",
     description:"Publie une boîte à outils de FLE individualisée à la demande de bilan de l'apprenant. NE PAS appeler pendant une conversation ordinaire. Sélectionne 3 à 6 expressions ou structures liées aux propos effectivement échangés. Une expression dite par l'apprenant doit être distinguée d'une suggestion nouvelle. Ne pas inventer de citations, d'erreurs ou de réussites. Ensuite, après le résultat de cet outil, fais un bref bilan à l'oral en français sans lire toute la liste.",
     parameters:{
       type:"object",
       properties:{
         theme:{type:"string",description:"Thème réel de la conversation, 2 à 12 mots, sans l'inventer"},
         points_forts:{type:"string",description:"Un fait de communication observé. Ne pas attribuer de note ou diagnostiquer un niveau."},
         items:{
           type:"array",
           description:"3 à 6 ressources de réemploi, issues de la discussion ou utiles pour reformuler un propos tenu. Prioriser qualité et utilité.",
           items:{
             type:"object",
             properties:{
               expression:{type:"string",description:"Mot, collocation, amorce ou structure naturelle en français"},
               role:{type:"string",description:"À quoi sert concrètement cette ressource dans les propos de l'apprenant"},
               exemple:{type:"string",description:"Phrase française courte située dans le thème du dialogue"},
               categorie:{type:"string",enum:["lexique","expression","structure"],description:"Lexique, expression idiomatique, ou structure pour organiser la pensée"},
               origine:{type:"string",enum:["deja_utilisee","a_reemployer"],description:"deja_utilisee seulement si l'apprenant l'a réellement prononcée ; sinon a_reemployer"}
             },
             required:["expression","role","exemple","categorie","origine"]
           }
         },
         prochaine_piste:{type:"string",description:"Une seule piste concrète de réemploi à tester dans une prochaine prise de parole"}
       },
       required:["theme","points_forts","items","prochaine_piste"]
     }
   }
 };
 function safe(value,max){return String(value==null?"":value).replace(/[\x00-\x1F\x7F]+/g," ").trim().slice(0,max);}
 function create(){
   const panel=document.getElementById("toolbox-panel");
   const state=document.getElementById("toolbox-status");
   const content=document.getElementById("toolbox-content");
   const theme=document.getElementById("toolbox-theme");
   const strength=document.getElementById("toolbox-strength");
   const list=document.getElementById("toolbox-items");
   const strategy=document.getElementById("toolbox-strategy");
   const copy=document.getElementById("toolbox-copy");
   const download=document.getElementById("toolbox-download");
   if(!panel||!state||!content||!theme||!strength||!list||!strategy||!copy||!download)return null;
   let data=null;
   function clear(){
     data=null;theme.textContent="";strength.textContent="";
     list.replaceChildren();strategy.textContent="";
     content.hidden=true;
     state.textContent="Demande « Faisons un bilan » à Écho pour recevoir une boîte à outils liée à ton échange.";
     copy.disabled=true;download.disabled=true;
   }
   function waiting(){state.textContent="Écho prépare les expressions à retenir…";}
   function setUnavailable(){if(!data)state.textContent="La boîte à outils n’a pas été produite pendant cet essai. Tu peux demander le bilan à voix haute, ou réessayer lors d’une autre conversation.";}
   function normalize(input){
     return String(input||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("fr").replace(/[^a-z0-9]+/g," ").trim();
   }
   function receive(payload,studentTranscript=""){
     const studentWords=" "+normalize(studentTranscript)+" ";
     const items=Array.isArray(payload?.items)?payload.items.slice(0,6):[];
     const rows=items.map(item=>{
       const expression=safe(item?.expression,180);
       const confirmed=!!expression && studentWords.includes(" "+normalize(expression)+" ");
       return {
         expression,
         role:safe(item?.role,330),
         exemple:safe(item?.exemple,300),
         categorie:["lexique","expression","structure"].includes(item?.categorie)?item.categorie:"expression",
         origine:confirmed && item?.origine==="deja_utilisee"?"deja_utilisee":"a_reemployer"
       };
     }).filter(item=>item.expression && item.exemple && item.role);
     if(!rows.length){setUnavailable();return false;}
     data={
       theme:safe(payload.theme,150),
       points_forts:safe(payload.points_forts,550),
       items:rows,
       prochaine_piste:safe(payload.prochaine_piste,420)
     };
     theme.textContent=data.theme || "Notre conversation";
     strength.textContent=data.points_forts || "Observe ce que tu as pu exprimer pendant l'échange.";
     list.replaceChildren();
     for(const item of rows){
       const article=document.createElement("li");
       article.className="toolbox-item";
       const heading=document.createElement("div");heading.className="toolbox-item-head";
       const expr=document.createElement("strong");expr.textContent=item.expression;
       const flag=document.createElement("span");flag.className="toolbox-kind";
       flag.textContent=item.origine==="deja_utilisee"?"Déjà employé":"À réemployer";
       heading.append(expr,flag);
       const usage=document.createElement("p");usage.textContent=item.role;
       const example=document.createElement("p");example.className="toolbox-example";example.textContent=item.exemple;
       article.append(heading,usage,example);
       list.append(article);
     }
     strategy.textContent=data.prochaine_piste || "Choisis une expression et essaie de la réutiliser dans une prochaine conversation.";
     content.hidden=false;
     state.textContent="Ta boîte à outils est prête. Tu peux la relire, la copier ou l’enregistrer.";
     copy.disabled=false;download.disabled=false;
     panel.scrollIntoView({behavior:"smooth",block:"nearest"});
     return true;
   }
   function getText(){
     if(!data)return "";
     const body=data.items.map((item,i)=>(i+1)+". "+item.expression+" ("+(item.origine==="deja_utilisee"?"déjà employé":"à réemployer")+")\n   Usage : "+item.role+"\n   Exemple : "+item.exemple).join("\n\n");
     return "Écho · Ma boîte à outils\n"+(data.theme||"Notre conversation")+"\n\nCe que j'ai réussi\n"+data.points_forts+"\n\nExpressions à retenir\n"+body+"\n\nPour mon prochain échange\n"+data.prochaine_piste+"\n";
   }
   copy.addEventListener("click",async()=>{
     if(!data)return;
     try{
       await navigator.clipboard.writeText(getText());
       state.textContent="Texte copié !";
     }catch{state.textContent="La copie automatique n’est pas disponible. Tu peux sélectionner le contenu de la boîte à outils.";}
   });
   download.addEventListener("click",()=>{
     if(!data)return;
     const blob=new Blob([getText()],{type:"text/plain;charset=utf-8"});
     const url=URL.createObjectURL(blob);
     const anchor=document.createElement("a");anchor.href=url;
     anchor.download="Echo-boite-a-outils-"+new Date().toISOString().slice(0,10)+".txt";
     document.body.append(anchor);anchor.click();anchor.remove();
     setTimeout(()=>URL.revokeObjectURL(url),1000);
   });
   clear();
   return Object.freeze({clear,waiting,setUnavailable,receive,getText,definition});
 }
 root.ECHO_TOOLBOX=Object.freeze({create,definition,version:"2026-11-13.1"});
})(typeof window!=="undefined"?window:globalThis);