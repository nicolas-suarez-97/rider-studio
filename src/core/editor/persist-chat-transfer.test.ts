import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SectionItem } from '../types/rider.types.ts';
import {
  applyChatSuggestionsToRiderSections,
  persistChatTransferToRider,
  shouldPersistChatTransferOnServer,
} from './persist-chat-transfer.ts';

function section(partial: Partial<SectionItem> & Pick<SectionItem, 'id' | 'title'>): SectionItem {
  return {
    num: '01',
    subtitle: '',
    tag: 'Audio',
    tagColor: '',
    iconName: 'mic',
    content: '',
    ...partial,
  };
}

describe('shouldPersistChatTransferOnServer', () => {
  it('persiste en servidor solo en /artista/chat sin editorContext', () => {
    assert.equal(shouldPersistChatTransferOnServer(undefined), true);
  });

  it('no persiste si hay editorContext aunque el rider esté vacío o disperso', () => {
    assert.equal(shouldPersistChatTransferOnServer({
      sectionId: '',
      sectionText: '',
      allSections: [],
    }), false);
    assert.equal(shouldPersistChatTransferOnServer({
      sectionId: 'tech-audio',
      sectionText: 'DiGiCo SD12',
      allSections: [{ id: 'tech-audio' }],
    }), false);
  });
});

describe('applyChatSuggestionsToRiderSections', () => {
  it('inserta en la sección existente usando el id estable', () => {
    const result = applyChatSuggestionsToRiderSections({
      sections: [section({ id: 'tech-audio', title: 'Audio FOH', content: 'Yamaha CL5' })],
      suggestions: [{
        kind: 'insert',
        sectionId: 'tech-audio',
        proposedText: 'DiGiCo SD12 con fuente redundante',
      }],
    });

    assert.equal(result.ok, true);
    assert.equal(result.sections?.[0].id, 'tech-audio');
    assert.match(result.sections?.[0].content || '', /Yamaha CL5/);
    assert.match(result.sections?.[0].content || '', /DiGiCo SD12/);
    assert.ok(result.sections?.[0].contentDoc);
  });

  it('crea un bloque nuevo con id estable cuando la sugerencia es add_section', () => {
    const result = applyChatSuggestionsToRiderSections({
      sections: [],
      suggestions: [{
        kind: 'add_section',
        newSectionTitle: 'Hospitality',
        proposedText: '- Late check-out a las 14:00',
      }],
    });

    assert.equal(result.ok, true);
    assert.equal(result.sections?.length, 1);
    assert.match(result.sections?.[0].id || '', /^section-/);
    assert.equal(result.sections?.[0].title, 'Hospitality');
    assert.match(result.sections?.[0].content || '', /Late check-out/);
  });

  it('reemplaza el contenido de la sección objetivo', () => {
    const result = applyChatSuggestionsToRiderSections({
      sections: [section({ id: 'tech-audio', title: 'Audio FOH', content: 'Consola vieja' })],
      suggestions: [{
        kind: 'replace',
        sectionId: 'tech-audio',
        baseText: 'Consola vieja',
        proposedText: 'DiGiCo SD12',
      }],
    });

    assert.equal(result.ok, true);
    assert.equal(result.sections?.[0].content?.includes('Consola vieja'), false);
    assert.match(result.sections?.[0].content || '', /DiGiCo SD12/);
  });

  it('no muta las secciones si el texto es un aviso no transferible', () => {
    const sections = [section({ id: 'tech-audio', title: 'Audio FOH', content: 'Yamaha CL5' })];
    const result = applyChatSuggestionsToRiderSections({
      sections,
      suggestions: [{
        kind: 'insert',
        sectionId: 'tech-audio',
        proposedText: '⚠️ No se pudo obtener una respuesta del servicio de IA en este momento. Por favor, vuelve a intentar.',
      }],
    });

    assert.equal(result.ok, false);
    assert.match(result.error || '', /no pude/i);
    assert.equal(sections[0].content, 'Yamaha CL5');
  });
});

describe('persistChatTransferToRider', () => {
  it('falla en español si no hay riderId', async () => {
    const result = await persistChatTransferToRider({
      suggestions: [{ kind: 'insert', sectionId: 'tech-audio', proposedText: 'DiGiCo SD12' }],
    });

    assert.equal(result.ok, false);
    assert.match(result.error || '', /rider/i);
    assert.doesNotMatch(result.error || '', /He pasado el contenido/i);
  });

  it('carga el rider, aplica insert/add_section y guarda las sections', async () => {
    const saved: Array<{ id?: string; sections?: unknown }> = [];
    const result = await persistChatTransferToRider({
      riderId: 'rider-1',
      suggestions: [{
        kind: 'insert',
        sectionId: 'tech-audio',
        proposedText: 'DiGiCo SD12',
      }],
      loadRider: async (id) => {
        assert.equal(id, 'rider-1');
        return {
          id: 'rider-1',
          title: 'Rider técnico',
          artist_name: 'Banda',
          rider_type: 'tecnico',
          sections: [section({ id: 'tech-audio', title: 'Audio FOH', content: 'CL5' })],
        };
      },
      saveRider: async (payload) => {
        saved.push(payload);
        return payload;
      },
    });

    assert.equal(result.ok, true);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].id, 'rider-1');
    const persisted = saved[0].sections as SectionItem[];
    assert.equal(persisted[0].id, 'tech-audio');
    assert.match(persisted[0].content || '', /DiGiCo SD12/);
  });

  it('falla en español si el rider no existe', async () => {
    const result = await persistChatTransferToRider({
      riderId: 'missing',
      suggestions: [{ kind: 'add_section', newSectionTitle: 'FOH', proposedText: 'SD12' }],
      loadRider: async () => null,
      saveRider: async () => {
        throw new Error('no debería guardar');
      },
    });

    assert.equal(result.ok, false);
    assert.match(result.error || '', /no pude/i);
  });
});
