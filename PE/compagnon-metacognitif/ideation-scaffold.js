/* Teacher-designed metacognitive scaffold for learners who explicitly lack ideas.
   This resource is deterministic and marked as such in the chat UI.
   It does not impersonate a GLM reply, write a full paragraph, or replace the live backend.
   Its purpose is to prevent the student from being asked for an existing draft
   after they have twice explained that they have nothing to write yet. */
(function(root){
  "use strict";
  function norm(s){return String(s||"").toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g," ").trim();}
  function isIdeationRequest(raw,meta){
    var s=norm(raw);
    if(/pas d'exemple|aucun exemple|找不到例子|没例子|想不出例子/.test(s))return false;
    if(/comment (le|la|l')? dire|comment (l')?écrire|word|vocabulaire|表达|词汇/.test(s))return false;
    if(/\b(?:une |des |premi[eè]re )?pistes?\b|je cherche (?:une |des )?id[ée]es?|je n'ai pas d'id[ée]es?|j'ai pas d'id[ée]es?|pas d'id[ée]es?|aucune id[ée]e|pas la moindre id[ée]e|je (?:ne )?sais pas quoi (?:dire|[ée]crire)|je (?:ne )?sais pas par o[uù] commencer|je suis (?:compl[eè]tement )?bloqu[ée]|quel angle|comment commencer|我没(?:有)?思路|没(?:有)?想法|想不出|不知道写什么|给.*(?:思路|角度)|找不到思路/.test(s))return true;
    if(meta&&meta.difficulty==="ideation"&&/^(?:je (?:ne )?sais pas|toujours pas|aucune|non|还是没有|我还是不知道|没想法|不知道|je voudrais un exemple|donne.moi un exemple)/.test(s))return true;
    return false;
  }
  function userHasDraft(history){
    return (history||[]).some(function(turn){
      var v=String(turn&&turn.text||"");
      return turn.role==="user"&&(v.length>240||v.split(/\n/).filter(Boolean).length>=5);
    });
  }
  function detectTheme(history,raw,meta){
    var texts=(history||[]).slice(-12).map(function(t){return String(t&&t.text||"")});
    var all=norm([meta&&meta.goal||"",meta&&meta.topic||"",texts.join(" "),raw].join(" "));
    if(/apparence|image de soi|v[êe]tement|tenue|jogging|uniforme|tatouage|穿着|外貌|形象|服装/.test(all))return "apparence";
    if(/bonheur|heureux|heureuse|amour|argent|satisfait|幸福|快乐|爱情|金钱/.test(all))return "bonheur";
    if(/plan[eè]te|environnement|[ée]colog|climat|pollution|polluant|环保|环境|气候/.test(all))return "planete";
    if(/r[ée]seaux sociaux|social media|consommation|网红|社交媒体|消费/.test(all))return "medias";
    return "general";
  }
  var plans={
    apparence:{
      goal:"L’apparence et l’image de soi",
      angles:["Les vêtements peuvent exprimer notre personnalité.","On adapte parfois son apparence au regard et aux attentes des autres."],
      situation:"Imagine une même personne en jogging chez elle, puis habillée plus formellement pour un entretien. Qu’est-ce qui change : sa personnalité ou la manière dont elle veut être perçue ?",
      frame:"Dans certaines situations, on choisit ses vêtements pour …, tandis que dans d’autres, on …"
    },
    bonheur:{
      goal:"Le bonheur",
      angles:["Le bonheur peut naître des relations avec les autres.","On peut aussi être heureux grâce à une activité ou à une réussite personnelle."],
      situation:"Imagine quelqu’un qui passe une journée avec des amis, puis une autre journée à accomplir quelque chose qui lui tient à cœur. Où pourrait-il trouver du bonheur ?",
      frame:"Pour moi, le bonheur peut venir de …, par exemple lorsque …"
    },
    planete:{
      goal:"La protection de la planète",
      angles:["Les habitudes individuelles peuvent contribuer à protéger l’environnement.","Les décisions collectives peuvent avoir davantage d’effet."],
      situation:"Pense à quelqu’un qui réduit ses déchets, mais qui vit dans une ville sans transports publics pratiques. Quelle responsabilité revient à chacun ?",
      frame:"À mon avis, protéger la planète suppose …, car …"
    },
    medias:{
      goal:"Les réseaux sociaux et les habitudes de consommation",
      angles:["Les réseaux sociaux permettent de découvrir de nouvelles façons de vivre.","Ils peuvent aussi créer des envies et encourager la comparaison."],
      situation:"Une personne voit des photos de vacances luxueuses en ligne. Aura-t-elle envie de voyager, de dépenser plus ou de montrer une certaine image d’elle-même ?",
      frame:"Quand on voit … sur les réseaux sociaux, on peut avoir envie de … parce que …"
    },
    general:{
      goal:"Trouver une première idée",
      angles:["Partir d’une situation concrète que tu as observée.","Partir de deux points de vue différents sur une même question."],
      situation:"Pense à un petit désaccord entendu récemment : qui pense quoi, et pourquoi les deux personnes ne voient-elles pas les choses de la même façon ?",
      frame:"Dans cette situation, certaines personnes pensent que …, alors que d’autres …"
    }
  };
  function support(input,history,meta){
    if(!isIdeationRequest(input,meta))return null;
    var m=meta||{};
    // An existing draft calls for revision, not automatic ideation scaffolding.
    if(userHasDraft(history)&&m.difficulty!=="ideation")return null;
    var zh=/[\u3400-\u9fff]/.test(String(input||""));
    var theme=m.ideaTheme||detectTheme(history,input,m);
    var plan=plans[theme]||plans.general;
    var step=m.difficulty==="ideation" ? Math.min(3,(Number(m.ideaSupport)||0)+1) : 1;
    var reply;
    if(step===1){
      reply=zh
       ?"我们先找一个切入角度。你可以从两个方向想：① "+plan.angles[0]+" ② "+plan.angles[1]+"。哪一个更接近你的想法？也可以提出第三种。"
       :"D’accord, cherchons une première piste ensemble. Voici deux directions possibles :\n① "+plan.angles[0]+"\n② "+plan.angles[1]+"\nLaquelle te parle le plus ? Tu peux aussi proposer une autre idée.";
    }else if(step===2){
      reply=zh
       ?"那我们借助一个具体情境来想一想：\n"+plan.situation+"\n你只要说说自己的直觉就可以，暂时不用写成完整句子。"
       :"Prenons une situation concrète :\n"+plan.situation+"\nDis-moi simplement ce que tu en penses, même avec quelques mots. Pas besoin de rédiger une phrase parfaite.";
    }else{
      reply=zh
       ?"我们再降低一点难度。试着补全这个法语句架：\n« "+plan.frame+" »\n你只需要补充一个想法，之后我们再判断它是否支持你的观点。"
       :"On peut commencer par une phrase incomplète, sans chercher à rédiger tout le paragraphe :\n« "+plan.frame+" »\nComplète seulement ce qui correspond à ton idée ; nous vérifierons ensuite si le raisonnement tient.";
    }
    return {reply:reply,source:"Pistes de réflexion · ressource du cours",phase:"position",
      language:zh?"zh":"fr",topic:plan.goal,
      meta:{goal:plan.goal,topic:plan.goal,task:"argumenter",difficulty:"ideation",
        ideaTheme:theme,ideaSupport:step,lastStrategy:step===1?"two-angles":step===2?"concrete-situation":"incomplete-frame",
        next:zh?"选择或调整一个可行思路":"Choisir ou adapter une piste sans rédiger à sa place"}};
  }
  root.COMPAGNON_IDEATION_SUPPORT=support;
  if(typeof module!=="undefined"&&module.exports)module.exports=support;
})(typeof window!=="undefined"?window:globalThis);
