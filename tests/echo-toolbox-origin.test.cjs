// Run from the Exo root: node --test /path/to/this/echo-toolbox-origin.test.cjs
// All student utterances below are synthetic fixtures, never observed student data.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const sourceRoot = process.env.ECHO_SOURCE_ROOT || process.cwd();
const source = name => fs.readFileSync(path.join(sourceRoot, 'PO/conversation-ia', name), 'utf8');

function setup() {
  class Element {
    constructor(tag = 'div') { this.tag = tag; this.children = []; this.listeners = {}; this.textContent = ''; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    closest() { return null; }
    scrollIntoView() {}
    click() { return this.listeners.click?.(); }
    remove() {}
  }
  const ids = ['panel', 'status', 'content', 'theme', 'strength', 'items', 'strategy', 'copy', 'download'];
  const elements = Object.fromEntries(ids.map(id => ['toolbox-' + id, new Element()]));
  const output = {};
  const context = vm.createContext({
    document: { getElementById: id => elements[id], createElement: tag => new Element(tag), body: new Element('body') },
    navigator: { clipboard: { writeText: async text => { output.copied = text; } } },
    Blob,
    URL: { createObjectURL: blob => { output.blob = blob; return 'blob:test'; }, revokeObjectURL() {} },
    setTimeout: callback => callback(),
    crypto: { randomUUID }
  });
  vm.runInContext(source('echo-toolbox.js'), context);
  vm.runInContext(source('echo-pilot-features.js'), context);
  return {
    context, elements, output,
    toolbox: context.ECHO_TOOLBOX.create(),
    flags: () => elements['toolbox-items'].children.map(row => row.children[0].children[1].textContent)
  };
}
const payload = (origine = 'deja_utilisee', expression = 'dans certains cas') => ({
  theme: 'Les vêtements', points_forts: '',
  items: [{ expression, role: 'Nuancer un propos.', exemple: 'Dans certains cas, la tenue compte.', categorie: 'expression', origine }],
  prochaine_piste: 'Essaie une formulation nuancée.'
});
const checked = 'Dans certains cas, la tenue compte.';
const neutral = 'Expression à retenir';

for (const [name, origin, transcript, verified, expression, expected] of [
  ['no transcript, claimed use', 'deja_utilisee', undefined, undefined, undefined, neutral],
  ['no transcript, suggestion', 'a_reemployer', '', undefined, undefined, neutral],
  ['unverified matching ASR', 'deja_utilisee', checked, undefined, undefined, neutral],
  ['explicitly unverified text', 'deja_utilisee', checked, false, undefined, neutral],
  ['truthy flag is not verification', 'deja_utilisee', checked, 'true', undefined, neutral],
  ['verified empty text', 'deja_utilisee', '   ', true, undefined, neutral],
  ['verified punctuation-only text', 'deja_utilisee', '...', true, undefined, neutral],
  ['non-string evidence', 'deja_utilisee', { text: checked }, true, undefined, neutral],
  ['verified exact student use', 'deja_utilisee', checked, true, undefined, 'Déjà employé'],
  ['unmatched claimed use stays unknown', 'deja_utilisee', 'La tenue compte.', true, undefined, neutral],
  ['verified context and proposed resource', 'a_reemployer', 'La tenue compte.', true, undefined, 'À réemployer'],
  ['reuse suggestion does not claim novelty', 'a_reemployer', checked, true, undefined, 'À réemployer'],
  ['unknown model origin', 'unknown', checked, true, undefined, neutral],
  ['missing model origin', null, checked, true, undefined, neutral],
  ['whole word, not a substring', 'deja_utilisee', 'Cet article est intéressant.', true, 'art', neutral],
  ['apostrophe, case and punctuation', 'deja_utilisee', 'C’est, bien sûr, L’APPARENCE.', true, "l'apparence", 'Déjà employé'],
  ['canonical Unicode accents', 'deja_utilisee', 'Une ide\u0301e intéressante.', true, 'idée', 'Déjà employé'],
  ['distinct accented words stay distinct', 'deja_utilisee', 'Il a raison.', true, 'à', neutral],
  ['empty normalized expression never matches', 'deja_utilisee', checked, true, '…', neutral]
]) {
  test(name, () => {
    const app = setup();
    assert.equal(app.toolbox.receive(payload(origin, expression), transcript, verified), true);
    assert.deepEqual(app.flags(), [expected]);
    assert.ok(app.toolbox.getText().includes('(' + expected.toLocaleLowerCase('fr') + ')'));
  });
}

test('model payload cannot attest its own evidence', () => {
  const app = setup();
  const input = { ...payload(), studentTranscript: checked, transcriptVerified: true };
  input.items[0].transcriptVerified = true;
  app.toolbox.receive(input);
  assert.deepEqual(app.flags(), [neutral]);
});

test('no evidence leaks from a previous receive or reset', () => {
  const app = setup();
  app.toolbox.receive(payload(), checked, true);
  app.toolbox.receive(payload());
  assert.deepEqual(app.flags(), [neutral]);
  app.toolbox.clear();
  assert.equal(app.toolbox.getText(), '');
  assert.equal(app.elements['toolbox-copy'].disabled, true);
  app.toolbox.receive(payload());
  assert.deepEqual(app.flags(), [neutral]);
});

test('copy and download preserve the displayed three-way distinction', async () => {
  const app = setup();
  const input = payload();
  input.items.push(payload('a_reemployer', 'en revanche').items[0], payload('deja_utilisee', 'autrement dit').items[0]);
  app.toolbox.receive(input, checked, true);
  assert.deepEqual(app.flags(), ['Déjà employé', 'À réemployer', neutral]);
  await app.elements['toolbox-copy'].click();
  app.elements['toolbox-download'].click();
  assert.equal(app.output.copied, app.toolbox.getText());
  assert.equal(await app.output.blob.text(), app.toolbox.getText());
});

test('non-Latin output rejection and plain-text rendering remain active', () => {
  const app = setup();
  assert.equal(app.toolbox.receive(payload('a_reemployer', '你好')), false);
  assert.equal(app.elements['toolbox-content'].hidden, true);
  assert.equal(app.toolbox.receive(payload('a_reemployer', '<img src=x onerror=alert(1)>')), true);
  const expression = app.elements['toolbox-items'].children[0].children[0].children[0];
  assert.equal(expression.textContent, '<img src=x onerror=alert(1)>');
  assert.deepEqual(expression.children, []);
});

test('bilan button still produces a toolbox and resumes audio; ASR stays disabled', () => {
  const app = setup();
  const features = app.context.ECHO_PILOT_FEATURES.create();
  const config = features.configure('Accompagne les apprenants entre B2 et C1.');
  assert.equal(config.input_audio_transcription, null);
  assert.equal(features.transcript, null);
  assert.ok(config.instructions.includes('Accompagne les apprenants entre B2 et C1.'));
  assert.ok(config.instructions.includes('français exclusivement'));
  assert.ok(config.instructions.includes('Aucun bilan automatique'));
  const sent = [];
  const session = { connected: true, stopped: false, eventChannel: { readyState: 'open', send: event => sent.push(JSON.parse(event)) } };
  features.onEvent(session, { type: 'response.done' });
  assert.equal(sent.length, 0);
  assert.equal(features.requestBilan(session), true);
  assert.equal(sent[0].type, 'session.update');
  features.onEvent(session, { type: 'session.updated' });
  assert.deepEqual(sent[1].response.modalities, ['text', 'audio']);
  const event = { type: 'response.function_call_arguments.done', call_id: 'test-bilan', name: 'publish_language_toolbox', arguments: JSON.stringify(payload()) };
  features.onEvent(session, event);
  features.onEvent(session, { type: 'response.done' });
  assert.deepEqual(app.flags(), [neutral]);
  const reply = sent.find(item => item.type === 'conversation.item.create');
  assert.equal(JSON.parse(reply.item.output).success, true);
  assert.deepEqual(sent.at(-1).response.modalities, ['text', 'audio']);
  const count = sent.length;
  features.onEvent(session, event);
  features.onEvent(session, { type: 'response.done' });
  assert.equal(sent.length, count);
});

test('oral bilan tool event still works without a preceding button click', () => {
  const app = setup();
  const features = app.context.ECHO_PILOT_FEATURES.create();
  features.configure('B2 à C1.');
  assert.equal(app.context.ECHO_PILOT_FEATURES.isTrigger('Écho, on fait le point ?'), true);
  const sent = [];
  const session = { connected: true, eventChannel: { readyState: 'open', send: event => sent.push(JSON.parse(event)) } };
  features.onEvent(session, { type: 'response.function_call_arguments.done', call_id: 'oral-bilan', name: 'publish_language_toolbox', arguments: JSON.stringify(payload()) });
  features.onEvent(session, { type: 'response.done' });
  assert.deepEqual(app.flags(), [neutral]);
  assert.equal(JSON.parse(sent[0].item.output).success, true);
  assert.deepEqual(sent[1].response.modalities, ['text', 'audio']);
});
