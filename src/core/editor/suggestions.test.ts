import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseSuggestionJson } from './suggestions.ts';

const BROKEN_JSON_TABLE = `{
  "message": "Te dejo la tabla de monitores:

\`\`\`markdown
| Monitor | Modelo |
| --- | --- |
| IEM | Shure PSM1000 |
\`\`\`",
  "suggestions": []
}`;

describe('parseSuggestionJson', () => {
  it('extrae message y suggestions cuando el modelo mete saltos reales dentro del JSON', () => {
    const parsed = parseSuggestionJson(BROKEN_JSON_TABLE);
    assert.ok(parsed);
    assert.doesNotMatch(parsed.message, /"suggestions"/);
    assert.match(parsed.message, /Monitor/);
    assert.match(parsed.message, /Shure PSM1000/);
    assert.doesNotMatch(parsed.message, /```markdown/);
    assert.deepEqual(parsed.suggestions, []);
  });

  it('no confunde un fence markdown interno con el sobre JSON y conserva suggestions', () => {
    const raw = JSON.stringify({
      message: '```markdown\n| Canal | Mic |\n| --- | --- |\n| Voz | SM58 |\n```',
      suggestions: [{
        kind: 'insert',
        sectionId: 'tech-audio',
        proposedText: '| Canal | Mic |\n| --- | --- |\n| Voz | SM58 |',
      }],
    });
    const parsed = parseSuggestionJson(raw);
    assert.ok(parsed);
    assert.equal(parsed.suggestions.length, 1);
    assert.equal(parsed.suggestions[0].kind, 'insert');
    assert.equal(parsed.suggestions[0].sectionId, 'tech-audio');
    assert.match(parsed.suggestions[0].proposedText || '', /SM58/);
  });

  it('sigue parseando JSON válido y desenvuelve un fence markdown que envuelve todo el message', () => {
    const raw = JSON.stringify({
      message: '```markdown\n| Canal | Mic |\n| --- | --- |\n| Voz | SM58 |\n```',
      suggestions: [],
    });
    const parsed = parseSuggestionJson(raw);
    assert.ok(parsed);
    assert.match(parsed.message, /\| Canal \| Mic \|/);
    assert.match(parsed.message, /SM58/);
    assert.doesNotMatch(parsed.message, /```/);
  });
});
