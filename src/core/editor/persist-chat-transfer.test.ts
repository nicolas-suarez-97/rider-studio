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

  it('aplicar dos veces la misma corrección deja una sola versión vigente', () => {
    const sections = [section({ id: 'tech-audio', title: 'Audio FOH', content: 'Consola vieja' })];
    const correction = {
      kind: 'replace' as const,
      sectionId: 'tech-audio',
      baseText: 'Consola vieja',
      proposedText: 'DiGiCo SD12 con fuente redundante',
    };

    const first = applyChatSuggestionsToRiderSections({ sections, suggestions: [correction] });
    const second = applyChatSuggestionsToRiderSections({
      sections: first.sections || [],
      suggestions: [correction],
    });

    assert.equal(second.ok, true);
    assert.equal(second.sections?.length, 1);
    assert.equal(second.sections?.[0].id, 'tech-audio');
    const content = second.sections?.[0].content || '';
    assert.equal(content.includes('Consola vieja'), false);
    assert.equal(content.split('DiGiCo SD12 con fuente redundante').length - 1, 1);
  });

  it('una corrección insert sobre el mismo id reemplaza in-place y no añade otra instancia', () => {
    const result = applyChatSuggestionsToRiderSections({
      sections: [section({ id: 'tech-audio', title: 'Audio FOH', content: 'Consola vieja' })],
      suggestions: [{
        kind: 'insert',
        sectionId: 'tech-audio',
        baseText: 'Consola vieja',
        proposedText: 'DiGiCo SD12',
        rationale: 'Corregir la consola FOH del bloque.',
      }, {
        kind: 'insert',
        sectionId: 'tech-audio',
        baseText: 'Consola vieja',
        proposedText: 'DiGiCo SD12',
        rationale: 'Corregir la consola FOH del bloque.',
      }],
    });

    assert.equal(result.ok, true);
    assert.equal(result.sections?.filter((item) => item.id === 'tech-audio').length, 1);
    const content = result.sections?.[0].content || '';
    assert.equal(content.includes('Consola vieja'), false);
    assert.equal(content.split('DiGiCo SD12').length - 1, 1);
  });

  it('si el bloque ya está proposed, la corrección actualiza ese proposed sin duplicar confirmed', () => {
    const result = applyChatSuggestionsToRiderSections({
      sections: [section({
        id: 'tech-audio',
        title: 'Audio FOH',
        content: 'DiGiCo SD12',
        revision: 'proposed',
      })],
      suggestions: [{
        kind: 'replace',
        sectionId: 'tech-audio',
        baseText: 'DiGiCo SD12',
        proposedText: 'Yamaha CL5',
      }],
    });

    assert.equal(result.ok, true);
    assert.equal(result.sections?.length, 1);
    assert.equal(result.sections?.[0].id, 'tech-audio');
    assert.equal(result.sections?.[0].revision, 'proposed');
    assert.equal(result.sections?.[0].content, 'Yamaha CL5');
  });

  it('si el bloque está confirmed, la corrección reemplaza proposed del mismo id sin duplicar confirmed', () => {
    const result = applyChatSuggestionsToRiderSections({
      sections: [section({
        id: 'tech-audio',
        title: 'Audio FOH',
        content: 'Consola confirmada',
        revision: 'confirmed',
      })],
      suggestions: [{
        kind: 'replace',
        sectionId: 'tech-audio',
        baseText: 'Consola confirmada',
        proposedText: 'DiGiCo SD12',
      }],
    });

    assert.equal(result.ok, true);
    assert.equal(result.sections?.filter((item) => item.id === 'tech-audio').length, 1);
    assert.equal(result.sections?.[0].content, 'DiGiCo SD12');
    assert.equal(result.sections?.[0].revision, 'proposed');
    assert.equal(result.sections?.[0].content?.includes('Consola confirmada'), false);
  it('dos alternativas al mismo bloque dejan solo la sugerencia activa', () => {
    const result = applyChatSuggestionsToRiderSections({
      sections: [section({ id: 'tech-audio', title: 'Audio FOH', content: 'Yamaha CL5' })],
      suggestions: [
        { kind: 'insert', sectionId: 'tech-audio', proposedText: 'DiGiCo SD12' },
        { kind: 'insert', sectionId: 'tech-audio', proposedText: 'Avid S6L' },
      ],
    });

    assert.equal(result.ok, true);
    assert.match(result.sections?.[0].content || '', /Yamaha CL5/);
    assert.match(result.sections?.[0].content || '', /Avid S6L/);
    assert.doesNotMatch(result.sections?.[0].content || '', /DiGiCo SD12/);
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
