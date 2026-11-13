/* Écho – student-facing pilot WebRTC client.
   This page is a restricted functional test, not the general student rollout.
   It never embeds DASHSCOPE_API_KEY. This no-code pilot requires the
   guest SDP relay v0.2 to be deployed; browser Origin alone is not authentication.
   Durable per-user and billing controls are needed before broad rollout.
*/
(() => {
  "use strict";
  const ENDPOINT = "https://echo-realtime-xzxxauvfwu.cn-beijing.fcapp.run";
  const form = document.getElementById("student-setup");
  const startButton = document.getElementById("student-start");
  const stopButton = document.getElementById("student-stop");
  const bilanButton = document.getElementById("student-bilan");
  const statusText = document.getElementById("student-status");
  const statusDot = document.getElementById("student-dot");
  const clock = document.getElementById("student-timer");
  const remoteAudio = document.getElementById("student-audio");
  const reflection = document.getElementById("student-reflection");
  const voicePanel = document.getElementById("student-call");
  const inputControls = document.querySelectorAll("[data-mode],[data-level],#free-topic,#course-topic,#other-topic");
  if (!form || !window.ECHO_PEDAGOGY || typeof window.ECHO_PEDAGOGY.build !== "function") {
    if(statusText) statusText.textContent = "La conversation vocale n’est pas disponible. Actualise la page.";
    if(startButton) startButton.disabled = true;
    return;
  }

  let active = null;
  const features = window.ECHO_PILOT_FEATURES?.create() || null;
  function formatTime(ms) {
    const secs = Math.max(0,Math.ceil(ms/1000));
    return String(Math.floor(secs/60)).padStart(2,"0") + ":" + String(secs%60).padStart(2,"0");
  }
  function status(message,state="waiting") {
    statusText.textContent = message;
    statusDot.className = "voice-light " + state;
    voicePanel.dataset.state = state;
  }
  function choices() {
    const selectedMode = document.querySelector('[data-mode][aria-pressed="true"]')?.dataset.mode || "libre";
    const selectedLevel = document.querySelector('[data-level][aria-pressed="true"]')?.dataset.level || "B2";
    const freeTopic = document.getElementById("free-topic").value.trim();
    const courseTopic = document.getElementById("course-topic").value;
    const otherTopic = document.getElementById("other-topic").value.trim();
    const courseLabels = {
      "unite2-vetements": "Les vêtements et l'image de soi : les vêtements disent-ils quelque chose de notre personnalité ?",
      "unite2-uniforme": "L'uniforme à l'école : faut-il le rendre obligatoire ?",
      "autre": "Une tâche choisie par l'apprenant"
    };
    return {
      mode: selectedMode,
      level: selectedLevel,
      topic: selectedMode === "libre" ? freeTopic : (otherTopic || (courseTopic === "autre" ? "" : (courseLabels[courseTopic] || "")))
    };
  }
  function lockOptions(locked) {
    for (const el of inputControls) el.disabled = locked;
    startButton.disabled = locked;
    stopButton.disabled = !locked;
    if(bilanButton)bilanButton.disabled=!locked||!active?.connected;
  }
  function shutdown(session) {
    if(!session || session.stopped) return;
    session.stopped = true;
    session.abort.abort();
    clearInterval(session.interval);
    for(const channel of session.channels) try { channel.close(); } catch {}
    if(session.localStream) for(const track of session.localStream.getTracks()) track.stop();
    if(session.remoteStream) for(const track of session.remoteStream.getTracks()) track.stop();
    if(session.pc) try { session.pc.close(); } catch {}
    remoteAudio.pause();
    remoteAudio.srcObject = null;
    features?.finish?.();
    if(active === session) active = null;
    lockOptions(false);
    clock.textContent = "Durée de la conversation : " + formatTime(Date.now()-session.started);
  }
  function endWithError(session,message) {
    if(active !== session) return;
    shutdown(session);
    status(message,"error");
    reflection.hidden = true;
  }
  function failMessage(error) {
    if(error?.name==="NotAllowedError") return "L’accès au microphone a été refusé. Vérifie les autorisations du navigateur.";
    if(error?.name==="NotFoundError") return "Aucun microphone disponible sur cet appareil.";
    if(error?.name==="AbortError") return "La connexion a été interrompue.";
    return "La connexion n’a pas pu être établie. Vérifie ton code et réessaie.";
  }
  function onModelEvent(session,message,channel) {
    if(session.stopped) return;
    const featureHandled=features?.onEvent?.(session,message) || false;
    switch(message.type) {
      case "session.created":
        session.modelCreated = true;
        session.eventChannel = channel;
        maybeInit(session);
        break;
      case "session.updated":
        if(!session.initialized || session.microphoneStarted) return;
        session.microphoneStarted = true;
        Promise.resolve().then(async () => {
          const track = session.localStream?.getAudioTracks()[0];
          if(!track) throw new Error("Microphone indisponible");
          await session.transceiver.sender.replaceTrack(track);
          if(session.stopped) return;
          session.connected = true;
          if(bilanButton)bilanButton.disabled=false;
          status("Écho t’écoute. À toi de parler !","live");
        }).catch(()=>endWithError(session,"Le microphone n’a pas pu démarrer. Réessaie."));
        break;
      case "input_audio_buffer.speech_started":
        if(session.connected) status("Écho t’écoute…","live");
        break;
      case "response.created":
        if(session.connected) status("Écho te répond…","live");
        break;
      case "response.done":
        if(session.connected&&!featureHandled) status("À toi de continuer !","live");
        break;
      case "error":
        endWithError(session,"Écho a rencontré un problème pendant l’échange. Tu peux réessayer.");
        break;
    }
  }
  function bindChannel(session,channel) {
    session.channels.add(channel);
    channel.onopen=()=>maybeInit(session);
    channel.onmessage=event=>{
      if(session.stopped) return;
      let msg;
      try { msg=JSON.parse(event.data); } catch { return; }
      onModelEvent(session,msg,channel);
    };
    channel.onclose=()=>{
      session.channels.delete(channel);
      if(!session.stopped && session.eventChannel===channel)
        endWithError(session,"La connexion audio s’est interrompue. Tu peux recommencer.");
    };
    channel.onerror=()=>{};
    if(channel.readyState==="open") channel.onopen();
  }
  function maybeInit(session) {
    if(session.stopped || !session.modelCreated || session.initialized ||
      session.pc.connectionState!=="connected" ||
      session.eventChannel?.readyState!=="open") return;
    try {
      const cfg=features?.configure?.(session.instructions)||{instructions:session.instructions,tools:[]};
      session.eventChannel.send(JSON.stringify({
        event_id:"event_"+crypto.randomUUID(),
        type:"session.update",
        session:{
          modalities:["text","audio"],
          voice:"Tina",
          instructions:cfg.instructions,
          input_audio_transcription:cfg.input_audio_transcription,
          tools:cfg.tools,
          turn_detection:{type:"server_vad"}
        }
      }));
      session.initialized=true;
      status("Écho se prépare à t’écouter…","connecting");
    } catch {
      endWithError(session,"La conversation ne peut pas démarrer. Réessaie.");
    }
  }
  function gatherIce(session) {
    return new Promise((resolve,reject)=>{
      if(session.pc.iceGatheringState==="complete"){resolve();return;}
      let done=false;
      const timer=setTimeout(()=>finish(new Error("ICE timeout")),20000);
      const listener=()=>{if(session.pc.iceGatheringState==="complete") finish();};
      const abortListener=()=>finish(new Error("aborted"));
      function finish(err){
        if(done)return;done=true;clearTimeout(timer);
        session.pc.removeEventListener("icegatheringstatechange",listener);
        session.abort.signal.removeEventListener("abort",abortListener);
        err?reject(err):resolve();
      }
      session.pc.addEventListener("icegatheringstatechange",listener);
      session.abort.signal.addEventListener("abort",abortListener,{once:true});
      listener();
    });
  }
  async function start(e) {
    e.preventDefault();
    if(active)return;
    reflection.hidden = true;
    features?.reset?.();
    if(!window.RTCPeerConnection || !navigator.mediaDevices?.getUserMedia){
      status("Ce navigateur ne prend pas en charge la conversation vocale. Essaie Chrome ou Safari récent.","error");
      return;
    }
    const selection=choices();
    const session={
      pc:null,channels:new Set(),eventChannel:null,localStream:null,remoteStream:new MediaStream(),
      transceiver:null,abort:new AbortController(),interval:null,
      stopped:false,modelCreated:false,initialized:false,microphoneStarted:false,connected:false,
      instructions:window.ECHO_PEDAGOGY.build(selection)
    };
    active=session;
    lockOptions(true);
    status("Autorise l’accès au microphone pour commencer…","connecting");
    session.started=Date.now();
    session.interval=setInterval(()=>{
      if(active===session)clock.textContent="Durée de la conversation : "+formatTime(Date.now()-session.started);
    },500);
    try {
      session.pc=new RTCPeerConnection({iceServers:[]});
      session.transceiver=session.pc.addTransceiver("audio",{direction:"sendrecv"});
      session.pc.ondatachannel=ev=>bindChannel(session,ev.channel);
      session.pc.ontrack=ev=>{
        if(session.stopped || ev.track.kind!=="audio")return;
        session.remoteStream.addTrack(ev.track);
        remoteAudio.srcObject=session.remoteStream;
        remoteAudio.play().catch(()=>{
          if(!session.stopped)status("Si tu n’entends pas Écho, appuie sur Lecture sous les boutons.","connecting");
        });
      };
      session.pc.onconnectionstatechange=()=>{
        if(session.stopped)return;
        if(session.pc.connectionState==="connected")maybeInit(session);
        if(["failed","disconnected","closed"].includes(session.pc.connectionState))
          endWithError(session,"La connexion audio a été interrompue. Réessaie.");
      };
      bindChannel(session,session.pc.createDataChannel("oai-events"));
      session.localStream=await navigator.mediaDevices.getUserMedia({
        audio:{echoCancellation:true,noiseSuppression:true},video:false
      });
      if(session.stopped)return;
      status("Connexion à Écho en cours…","connecting");
      const offer=await session.pc.createOffer();
      await session.pc.setLocalDescription(offer);
      await gatherIce(session);
      if(session.stopped)return;
      const res=await fetch(ENDPOINT+"/api/realtime/sdp",{
        method:"POST",
        headers:{"Content-Type":"application/sdp"},
        body:session.pc.localDescription.sdp,
        signal:session.abort.signal,
        cache:"no-store"
      });
      if(!res.ok){
        if(res.status===401) throw Object.assign(new Error("old deployment"),{publicMessage:"Le service Écho utilise encore l’ancienne version. L’enseignante doit déployer le relais v0.2."});
        if(res.status===403) throw Object.assign(new Error("old deployment or origin denied"),{publicMessage:"Accès refusé (HTTP 403). Vérifie l’adresse du site ; si le problème persiste, demander le déploiement du service Écho v0.2."});
        if(res.status===429) {
          let reason="";
          try{const payload=await res.json();reason=String(payload?.error||"")}catch{}
          const retrySeconds=Number(res.headers.get("Retry-After"));
          const wait=Number.isFinite(retrySeconds)&&retrySeconds>0
            ?" Réessaie dans environ "+(retrySeconds>=60?Math.ceil(retrySeconds/60)+" minute(s)":Math.ceil(retrySeconds)+" seconde(s)")+"."
            :" Réessaie plus tard.";
          const publicMessage=reason==="guest_busy"
            ?"Le service Écho reçoit trop de demandes en ce moment."+wait
            :reason==="guest_quota_reached"
            ?"Le nombre de connexions autorisées pour cette phase de test est atteint."+wait
            :"Le service Écho limite temporairement les nouvelles connexions."+wait;
          throw Object.assign(new Error(reason||"limited"),{publicMessage});
        }
        throw new Error("SDP exchange failed");
      }
      const answer=(await res.text()).trim().replace(/\r?\n/g,"\r\n")+"\r\n";
      if(session.stopped)return;
      await session.pc.setRemoteDescription({type:"answer",sdp:answer});
    }catch(error) {
      if(session.stopped)return;
      endWithError(session,error?.publicMessage||failMessage(error));
    }
  }
  form.addEventListener("submit",start);
  if(bilanButton)bilanButton.addEventListener("click",()=>{
    if(!active||!active.connected)return;
    const ok=features?.requestBilan?.(active);
    if(ok)status("Écho prépare ton bilan oral et ta boîte à outils…","connecting");
    else status("Dis « Écho, on fait le point ? » pour lancer le bilan.","live");
  });
  stopButton.addEventListener("click",()=>{
    if(!active)return;
    const s=active,worked=s.connected;
    shutdown(s);
    status("Conversation terminée. Tu peux recommencer quand tu veux.","waiting");
    reflection.hidden=!worked;
  });
  window.addEventListener("pagehide",()=>{if(active)shutdown(active);});
})();