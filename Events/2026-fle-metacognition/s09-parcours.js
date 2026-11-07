/* S09 pedagogical dialogue simulation, revised for 2026 conference projection.
   Source manuscript: authentic transcription.
   Student follow-up turns and all AI replies: constructed demonstration (not GLM logs).
   No model call, no tracking, no external dependencies. */
(function(){
"use strict";
const french="On entend souvent dire que la course sans fin au bonheur matériel. Pour ma part, je pense que c’est vrai. Il y a objets luxuriante dont on peut jouir et nous pouvons les voir sur les réseaux sociaux, donc nous ne pouvons pas restreindre";
const chinese="我们因为看到别人分享出来的更高品质的生活而无法遏制自己的向往和贪欲。比如，有许多人拼团订一间豪华酒店的房间，轮流拍照以模仿那些真正有能力承担这种生活的人。这样的例子展示出人对物质生活的追求是无法停止的——哪怕实际上享受不了，也要假装自己有，哪怕一秒钟，从而得到精神上的满足与快乐";
const finalText="On entend souvent dire que la course au bonheur matériel est sans fin. Pour ma part, je pense que c’est vrai. Sur les réseaux sociaux, les images d’un mode de vie luxueux peuvent susciter l’envie de mener une vie semblable. Par exemple, certaines personnes réservent à plusieurs une chambre d’hôtel de luxe pour prendre des photos et donner l’impression qu’elles mènent ce mode de vie. Cet exemple montre que la recherche du bonheur matériel peut devenir incontrôlable : même lorsqu’on ne peut pas réellement vivre de cette manière, on veut au moins en donner l’image afin d’en tirer une satisfaction passagère.";
const theories=[
 {id:1,title:"识别困难：已有内容，表达受阻",brief:"困难诊断",desc:"学生有主张、理由和具体例子，写作进程中的阻碍主要是如何调用法语表达资源。教师需要区分构思困难与语言困难，才能提供有效反馈。",teacher:"教学期待：确认学生已完成的认知工作，不要求重新选题，也不把反复追问当作支架。",ref:"Flavell（1979）：元认知知识与监控。"},
 {id:2,title:"从中文意义到法语表达",brief:"意义拆分",desc:"将一整段中文论述拆成“看到奢华生活—产生向往—模仿—获得短暂满足”的意义单位，再为当前句子提供词汇块与句架。",teacher:"教学期待：给出能立即使用的表达线索，而非空泛地要求学生继续思考。",ref:"van de Pol 等（2010）：适应性教学支架。"},
 {id:3,title:"试写与针对性语言反馈",brief:"句子试写",desc:"学生使用给出的词块完成第一句，再对照原意比较表达选择。语言知识不是孤立操练，而是在写作任务中得到调用和重组。",teacher:"教学期待：指出局部表达可改之处，给出替代选项；是否采用，由学生决定。",ref:"Flower & Hayes（1981）：写作过程；Hattie & Timperley（2007）：任务与过程层面的反馈。"},
 {id:4,title:"词块复用与跨句迁移",brief:"例句迁移",desc:"学生从概括观点的句子转向酒店摆拍的具体例子，复用“mode de vie”并加入“donner l’impression de”表达模仿行为。",teacher:"教学期待：提供可迁移的词块，支持学生在不同句子中自主组织表达，而非提供整段译文。",ref:"van de Pol 等（2010）：支架渐退与学习者承担任务。"},
 {id:5,title:"解释例证如何支持主张",brief:"论证衔接",desc:"酒店摆拍并不自动证明追求物质幸福“没有止境”。写作者还需要说明“模仿生活方式—取得短暂满足”怎样支撑自己的判断。",teacher:"教学期待：给论证句架，要求学生补足事实与结论之间的推理环节。",ref:"Toulmin（1958）：主张、依据与论证保证。"},
 {id:6,title:"核对意义与结论的分寸",brief:"反思调节",desc:"学生补出论证解释后，还要核对“短暂满足”的原意是否保留，并留意单个例子与较强结论之间的范围关系。",teacher:"教学期待：提示可能存在的推断跳跃，允许学生调整论断强度。",ref:"Flavell（1979）；Hattie & Timperley（2007）：监控与反馈。"},
 {id:7,title:"由学生作最后选择并成稿",brief:"自主修订",desc:"学生比较两种开头，决定采用哪一种，并将自己逐步尝试和调整的句子组织为一段法语论述。",teacher:"教学期待：AI协助整合已经形成的表达，但不在最终环节替学生新增观点或例证。",ref:"Flower & Hayes（1981）：写作修订的递归性；van de Pol 等（2010）：责任移交。"},
 {id:8,title:"教师规约：允许支架，不允许整段代写",brief:"反馈边界",desc:"当学生要求直接翻译整个中文段落时，系统仍可提供词块、句架与一处局部示范，但把后续句子组织与内容取舍留给学习者。",teacher:"教学期待：可见、可解释、可调整的介入边界；学习者有权决定采用哪条建议。",ref:"教师制定的课堂反馈规则；并非对任何语言模型的自动合规性作出保证。"}
];
const steps=[
 {label:"困难识别",turns:[
   {role:"user",html:"<p>不知道法语要怎么写？</p>"},
   {role:"bot",n:1,html:"<p>你已经有立场，也提出了<strong>具体的酒店拍照例子</strong>。困难主要在<strong>把已有意思组织成法语</strong>，不是要重新寻找观点。</p><p>我们从一个意思开始，先不翻译整段。</p>"}
 ]},
 {label:"意义拆分与语言资源",turns:[
   {role:"user",html:"<p>还是不会写法语。可以给我一些能用的词语吗？</p>"},
   {role:"bot",n:2,html:"<p><strong>先拆成三层：</strong>①社交媒体展示奢华生活，引发向往；②有人拼团订酒店、轮流拍照，模仿这种生活；③短暂获得满足。</p><p>第①层可以调用：</p><p class='loc'><span class='word'>sur les réseaux sociaux</span><span class='word'>susciter l’envie de</span><span class='word'>un mode de vie luxueux</span></p><p>句架：<span class='fr'>Sur les réseaux sociaux, les images d’un mode de vie luxueux peuvent…</span> 请先把这一句补全。</p>"}
 ]},
 {label:"第一次法语试写",turns:[
   {role:"user",html:"<p class='fr'>Sur les réseaux sociaux, les images d’un mode de vie luxueux peuvent susciter l’envie de vivre de la même façon.</p>"},
   {role:"bot",n:3,html:"<p>这句话已表达“网络图像激发向往”的意思。<strong>vivre de la même façon</strong> 能理解；你还可以比较：</p><p class='loc'><span class='word'>mener une vie semblable</span><span class='word'>adopter le même mode de vie</span></p><p>你可以保留原句，也可以选一个更贴合论述文体的表达。接下来试着写酒店例子。</p>"}
 ]},
 {label:"将资源迁移到例子",turns:[
   {role:"user",html:"<p class='fr'>Par exemple, certaines personnes réservent à plusieurs une chambre d’hôtel de luxe pour prendre des photos et donner l’impression qu’elles vivent cette vie.</p>"},
   {role:"bot",n:4,html:"<p>例子已能支持前面“向往奢华生活”的意思。为了避免 <strong>cette vie</strong> 的指代生硬，可以尝试：</p><p class='loc'><span class='word'>mener ce mode de vie</span><span class='word'>donner l’impression de</span></p><p>例如将结尾调整为：<span class='fr'>… donner l’impression qu’elles mènent ce mode de vie.</span> 你可以决定是否采用。</p>"}
 ]},
 {label:"从例子回到论点",turns:[
   {role:"user",html:"<p>我不知道最后一句怎么连回“物质幸福的追求没有止境”这个观点。</p>"},
   {role:"bot",n:5,html:"<p>你已经描述了<strong>谁做了什么</strong>；下一句需要解释<strong>这个行为说明什么</strong>。</p><p>可借用一个论证句架：</p><p class='fr'>Cet exemple montre que…<br>même lorsqu’on ne peut pas… , on veut quand même…<br>afin d’en tirer une satisfaction passagère.</p><p>请用自己的话补出“即使不能真正享受这种生活，也希望至少制造这种形象”的意思。</p>"}
 ]},
 {label:"试写论证解释",turns:[
   {role:"user",html:"<p class='fr'>Cet exemple montre que la recherche du bonheur matériel peut devenir incontrôlable : même lorsqu’on ne peut pas réellement vivre de cette manière, on veut au moins en donner l’image afin d’en tirer une satisfaction passagère.</p>"},
   {role:"bot",n:6,html:"<p>现在你已经把<strong>例子、追求的行为与短暂满足</strong>联系起来，论证比单纯描述酒店事件更完整。</p><p>检查两点：① <span class='fr'>une satisfaction passagère</span> 是否保留你的中文原意？② “不可遏制”是这一例子显示的倾向，还是你想对所有人下结论？请由你决定是否限制结论的范围。</p>"}
 ]},
 {label:"修订开头并完成段落",turns:[
   {role:"bot",html:"<p>最后检查开头。原句 <span class='fr'>On entend souvent dire que la course sans fin au bonheur matériel.</span> 结构不完整。你可以从两种说法中选择：</p><p class='fr'>① On entend souvent dire que la poursuite du bonheur matériel n’a pas de fin.<br>② On entend souvent dire que la course au bonheur matériel est sans fin.</p>"},
   {role:"user",html:"<p>我选择第二种。其他句子就按前面讨论的表达合在一起。</p>"},
   {role:"bot",n:7,html:"<p>按照你刚才的<strong>表达选择与试写</strong>，我们把句子合成一段。<strong>成稿是本次教学模拟的示范结果，不是S09真实后测文本。</strong></p><p><button class='word finish-inline' type='button' id='showFinalInline'>查看完整示范段落 ↗</button></p><p>从最初的中法混写，到法语句子试写、例证表达和论证解释，写作目标始终引导语言资源的调用。</p>"}
 ]}
];
const $=id=>document.getElementById(id);
const chat=$("thread"),scroller=$("chatBody"),composer=$("composer");
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
let step=0,selected=null,shown=0,boundaryShown=false;
function add(role,markup,marker,origin){
 const row=document.createElement("div");row.className="turn "+role;
 const avatar=document.createElement("div");avatar.className="avatar";avatar.textContent=role==="bot"?"AI":"学";
 const msg=document.createElement("div");msg.className="message";
 const roleName=role==="bot"?"AI助教 · 教师规约的模拟反馈":origin?"学生 · 真实原稿转写":"学生 · 教学模拟回应";
 msg.innerHTML="<span class='who'>"+roleName+"</span>"+markup;
 row.append(avatar,msg);
 if(marker){
   const dot=document.createElement("button");dot.type="button";dot.className="red-dot";dot.textContent=marker;
   dot.dataset.theory=String(marker);dot.setAttribute("aria-label","查看第 "+marker+" 处理论关照");
   dot.addEventListener("click",()=>focusTheory(marker));row.append(dot);shown=Math.max(shown,marker);
 }
 chat.append(row);
 if(marker)focusTheory(marker);
}
function focusTheory(id){
 const item=theories.find(t=>t.id===id);if(!item)return;selected=id;
 $("theoryDetail").innerHTML="<div class='theory-title'><span class='num'>"+id+"</span>"+esc(item.title)+"</div><p>"+esc(item.desc)+"</p><div class='teacher'>"+esc(item.teacher)+"</div><p class='cite'>理论关照："+esc(item.ref)+"</p>";
 chat.querySelectorAll(".red-dot").forEach(dot=>dot.classList.toggle("active",Number(dot.dataset.theory)===id));
 renderMap();
}
function renderMap(){
 const m=$("theoryMap");
 m.innerHTML=theories.map(t=>"<button type='button' class='mapbtn "+(selected===t.id?"active":"")+"' data-id='"+t.id+"' "+(t.id>shown?"disabled":"")+"><b>"+t.id+"</b>"+esc(t.brief)+"</button>").join("");
 m.querySelectorAll("button:not([disabled])").forEach(btn=>btn.addEventListener("click",()=>focusTheory(Number(btn.dataset.id))));
}
function updateControls(){
 $("stepLabel").textContent=step===0?"原稿 · 准备开始":"教学节点 "+step+" / "+steps.length+" · "+steps[step-1].label;
 $("nextBtn").disabled=step>=steps.length;
 $("nextBtn").textContent=step===0?"开始演示 →":step<steps.length?"继续："+steps[step].label+" →":"对话演示完成 ✓";
 $("prevBtn").disabled=step===0;
 $("showFinal").hidden=step<steps.length;
 $("boundaryBtn").disabled=step===0;
 composer.disabled=step<2||step>=steps.length;
 $("sampleText").disabled=composer.disabled;
 $("sendBtn").disabled=composer.disabled;
 $("inputHint").textContent=step===0?"先看S09原稿，再逐轮展开教师规约下的支架":step<steps.length?"可点击继续播放预设对话，也可输入一句法语体验（本页不会智能评分）":"主线完成：可查看成稿，或单独测试AI代写边界";
}
function scrollEnd(){requestAnimationFrame(()=>{scroller.scrollTop=scroller.scrollHeight;});}
function render(target){
 step=Math.min(Math.max(0,target),steps.length);selected=null;shown=0;boundaryShown=false;chat.innerHTML="";
 add("user","<p class='fr'>"+esc(french)+"</p><p>"+esc(chinese)+"</p>",null,true);
 if(step===0){
  $("theoryDetail").innerHTML="<div class='theory-title' style='color:#315b80'>从真实原稿出发</div><p>法语开头后转为中文论述：学生已有观点与具体事例，但未能完成法语表达。</p><div class='teacher'>以下学生回应和AI答复是教学模拟，不是真实对话记录。点击“开始演示”逐轮查看。</div>";
 }
 for(let i=0;i<step;i++){
  for(const turn of steps[i].turns)add(turn.role,turn.html,turn.n||null,false);
 }
 renderMap();updateControls();scrollEnd();
}
function showFinal(){
 if(step<steps.length)return;
 $("finalText").textContent=finalText;
 $("finalModal").hidden=false;
 $("closeFinal").focus();
}
function showBoundary(){
 if(step===0||boundaryShown)return;
 boundaryShown=true;
 add("user","<p>能不能直接把我的中文那段全部翻译成法语？</p>");
 add("bot","<p>我可以帮你<strong>拆分意思、调取词汇和句架，也能给一句局部示范</strong>。但这次练习希望你自己逐步组织法语，所以我不直接输出可提交的整段译文。</p><p>我们可以继续处理最难的一句，或者检查你写出的法语是否忠于原意。</p><p class='muted'>此处为教师规约的模拟回应；不代表任何实际模型调用结果。</p>",8);
 $("boundaryBtn").disabled=true;$("boundaryBtn").textContent="规约已展示 ✓";scrollEnd();
}
function send(){
 if(composer.disabled)return;
 const value=composer.value.trim();if(!value)return;
 add("user","<p class='fr'>"+esc(value)+"</p><p class='muted'>现场试写（不属于预设S09学生回应）</p>");
 add("bot","<p>你已尝试独立表达。请对照原来的中文意义检查内容是否完整，并留意句中动词、介词和指代是否恰当。</p><p class='muted'>本页为离线教学模拟，不会分析输入内容；请继续播放预设案例观察具体的教师反馈设计。</p>");
 composer.value="";scrollEnd();
}
$("nextBtn").addEventListener("click",()=>render(step+1));
$("prevBtn").addEventListener("click",()=>render(step-1));
$("restartBtn").addEventListener("click",()=>render(0));
$("boundaryBtn").addEventListener("click",showBoundary);
$("showFinal").addEventListener("click",showFinal);
$("sendBtn").addEventListener("click",send);
$("sampleText").addEventListener("click",()=>{composer.value="Sur les réseaux sociaux, les images d’un mode de vie luxueux peuvent susciter l’envie de vivre de la même façon.";composer.focus();});
composer.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}});
chat.addEventListener("click",e=>{if(e.target.id==="showFinalInline")showFinal();});
$("showOriginal").addEventListener("click",()=>{$("originalText").textContent=french+"\n\n"+chinese;$("originalModal").hidden=false;});
$("closeOriginal").addEventListener("click",()=>{$("originalModal").hidden=true;});
$("originalModal").addEventListener("click",e=>{if(e.target.id==="originalModal")$("originalModal").hidden=true;});
$("closeFinal").addEventListener("click",()=>{$("finalModal").hidden=true;});
$("finalModal").addEventListener("click",e=>{if(e.target.id==="finalModal")$("finalModal").hidden=true;});
$("fullscreenBtn").addEventListener("click",()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.();});
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"){$("originalModal").hidden=true;$("finalModal").hidden=true;return;}
 if(["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName))return;
 if(["ArrowRight","PageDown"].includes(e.key) && step<steps.length){e.preventDefault();render(step+1);}
 if(["ArrowLeft","PageUp"].includes(e.key) && step>0){e.preventDefault();render(step-1);}
 if(e.key.toLowerCase()==="r")render(0);
 if(e.key.toLowerCase()==="f")$("fullscreenBtn").click();
 if(e.key.toLowerCase()==="b")showBoundary();
 if(/^[1-8]$/.test(e.key)&&Number(e.key)<=shown)focusTheory(Number(e.key));
});
render(0);
})();