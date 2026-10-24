import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CONTEXT_REQUEST_MESSAGE,
  REUSE_LINKED_RIDER_MESSAGE,
  ASK_BEFORE_NEW_RIDER_MESSAGE,
  defaultContextDraft,
  isContextComplete,
  isGenerateRiderIntent,
  resolveRiderGenerationGate,
  seedRiderFromContext,
  suggestedSectionIds,
  summarizeContext,
  type SeedableRider,
} from './rider-generation-context.ts';

function fakeRider(sections: SeedableRider['sections'] = []): SeedableRider {
  const rider: SeedableRider = {
    type: 'tecnico',
    season: '',
    venue: '',
    sections: [...sections],
    applyTemplateOutline() {
      this.sections = [
        { id: 'doc-cover', title: 'Portada', content: '' },
        { id: 'tech-contactos', title: 'Contactos', content: '' },
        { id: 'tech-pa', title: 'PA', content: '' },
        { id: 'tech-monitores', title: 'Monitores', content: '' },
        { id: 'tech-backline', title: 'Backline', content: '' },
        { id: 'tech-inputlist', title: 'Input list', content: '' },
        { id: 'tech-stageplot', title: 'Stage plot', content: '' },
        { id: 'tech-iluminacion', title: 'Luces', content: '' },
        { id: 'tech-rigging', title: 'Rigging', content: '' },
        { id: 'tech-terminos', title: 'Términos', content: '' },
      ];
    },
    renumberSections() {},
    syncCurrentModule() {},
  };
  return rider;
}

describe('isGenerateRiderIntent', () => {
  it('detecta pedir generar o crear un rider', () => {
    assert.equal(isGenerateRiderIntent('genera un rider'), true);
    assert.equal(isGenerateRiderIntent('Quiero crear el rider técnico'), true);
    assert.equal(isGenerateRiderIntent('arma un rider desde cero'), true);
    assert.equal(isGenerateRiderIntent('necesito un rider para la gira'), true);
  });

  it('no trata consultas ni transferencias como generar rider', () => {
    assert.equal(isGenerateRiderIntent('¿qué consola me recomiendas?'), false);
    assert.equal(isGenerateRiderIntent('añade esto al rider'), false);
    assert.equal(isGenerateRiderIntent('genera un input list de batería'), false);
    assert.equal(isGenerateRiderIntent('qué es un rider'), false);
  });
});

describe('resolveRiderGenerationGate', () => {
  it('pide contexto si no hay rider_id y hay intención de generar', () => {
    const gate = resolveRiderGenerationGate({
      riderId: null,
      userText: 'genera un rider',
    });
    assert.deepEqual(gate, { action: 'request_context' });
  });

  it('no pide contexto si el mensaje no es generar rider', () => {
    const gate = resolveRiderGenerationGate({
      riderId: null,
      userText: '¿qué PA conviene en un teatro?',
    });
    assert.deepEqual(gate, { action: 'none' });
  });

  it('reutiliza el rider vinculado en un segundo generar', () => {
    const gate = resolveRiderGenerationGate({
      riderId: '11111111-1111-4111-8111-111111111111',
      userText: 'genera un rider',
    });
    assert.deepEqual(gate, {
      action: 'reuse_linked_rider',
      riderId: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('pregunta antes de crear otro rider si el chat ya tiene rider_id', () => {
    const gate = resolveRiderGenerationGate({
      riderId: '11111111-1111-4111-8111-111111111111',
      userText: 'crea un rider nuevo desde cero',
    });
    assert.deepEqual(gate, {
      action: 'ask_before_new_rider',
      riderId: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('no crea documento si el usuario cancela el contexto', () => {
    const gate = resolveRiderGenerationGate({
      riderId: null,
      userText: 'genera un rider',
      cancelled: true,
    });
    assert.deepEqual(gate, { action: 'none' });
  });
});

describe('isContextComplete', () => {
  it('exige gira/fecha, formato y escala elegida por el usuario', () => {
    const draft = defaultContextDraft();
    assert.equal(isContextComplete(draft), false);

    draft.scheduleKind = 'gira';
    draft.format = 'reducido';
    assert.equal(isContextComplete(draft), false);

    draft.scale = 'Club / sala';
    assert.equal(isContextComplete(draft), true);
  });

  it('no infiere la escala: si el usuario elige otra, pide el texto', () => {
    const draft = defaultContextDraft();
    draft.scheduleKind = 'fecha_individual';
    draft.format = 'completo';
    draft.scale = 'otra';
    assert.equal(isContextComplete(draft), false);
    draft.scaleOther = 'Showcase acústico';
    assert.equal(isContextComplete(draft), true);
  });
});

describe('suggestedSectionIds y seedRiderFromContext', () => {
  it('sugiere menos bloques en reducido que en completo', () => {
    const reduced = suggestedSectionIds('reducido', 'tecnico');
    const full = suggestedSectionIds('completo', 'tecnico');
    assert.ok(reduced.length > 0);
    assert.ok(full.length > reduced.length);
    assert.ok(reduced.includes('tech-contactos'));
    assert.ok(!reduced.includes('tech-rigging'));
  });

  it('alimenta la plantilla inicial sin rellenar requisitos no confirmados', () => {
    const rider = fakeRider();
    seedRiderFromContext(rider, {
      scheduleKind: 'gira',
      scheduleLabel: 'Latam 2026',
      format: 'reducido',
      scale: 'Club / sala',
      notes: 'sin backline de teclados',
    });

    assert.equal(rider.season, 'Gira · Latam 2026');
    assert.equal(rider.venue, 'Club / sala');
    assert.ok(rider.sections.some((section) => section.id === 'tech-contactos'));
    assert.equal(
      rider.sections.some((section) => section.id === 'tech-rigging'),
      false,
    );
    assert.equal(
      rider.sections.some((section) => /sin backline de teclados/i.test(section.content || '')),
      false,
    );
  });

  it('no borra secciones manuales al sugerir plantilla', () => {
    const rider = fakeRider([
      {
        id: 'custom-1',
        title: 'Notas del artista',
        content: 'El artista ya escribió este bloque a mano.',
      },
    ]);
    const before = rider.sections.map((section) => section.content);

    seedRiderFromContext(rider, {
      scheduleKind: 'fecha_individual',
      format: 'completo',
      scale: 'Teatro',
    });

    assert.ok(rider.sections.some((section) => section.title === 'Notas del artista'));
    assert.ok(rider.sections.some((section) => section.content.includes('ya escribió')));
    assert.deepEqual(
      rider.sections.filter((section) => section.title === 'Notas del artista').map((s) => s.content),
      before.filter(Boolean),
    );
  });
});

describe('copy de flujo', () => {
  it('tiene mensajes claros para pedir contexto, reutilizar y preguntar', () => {
    assert.match(CONTEXT_REQUEST_MESSAGE, /contexto/i);
    assert.match(REUSE_LINKED_RIDER_MESSAGE, /vinculado/i);
    assert.match(ASK_BEFORE_NEW_RIDER_MESSAGE, /nuevo/i);
    const summary = summarizeContext({
      scheduleKind: 'gira',
      scheduleLabel: 'Europa',
      format: 'intermedio',
      scale: 'Arena',
      notes: 'IEM propios',
    });
    assert.match(summary, /Gira/);
    assert.match(summary, /intermedio/i);
    assert.match(summary, /Arena/);
    assert.match(summary, /IEM propios/);
  });
});
