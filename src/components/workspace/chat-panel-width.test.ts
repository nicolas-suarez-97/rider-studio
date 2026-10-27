import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CHAT_PANEL_COMPACT_CLASS,
  CHAT_PANEL_EXPANDED_CLASS,
  CHAT_PANEL_RAIL_CLASS,
  chatExpandControlLabel,
  chatPanelWidthClass,
} from './chat-panel-width.ts';

describe('chatPanelWidthClass', () => {
  it('usa el ancho compacto por defecto cuando el chat está visible', () => {
    assert.equal(
      chatPanelWidthClass({ collapsed: false, expanded: false }),
      CHAT_PANEL_COMPACT_CLASS,
    );
  });

  it('usa un ancho mayor en modo ampliado sin ocultar el editor', () => {
    const expanded = chatPanelWidthClass({ collapsed: false, expanded: true });
    assert.equal(expanded, CHAT_PANEL_EXPANDED_CLASS);
    assert.notEqual(expanded, CHAT_PANEL_COMPACT_CLASS);
    assert.notEqual(expanded, CHAT_PANEL_RAIL_CLASS);
  });

  it('conserva el rail existente si el panel está colapsado', () => {
    assert.equal(
      chatPanelWidthClass({ collapsed: true, expanded: true }),
      CHAT_PANEL_RAIL_CLASS,
    );
  });
});

describe('chatExpandControlLabel', () => {
  it('nombra Expandir chat y Contraer chat según el estado', () => {
    assert.equal(chatExpandControlLabel(false), 'Expandir chat');
    assert.equal(chatExpandControlLabel(true), 'Contraer chat');
  });
});
