(function(){
"use strict";
var page=location.pathname.indexOf("part02")>=0?"two":location.pathname.indexOf("part03")>=0?"meta":location.pathname.indexOf("closing")>=0?"closing":location.pathname.indexOf("s09-demo")>=0?"s09":"main";
var all={
task:["任务与主体评估","学生理解任务目标，并识别已有语言资源与当前困难，才能选择下一步写作策略。这三种元认知要素不是线性三个阶段。","吴红云、刘润清（2004）；Flavell（1979）"],
language:["以写促学与语言资源调用","识别词语不等于能在新的论述任务中主动提取并复用。支架应服务学生自己的思想表达。","Flower & Hayes（1981）；Abdelaal（2026）"],
warrant:["论证保证与推理","写出例子不代表已经证明观点，需要说明依据为什么支持主张，避免从事实直接推断人物的幸福感。","Toulmin（1958）"],
recursive:["写作的递归过程","Planifier、Rédiger、Réviser不断回返。监控与调节决定写作者何时调整表达或论证目标。","Flower & Hayes（1981）；Flavell（1979）"],
agent:["AI加入后的新判断","规划增加了求助内容的选择；监控增加了对AI反馈的核验；修订需要学生作出采纳或拒绝建议的决定。","Hattie & Timperley（2007）；Yan（2026）"],
scaffold:["按需支架与逐步渐退","知识缺口可以讲解，语言阻断可以给词块、句架及局部示范；学生能够推进时应撤除不必要的支持。","van de Pol 等（2010）"],
s12:["S12｜从监控走向调节","指出没有例子是可见的困难识别行为。需要继续学习如何寻找贴合论点的情境，再解释情境与主张的关系。","Flavell（1979）；van de Pol 等（2010）"],
s09:["S09｜语言资源与迁移","学生已在中文部分构建观点和酒店摆拍例子；应帮助拆分意义、调取词块并自行试写，而不是直接整段翻译。","Flower & Hayes（1981）；van de Pol 等（2010）"],
s02:["S02｜事实与推断","职业压力与当事人的幸福感不能直接画等号。应审查支持性证据，或适当限制结论范围。","Toulmin（1958）"],
edit:["Word补充案例｜S26和S52","修改笔迹不能独自说明修改理由；已有有效论证时也要判断何处只需局部语法修订、何时可以停止。","Flavell（1979）；Hattie & Timperley（2007）"],
research:["过程证据与策略迁移","初稿、关键选择及理由、修改稿和后续独立迁移需要结合起来，不能只凭流畅终稿判定元认知能力提升。","Yan（2026）；Hattie & Timperley（2007）"]
};
var onPage={two:["language","warrant","task"],meta:["recursive","agent","scaffold"],closing:["research","scaffold"],s09:["s09","scaffold","warrant"],main:["task","s12","s09","s02","edit","research"]};
var placement={two:[["language","写作：两项学习任务"],["language","语言加工与论证加工"],["warrant","法语与法学"]],meta:[["recursive","写作不是一条单向"],["agent","AI加入之后"],["scaffold","AI能够支持写作"]],closing:[["research","让AI提供支持"]],main:[["task","AI介入法语写作的案例分析"],["s12","S12"],["s09","S09"],["s02","S02"]],s09:[]};
var keys=onPage[page];
function escapeHTML(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
var style=document.createElement("style");
style.textContent=".bridge-toolbar{position:fixed;top:85px;right:17px;z-index:140;display:flex;gap:6px}.bridge-toolbar a,.bridge-toolbar button{border:1px solid #bbd0e2;border-radius:11px;box-shadow:0 5px 15px #21456224;padding:10px 12px;font:bold 12px Arial,'Microsoft YaHei',sans-serif;background:white;color:#24587e;cursor:pointer;text-decoration:none}.bridge-toolbar .bridge-red{border-color:#d899a4;background:#c93e53;color:white}.bridge-backdrop{position:fixed;inset:0;background:#112d4866;z-index:198}.bridge-drawer{position:fixed;top:0;right:0;bottom:0;width:min(440px,96vw);z-index:199;overflow:auto;background:#fff;padding:26px 26px 35px;box-shadow:-20px 0 55px #06182e2e;color:#213d59;font-family:Arial,'Microsoft YaHei',sans-serif}.bridge-drawer h2{margin:14px 0;font-size:24px;color:#194e7b}.bridge-drawer p{font-size:15px;line-height:1.8}.bridge-drawer .bridge-close{float:right;border:1px solid #cbdae8;background:#f3f8fd;border-radius:9px;padding:9px 12px;cursor:pointer}.bridge-list{display:flex;flex-direction:column;gap:9px;margin-top:22px}.bridge-row{display:flex;gap:11px;align-items:center;text-align:left;background:#f6f9fd;border:1px solid #d7e4ef;border-radius:11px;padding:12px;cursor:pointer;color:#2b5b82;font-size:14px}.bridge-row b,.bridge-inline-dot{width:26px;height:26px;min-width:26px;border:0;border-radius:50%;display:inline-grid;place-items:center;background:#d44356;color:white;font:bold 15px Arial;box-shadow:0 3px 8px #a23b4933;cursor:pointer}.bridge-inline-dot{margin-left:10px;vertical-align:middle}.bridge-theory{border-left:4px solid #d44356;background:#fff7f8;padding:14px;border-radius:8px;margin:13px 0}.bridge-foot{margin-top:16px;font-size:12px!important;color:#758aa0}.bridge-foot a{font-weight:700;color:#1e6797}@media(max-width:800px){.bridge-toolbar{top:auto;bottom:14px;right:14px}.bridge-toolbar a,.bridge-toolbar button{padding:9px 10px;font-size:11px}}";
document.head.appendChild(style);
var toolbar=document.createElement("div");toolbar.className="bridge-toolbar";
toolbar.innerHTML='<a href="./notes.html" target="_blank" rel="noopener">发言稿 · Word资料</a><button class="bridge-red" type="button" aria-label="打开理论补充">● 理论补充</button>';
document.body.appendChild(toolbar);
var backdrop=document.createElement("div");backdrop.className="bridge-backdrop";backdrop.hidden=true;
var drawer=document.createElement("section");drawer.className="bridge-drawer";drawer.hidden=true;drawer.setAttribute("role","dialog");drawer.setAttribute("aria-label","教学支架理论关照");
drawer.innerHTML='<button type="button" class="bridge-close">关闭 ×</button><h2>教学支架 · 理论关照</h2><div id="bridgeFocus"><p>选择下方节点查看对应的教学行动和理论依据。</p></div><div class="bridge-list"></div><p class="bridge-foot">Word讲稿中的S45、S26、S52及三要素理论已导入 <a href="./notes.html" target="_blank" rel="noopener">发言稿与Word教学资料</a>。</p>';
document.body.appendChild(backdrop);document.body.appendChild(drawer);
var list=drawer.querySelector(".bridge-list");
keys.forEach(function(key,i){var b=document.createElement("button");b.type="button";b.className="bridge-row";b.innerHTML="<b>"+(i+1)+"</b>"+escapeHTML(all[key][0]);b.addEventListener("click",function(){focus(key)});list.appendChild(b)});
function focus(key){var v=all[key];if(!v)return;drawer.querySelector("#bridgeFocus").innerHTML="<h3>"+escapeHTML(v[0])+"</h3><p class='bridge-theory'>"+escapeHTML(v[1])+"</p><p class='bridge-foot'>理论线索："+escapeHTML(v[2])+"</p>"}
function open(key){backdrop.hidden=false;drawer.hidden=false;document.documentElement.style.overflow="hidden";focus(key||keys[0])}
function close(){backdrop.hidden=true;drawer.hidden=true;document.documentElement.style.overflow=""}
toolbar.querySelector("button").addEventListener("click",function(){open()});
drawer.querySelector(".bridge-close").addEventListener("click",close);backdrop.addEventListener("click",close);
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!drawer.hidden)close()});
function annotate(){
 var headings=document.querySelectorAll("h1,h2,h3");
 placement[page].forEach(function(spec){
  var key=spec[0],needle=spec[1];
  for(var i=0;i<headings.length;i++){
   var h=headings[i];if(!h.textContent.includes(needle)||h.querySelector("[data-bridge-key='"+key+"']"))continue;
   var dot=document.createElement("button");dot.className="bridge-inline-dot";dot.type="button";dot.textContent="●";dot.setAttribute("data-bridge-key",key);dot.setAttribute("aria-label","查看"+all[key][0]+"的理论关照");
   dot.addEventListener("click",function(e){e.stopPropagation();open(key)});h.appendChild(dot);break;
  }
 });
}
annotate();
if(page==="main"){
 var pending=false;var observer=new MutationObserver(function(){if(pending)return;pending=true;setTimeout(function(){pending=false;annotate()},100)});
 observer.observe(document.body,{childList:true,subtree:true});
}
})();