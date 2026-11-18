// Run: node --test tests/cafe-speech.test.cjs
// Simulated API events only. These tests do not measure real audio or emulate iOS.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../Events/au-cafe-de-flore/index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script); // Check the complete page's script, including the 3D scene.
const controller = script.split('/* ----------------------- Procedural 3D scene')[0];
const local = { name: 'Thomas', lang: 'fr-FR', voiceURI: 'local-fr', localService: true };
const remote = { name: 'Henri Natural Premium Online', lang: 'fr-FR', voiceURI: 'remote-fr', localService: false };

function setup({ voices = [local], supported = true, constructor = true, throwSpeak = false, throwVoices = false } = {}) {
  let now = 0, nextTimer = 0, gesture = false;
  const timers = new Map(), nodes = new Map(), windowEvents = {}, documentEvents = {}, voiceEvents = {};
  class Element {
    constructor() { this.textContent = ''; this.children = []; this.dataset = {}; this.style = {}; this.attrs = {}; this.listeners = {}; this.hidden = false; this.disabled = false; this.value = ''; const set = new Set(); this.classList = { add: x => set.add(x), remove: x => set.delete(x), contains: x => set.has(x), toggle: (x, on) => on ? set.add(x) : set.delete(x) }; }
    append(...items) { this.children.push(...items); }
    appendChild(item) { this.append(item); }
    replaceChildren(...items) { this.children = [...items]; }
    setAttribute(name, value) { this.attrs[name] = value; }
    addEventListener(name, fn) { this.listeners[name] = fn; }
    getContext() { return {}; }
  }
  for (const [, id] of html.matchAll(/id="([^"]+)"/g)) nodes.set('#' + id, new Element());
  nodes.get('#voiceAlert').hidden = nodes.get('#voiceRetry').hidden = true;
  const samples = ['server', 'customer', 'learner'].map(role => { const n = new Element(); n.dataset.testvoice = role; return n; });
  const document = {
    hidden: false,
    querySelector: s => { assert.ok(nodes.has(s), 'Unknown element: ' + s); return nodes.get(s); },
    querySelectorAll: s => s === '[data-testvoice]' ? samples : [],
    createElement: () => new Element(),
    addEventListener: (name, fn) => { documentEvents[name] = fn; }
  };
  const synth = {
    speaking: false, pending: false, paused: false, utterances: [], cancellations: 0, resumes: 0, voices,
    getVoices() { if (throwVoices) throw Error('Unavailable'); return this.voices; },
    addEventListener: (name, fn) => { voiceEvents[name] = fn; },
    speak(u) { if (throwSpeak) throw Error('Synthesis failed'); this.utterances.push({ u, gesture }); this.speaking = true; },
    cancel() { this.cancellations++; this.speaking = this.pending = false; const u = this.utterances.at(-1)?.u; u?.onerror?.({ error: 'canceled' }); },
    resume() { this.resumes++; this.paused = false; }
  };
  const window = { addEventListener: (name, fn) => { windowEvents[name] = fn; } };
  if (supported) window.speechSynthesis = synth;
  if (constructor) window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  const context = vm.createContext({ window, document, console, SpeechSynthesisUtterance: window.SpeechSynthesisUtterance,
    setTimeout: (fn, delay = 0) => { const id = ++nextTimer; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout: id => timers.delete(id) });
  vm.runInContext(controller, context);
  const run = code => vm.runInContext(code, context);
  const tap = target => { const n = typeof target === 'string' ? nodes.get(target) : target; gesture = true; try { (n.onclick || n.listeners.click)?.({ target: n }); } finally { gesture = false; } };
  const tick = ms => { const until = now + ms; let n = 0; while (true) { const entry = [...timers].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at)[0]; if (!entry) break; assert.ok(++n < 1000, 'Timer loop'); now = entry[1].at; timers.delete(entry[0]); entry[1].fn(); } now = until; };
  const current = () => synth.utterances.at(-1).u;
  const start = () => current().onstart?.();
  const end = () => { const u = current(); synth.speaking = false; u.onend?.(); };
  const error = code => { synth.speaking = false; current().onerror?.({ error: code }); };
  const visible = hidden => { document.hidden = hidden; documentEvents.visibilitychange(); };
  return { run, tap, tick, start, end, error, visible, synth, nodes, samples, voiceEvents, current, windowEvents,
    text: () => nodes.get('#voiceAlertText').textContent, choice: n => nodes.get('#dialogChoices').children[n] };
}

test('first welcome is submitted in the start tap, without cancel or timeout', () => {
  const t = setup(); t.tap('#startBtn');
  assert.equal(t.synth.utterances.length, 1); assert.equal(t.synth.utterances[0].gesture, true);
  assert.match(t.current().text, /Bonjour/); assert.equal(t.synth.cancellations, 0);
});

test('welcome, learner choice and server response play in sequence; stale end is ignored', () => {
  const t = setup(); t.tap('#startBtn'); t.start(); const welcome = t.current(); t.tap(t.choice(0));
  assert.equal(t.synth.utterances.length, 1); t.end();
  assert.match(t.current().text, /Une table pour une personne/); t.start(); welcome.onend();
  assert.equal(t.synth.utterances.length, 2); t.end();
  assert.match(t.current().text, /Installez-vous/); t.start(); t.end();
  assert.equal(t.synth.cancellations, 0); assert.equal(t.run('voiceBusy'), false);
});

test('missing start event stops the queue and offers a gesture-based retry', () => {
  const t = setup(); t.tap('#startBtn'); t.tap(t.choice(0)); t.tick(8000);
  assert.match(t.text(), /n’a pas démarré/); assert.equal(t.synth.utterances.length, 1);
  assert.equal(t.run('voiceBusy'), false); assert.equal(t.nodes.get('#voiceRetry').hidden, false);
  t.tap('#voiceRetry'); assert.equal(t.synth.utterances.length, 2); assert.equal(t.synth.utterances[1].gesture, true);
  t.start(); assert.equal(t.nodes.get('#voiceAlert').hidden, true);
});

test('missing end event times out without silently skipping to the next speaker', () => {
  const t = setup(); t.tap('#startBtn'); t.start(); t.tap(t.choice(0)); t.tick(30000);
  assert.match(t.text(), /bloquée/); assert.equal(t.synth.utterances.length, 1);
  t.tap('#repeatBtn'); assert.match(t.current().text, /Installez-vous/); assert.equal(t.synth.utterances.at(-1).gesture, true);
});

for (const [code, message] of [['not-allowed', /nouveau toucher/], ['voice-unavailable', /voix choisie/], ['language-unavailable', /voix française/], ['network', /connexion/], ['audio-busy', /occupée/], ['audio-hardware', /Bluetooth/], ['synthesis-failed', /échoué/], ['interrupted', /interrompue/]]) {
  test('visible error and stopped queue: ' + code, () => {
    const t = setup(); t.tap('#startBtn'); t.start(); t.tap(t.choice(0)); t.error(code);
    assert.match(t.text(), message); assert.equal(t.synth.utterances.length, 1);
    assert.equal(t.nodes.get('#voiceAlert').hidden, false); assert.equal(t.run('voiceQueue.length'), 0);
  });
}

test('synchronous synthesis exception gets a recoverable message', () => {
  const t = setup({ throwSpeak: true }); t.tap('#startBtn');
  assert.match(t.text(), /échoué/); assert.equal(t.run('voiceBusy'), false);
  assert.equal(t.nodes.get('#voiceRetry').hidden, false);
});

test('empty or hidden voices allow a French attempt; late voices refresh the selection', () => {
  const t = setup({ voices: [] }); t.tap('#startBtn');
  assert.equal(t.current().lang, 'fr-FR'); assert.equal(t.current().voice, undefined);
  assert.match(t.text(), /Aucune voix française détectée/);
  t.start(); t.end(); t.synth.voices = [local]; t.voiceEvents.voiceschanged();
  assert.match(t.nodes.get('#voiceNote').textContent, /Une seule/);
  t.tap('#repeatBtn'); assert.equal(t.current().voice, local);
});

test('getVoices exception cannot break the game or first speech gesture', () => {
  const t = setup({ throwVoices: true }); t.tap('#startBtn');
  assert.equal(t.synth.utterances[0].gesture, true); assert.equal(t.current().lang, 'fr-FR');
});

test('automatic choice prefers a local French voice; explicit remote choice is honored', () => {
  const t = setup({ voices: [remote, local] }); t.tap('#startBtn');
  assert.equal(t.current().voice, local); t.start(); t.end();
  t.run("voicePrefs.server='remote-fr'"); t.tap('#repeatBtn'); assert.equal(t.current().voice, remote);
});

for (const config of [{ supported: false }, { constructor: false }]) {
  test('missing speech API component shows a fallback and leaves dialogue usable: ' + JSON.stringify(config), () => {
    const t = setup(config); t.tap('#startBtn'); assert.match(t.nodes.get('#dialogText').textContent, /Bonjour/);
    assert.match(t.text(), /indisponible/); assert.equal(t.nodes.get('#soundBtn').disabled, true);
    assert.equal(t.synth.utterances.length, 0); t.tap(t.choice(0)); assert.match(t.nodes.get('#dialogText').textContent, /Installez-vous/);
  });
}

test('explicit Listen enables muted sound, while ordinary choices respect mute', () => {
  const t = setup(); t.tap('#soundBtn'); t.tap('#startBtn'); t.tap(t.choice(0));
  assert.equal(t.synth.utterances.length, 0); t.tap('#repeatBtn');
  assert.equal(t.synth.utterances.length, 1); assert.equal(t.run('state.sound'), true);
  assert.equal(t.nodes.get('#soundBtn').attrs['aria-pressed'], 'true');
});

test('rapid replacements keep just the latest request and hold following dialogue behind it', () => {
  const t = setup(); t.tap('#startBtn'); t.start(); t.tap('#repeatBtn'); t.tick(40);
  t.tap(t.samples[1]); t.run("speak('Ensuite.', 'server')"); t.tick(99);
  assert.equal(t.synth.utterances.length, 1); t.tick(1);
  assert.match(t.current().text, /retrouver des amis/); assert.equal(t.synth.utterances.length, 2);
  t.start(); t.end(); assert.equal(t.current().text, 'Ensuite.');
});

test('sound off/on cancels a pending replay permanently, even after sound is re-enabled', () => {
  const t = setup(); t.tap('#startBtn'); t.start(); t.tap('#repeatBtn');
  t.tap('#soundBtn'); t.tap('#soundBtn'); t.start(); t.tick(100); t.end();
  assert.equal(t.synth.utterances.length, 2); assert.equal(t.run('voiceQueue.length'), 0);
});

test('replacement before the first observed start requests a fresh synchronous tap', () => {
  const t = setup(); t.tap('#startBtn'); t.tap('#repeatBtn'); t.tick(100);
  assert.equal(t.synth.utterances.length, 1); assert.match(t.text(), /réinitialisée/);
  t.tap('#voiceRetry'); assert.equal(t.synth.utterances.length, 2); assert.equal(t.synth.utterances[1].gesture, true);
});

test('backgrounding clears active speech and queued dialogue without autoplay on return', () => {
  const t = setup(); t.tap('#startBtn'); t.start(); t.tap(t.choice(0));
  t.visible(true); t.tick(60000); t.visible(false);
  assert.equal(t.synth.utterances.length, 1); assert.match(t.text(), /quittant la page/);
  t.tap('#repeatBtn'); assert.equal(t.synth.utterances.length, 2); assert.equal(t.synth.utterances[1].gesture, true);
});

test('restart discards pending replay and ignores the previous utterance callbacks', () => {
  const t = setup(); t.tap('#startBtn'); t.start(); const old = t.current(); t.tap('#repeatBtn');
  t.tap('#restartBtn'); t.tick(100); old.onend(); old.onerror({ error: 'canceled' });
  assert.equal(t.synth.utterances.length, 1); assert.equal(t.nodes.get('#voiceAlert').hidden, true);
  t.tap('#startBtn'); assert.equal(t.synth.utterances.length, 2); assert.equal(t.synth.utterances[1].gesture, true);
});

test('opening voice settings cancels a delayed replay and each sample remains playable', () => {
  const t = setup(); t.tap('#startBtn'); t.start(); t.tap('#repeatBtn'); t.tap('#voiceSettingsBtn'); t.tick(100);
  assert.equal(t.synth.utterances.length, 1);
  for (const sample of t.samples) { t.tap(sample); t.start(); t.end(); }
  assert.equal(t.synth.utterances.length, 4);
});
