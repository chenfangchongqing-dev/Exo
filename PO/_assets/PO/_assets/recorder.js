/* 轻量录音组件：initPORecorder({ mount, submitHref?, title?, tip? }) */
(function(){
  function fmt(t){const s=Math.floor(t/1000),mm=String(Math.floor(s/60)).padStart(2,'0'),ss=String(s%60).padStart(2,'0');return `${mm}:${ss}`;}
  function el(tag,cls,html){const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e;}

  async function startRec(ctx){
    try{
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      const types=['audio/webm;codecs=opus','audio/webm','audio/mpeg','audio/ogg'];
      ctx.mime = types.find(t=>window.MediaRecorder && MediaRecorder.isTypeSupported?.(t)) || '';
      ctx.rec = new MediaRecorder(stream, ctx.mime?{mimeType:ctx.mime}:undefined);
      ctx.chunks = [];
      ctx.rec.ondataavailable = e=>{ if(e.data && e.data.size>0) ctx.chunks.push(e.data); };
      ctx.rec.onstop = ()=>{
        ctx.blob = new Blob(ctx.chunks,{type:ctx.mime||'audio/webm'});
        ctx.audio.src = URL.createObjectURL(ctx.blob);
        ctx.player.style.display='block';
        ctx.dl.disabled=false;
      };
      ctx.rec.start();
      ctx.t0=Date.now(); ctx.timer.textContent='00:00';
      ctx.tick=setInterval(()=>{ ctx.timer.textContent=fmt(Date.now()-ctx.t0); },250);
      ctx.start.disabled=true; ctx.stop.disabled=false;
    }catch(err){ alert('无法访问麦克风：'+(err.message||err)); }
  }
  function stopRec(ctx){
    if(ctx.rec && ctx.rec.state==='recording') ctx.rec.stop();
    if(ctx.tick){ clearInterval(ctx.tick); ctx.tick=null; }
    ctx.stop.disabled=true; ctx.start.disabled=false;
  }
  function download(ctx){
    if(!ctx.blob) return;
    const ext=(ctx.blob.type.includes('mpeg')?'mp3':ctx.blob.type.includes('ogg')?'ogg':'webm');
    const name=(ctx.title||'PO-enregistrement')+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.'+ext;
    const a=document.createElement('a'); a.href=URL.createObjectURL(ctx.blob); a.download=name; a.click(); URL.revokeObjectURL(a.href);
  }
  function resetAll(ctx){
    stopRec(ctx);
    ctx.start.disabled=false; ctx.stop.disabled=true;
    ctx.timer.textContent='00:00'; ctx.player.style.display='none';
    ctx.audio.removeAttribute('src'); ctx.audio.load(); ctx.blob=null; ctx.chunks=[];
    ctx.file.value=''; ctx.fileName.textContent='';
  }
  function handleFile(ctx, f){
    if(!f) return;
    ctx.fileName.textContent=`已选择：${f.name} (${Math.round(f.size/1024)} KB)`;
    ctx.player.style.display='block'; ctx.audio.src=URL.createObjectURL(f); ctx.dl.disabled=true;
  }

  window.initPORecorder = function(opts){
    opts = opts || {};
    const mount = (typeof opts.mount==='string') ? document.querySelector(opts.mount) : (opts.mount || document.body);
    const title = opts.title || 'Enregistrer / Déposer un audio (PO)';
    const tip = opts.tip || '请在录音前允许麦克风权限；录完可回放/下载，或上传现有音频预听。';

    const box = el('div','po-rec-card');
    box.innerHTML = `
      <div class="po-rec-title">${title}</div>
      <div class="po-tip">💡 ${tip}</div>
      <div class="po-rec-row">
        <button class="po-rec-btn" data-act="start">🎙️ Commencer</button>
        <button class="po-rec-btn secondary" data-act="stop" disabled>⏹️ Arrêter</button>
        <span class="po-rec-meta" data-ref="timer">00:00</span>
      </div>
      <div data-ref="player" style="margin-top:10px;display:none">
        <audio class="po-rec-audio" data-ref="audio" controls></audio>
        <div class="po-rec-row" style="margin-top:8px">
          <button class="po-rec-btn" data-act="download">⬇️ Télécharger</button>
          <button class="po-rec-btn secondary" data-act="reset">🔄 Réinitialiser</button>
          ${opts.submitHref?`<a class="po-rec-btn secondary" href="${opts.submitHref}" target="_blank">📤 提交入口</a>`:''}
        </div>
      </div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0">
      <div class="po-rec-row">
        <input type="file" data-ref="file" accept="audio/*">
        <span class="po-rec-meta" data-ref="fileName"></span>
      </div>
      <div class="po-rec-note">隐私：音频仅保存在本地浏览器内存，下载前不会上传到任何服务器。</div>
    `;
    mount.appendChild(box);

    const ctx = {
      title: opts.title,
      start: box.querySelector('[data-act="start"]'),
      stop: box.querySelector('[data-act="stop"]'),
      dl: box.querySelector('[data-act="download"]'),
      reset: box.querySelector('[data-act="reset"]'),
      timer: box.querySelector('[data-ref="timer"]'),
      audio: box.querySelector('[data-ref="audio"]'),
      player: box.querySelector('[data-ref="player"]'),
      file: box.querySelector('[data-ref="file"]'),
      fileName: box.querySelector('[data-ref="fileName"]'),
    };

    ctx.start.addEventListener('click', ()=>startRec(ctx));
    ctx.stop.addEventListener('click', ()=>stopRec(ctx));
    ctx.dl.addEventListener('click', ()=>download(ctx));
    ctx.reset.addEventListener('click', ()=>resetAll(ctx));
    ctx.file.addEventListener('change', e=>handleFile(ctx, e.target.files?.[0]));

    // 若浏览器不支持录音，隐藏录音行，仅保留上传
    if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder){
      ctx.start.parentElement.style.display='none';
      const warn = el('div','po-rec-note','⚠️ 当前浏览器不支持在线录音，请改用本地音频上传。');
      box.insertBefore(warn, box.firstChild);
    }
  }
})();
