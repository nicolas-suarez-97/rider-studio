import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyArtistShareAction,
  clearShowReady,
  formatShowReadyLine,
  isApprovalInForce,
  isShowReady,
  listArtistShareItems,
  needsArtistAction,
  summarizeArtistShareItems,
  withShowReady,
} from './artist-confirms.ts';
import { mergeShareConfirms, readShareConfirms } from './confirm.ts';

describe('acciones del artista sobre shareConfirms', () => {
  const base = {
    ana: {
      name: 'Ana',
      answers: {
        'tecnico:tech-pa': { response: 'alternativa' as const, offer: 'Q1 de L-Acoustics', note: '' },
        'tecnico:tech-iem': { response: 'pregunta' as const, offer: '', note: '¿Cuántos packs?' },
        'tecnico:tech-rf': { response: 'no_puedo' as const, offer: '', note: 'No hay K2' },
        'tecnico:tech-foh': { response: 'cubro' as const, offer: '', note: '' },
      },
    },
  };

  it('cuenta pedidos con respuesta y los que piden acción del artista', () => {
    const items = listArtistShareItems(base, {
      'tecnico:tech-pa': 'PA L-Acoustics K2',
    });
    const summary = summarizeArtistShareItems(items);

    assert.equal(summary.answeredCount, 4);
    assert.equal(summary.needsActionCount, 3);
    assert.deepEqual(summary.guestNames, ['Ana']);
    assert.equal(items[0].pedido, 'PA L-Acoustics K2');
    assert.equal(items[0].organizerText, 'Q1 de L-Acoustics');
  });

  it('aceptar alternativa marca la oferta y baja el contador de acción', () => {
    const accepted = applyArtistShareAction(base, 'ana', 'tecnico:tech-pa', 'accept_alternative');
    assert.equal(accepted.error, null);
    assert.equal(accepted.confirms.ana.answers['tecnico:tech-pa']?.acceptedAlternative, true);
    assert.equal(accepted.confirms.ana.answers['tecnico:tech-pa']?.offer, 'Q1 de L-Acoustics');
    assert.equal(needsArtistAction(accepted.confirms.ana.answers['tecnico:tech-pa']!), false);
    assert.equal(summarizeArtistShareItems(listArtistShareItems(accepted.confirms)).needsActionCount, 2);
  });

  it('responder y proponer exigen texto y dejan de contar como pendientes', () => {
    const empty = applyArtistShareAction(base, 'ana', 'tecnico:tech-iem', 'reply', '   ');
    assert.match(empty.error || '', /texto/);

    const replied = applyArtistShareAction(base, 'ana', 'tecnico:tech-iem', 'reply', '4 packs estéreo');
    assert.equal(replied.error, null);
    assert.equal(replied.confirms.ana.answers['tecnico:tech-iem']?.artistResponse, '4 packs estéreo');
    assert.equal(needsArtistAction(replied.confirms.ana.answers['tecnico:tech-iem']!), false);

    const proposed = applyArtistShareAction(replied.confirms, 'ana', 'tecnico:tech-rf', 'propose', 'Usamos Kara');
    assert.equal(proposed.error, null);
    assert.equal(summarizeArtistShareItems(listArtistShareItems(proposed.confirms)).needsActionCount, 1);
  });

  it('lee artistResponse y acceptedAlternative sin romper el shape del thin #33', () => {
    const confirms = readShareConfirms({
      shareConfirms: {
        ana: {
          name: 'Ana',
          answers: {
            'tecnico:tech-pa': {
              response: 'alternativa',
              offer: 'Q1',
              note: '',
              acceptedAlternative: true,
              artistResponse: 'Ok con Q1',
            },
          },
        },
      },
    });
    const answer = confirms.ana.answers['tecnico:tech-pa'];
    assert.equal(answer?.acceptedAlternative, true);
    assert.equal(answer?.artistResponse, 'Ok con Q1');
    assert.equal(answer?.offer, 'Q1');
  });

  it('sin shareConfirms no hay ítems ni error', () => {
    const items = listArtistShareItems({});
    assert.deepEqual(items, []);
    assert.deepEqual(summarizeArtistShareItems(items), {
      answeredCount: 0,
      needsActionCount: 0,
      resolvedCount: 0,
      approvedCount: 0,
      acceptedAlternativeCount: 0,
      showReady: false,
      guestNames: [],
    });
  });

  it('con 0 pendientes del artista marca listo para el show y resume totales', () => {
    const items = listArtistShareItems({
      ana: {
        name: 'Ana',
        answers: {
          'tecnico:tech-foh': { response: 'cubro', offer: '', note: '' },
          'tecnico:tech-pa': {
            response: 'alternativa',
            offer: 'Q1',
            note: '',
            acceptedAlternative: true,
          },
          'tecnico:tech-iem': {
            response: 'pregunta',
            offer: '',
            note: '¿Packs?',
            artistResponse: '4 packs',
          },
        },
      },
    });
    const summary = summarizeArtistShareItems(items);

    assert.equal(isShowReady(items), true);
    assert.equal(summary.showReady, true);
    assert.equal(summary.answeredCount, 3);
    assert.equal(summary.resolvedCount, 3);
    assert.equal(summary.approvedCount, 1);
    assert.equal(summary.acceptedAlternativeCount, 1);
    assert.equal(summary.needsActionCount, 0);
    assert.equal(
      formatShowReadyLine(summary, 'artist'),
      '3 de 3 resueltos · 1 aprobado · 1 alternativa aceptada · 0 pendientes de tu lado'
    );
    assert.match(formatShowReadyLine(summary, 'organizer'), /0 pendientes del artista/);
    assert.equal(withShowReady({ season: '2026' }, {
      ana: {
        name: 'Ana',
        answers: {
          'tecnico:tech-foh': { response: 'cubro', offer: '', note: '' },
        },
      },
    }).showReady, true);
  });

  it('deja de estar listo si hay pendiente del artista o un pedido reabierto', () => {
    const pending = listArtistShareItems(base);
    assert.equal(isShowReady(pending), false);
    assert.equal(summarizeArtistShareItems(pending).showReady, false);
    assert.equal(withShowReady({ showReady: true }, base).showReady, false);

    const reopened = applyArtistShareAction(
      {
        ana: {
          name: 'Ana',
          answers: { 'tecnico:tech-foh': { response: 'cubro' as const, offer: '', note: '' } },
        },
      },
      'ana',
      'tecnico:tech-foh',
      'reopen',
      'Hay que revisar PA',
      { author: 'artista-ana' }
    );
    assert.equal(isShowReady(listArtistShareItems(reopened.confirms)), false);
    assert.equal(withShowReady({ showReady: true }, reopened.confirms).showReady, false);
  });

  it('reabrir exige motivo y solo aplica a aprobación o aceptación vigente', () => {
    const empty = applyArtistShareAction(base, 'ana', 'tecnico:tech-foh', 'reopen', '   ', {
      author: 'user-artista',
      now: '2026-10-24T20:00:00.000Z',
    });
    assert.match(empty.error || '', /motivo/);

    const pending = applyArtistShareAction(base, 'ana', 'tecnico:tech-iem', 'reopen', 'Reviso packs', {
      author: 'user-artista',
    });
    assert.match(pending.error || '', /aprobado|aceptaci/i);

    const accepted = applyArtistShareAction(base, 'ana', 'tecnico:tech-pa', 'accept_alternative');
    const reopenedAlt = applyArtistShareAction(
      accepted.confirms,
      'ana',
      'tecnico:tech-pa',
      'reopen',
      'No cierra el SPL',
      { author: 'user-artista', now: '2026-10-24T20:00:00.000Z' }
    );
    assert.equal(reopenedAlt.error, null);
    const alt = reopenedAlt.confirms.ana.answers['tecnico:tech-pa']!;
    assert.equal(alt.reopened, true);
    assert.equal(alt.reopenReason, 'No cierra el SPL');
    assert.equal(alt.reopenAuthor, 'user-artista');
    assert.equal(alt.reopenedAt, '2026-10-24T20:00:00.000Z');
    assert.equal(alt.acceptedAlternative, true);
    assert.equal(alt.offer, 'Q1 de L-Acoustics');
    assert.equal(alt.previousDecision?.acceptedAlternative, true);
    assert.equal(isApprovalInForce(alt), false);
  });

  it('tras reabrir deja de ser aprobación vigente y conserva la decisión anterior', () => {
    const reopened = applyArtistShareAction(base, 'ana', 'tecnico:tech-foh', 'reopen', 'Cambia el recinto', {
      author: 'artista-ana',
      now: '2026-10-24T21:15:00.000Z',
    });
    assert.equal(reopened.error, null);
    const answer = reopened.confirms.ana.answers['tecnico:tech-foh']!;
    assert.equal(answer.response, 'cubro');
    assert.equal(answer.reopened, true);
    assert.equal(answer.reopenReason, 'Cambia el recinto');
    assert.equal(answer.reopenAuthor, 'artista-ana');
    assert.equal(answer.reopenedAt, '2026-10-24T21:15:00.000Z');
    assert.deepEqual(answer.previousDecision, { response: 'cubro', offer: '', note: '' });
    assert.equal(isApprovalInForce(answer), false);

    const items = listArtistShareItems(reopened.confirms);
    const foh = items.find((item) => item.lineId === 'tecnico:tech-foh');
    assert.equal(foh?.reopened, true);
    assert.equal(foh?.canReopen, false);
    assert.equal(foh?.approvalInForce, false);
    assert.deepEqual(foh?.previousDecision, { response: 'cubro', offer: '', note: '' });

    const cubro = items.find((item) => item.lineId === 'tecnico:tech-foh' && !item.reopened);
    assert.equal(cubro, undefined);
    assert.equal(base.ana.answers['tecnico:tech-foh']?.canReopen, undefined);
    assert.equal(listArtistShareItems(base).find((item) => item.lineId === 'tecnico:tech-foh')?.canReopen, true);
  });

  it('apaga showReady al reabrir y deja de contar como listo para el show', () => {
    const readyItems = listArtistShareItems({
      ana: {
        name: 'Ana',
        answers: {
          'tecnico:tech-foh': { response: 'cubro', offer: '', note: '' },
        },
      },
    });
    assert.equal(isShowReady(readyItems), true);
    assert.equal(clearShowReady({ showReady: true, shareConfirms: {} }).showReady, false);

    const reopened = applyArtistShareAction(
      {
        ana: {
          name: 'Ana',
          answers: { 'tecnico:tech-foh': { response: 'cubro' as const, offer: '', note: '' } },
        },
      },
      'ana',
      'tecnico:tech-foh',
      'reopen',
      'Hay que revisar PA',
      { author: 'artista-ana' }
    );
    assert.equal(isShowReady(listArtistShareItems(reopened.confirms)), false);
    assert.equal(isApprovalInForce(reopened.confirms.ana.answers['tecnico:tech-foh']!), false);
  });

  it('una nueva respuesta del organizador cierra el reopen y no borra previousDecision', () => {
    const reopened = applyArtistShareAction(base, 'ana', 'tecnico:tech-foh', 'reopen', 'Cambia el recinto', {
      author: 'artista-ana',
      now: '2026-10-24T21:15:00.000Z',
    });
    const next = mergeShareConfirms(reopened.confirms, 'Ana', 'tecnico:tech-foh', {
      response: 'alternativa',
      offer: 'Kara',
      note: '',
    });
    const answer = next.ana.answers['tecnico:tech-foh']!;
    assert.equal(answer.response, 'alternativa');
    assert.equal(answer.offer, 'Kara');
    assert.notEqual(answer.reopened, true);
    assert.deepEqual(answer.previousDecision, { response: 'cubro', offer: '', note: '' });
    assert.equal(answer.reopenReason, 'Cambia el recinto');
    assert.equal(isApprovalInForce(answer), false);

    const closed = mergeShareConfirms(next, 'Ana', 'tecnico:tech-foh', {
      response: 'cubro',
      offer: '',
      note: '',
    });
    const closedAnswer = closed.ana.answers['tecnico:tech-foh']!;
    assert.equal(isApprovalInForce(closedAnswer), true);
    assert.deepEqual(closedAnswer.previousDecision, { response: 'cubro', offer: '', note: '' });
  });

  it('lee reopen y previousDecision sin romper el shape del thin #33', () => {
    const confirms = readShareConfirms({
      shareConfirms: {
        ana: {
          name: 'Ana',
          answers: {
            'tecnico:tech-foh': {
              response: 'cubro',
              offer: '',
              note: '',
              reopened: true,
              reopenReason: 'Cambia el recinto',
              reopenAuthor: 'artista-ana',
              reopenedAt: '2026-10-24T21:15:00.000Z',
              previousDecision: { response: 'cubro', offer: '', note: '' },
            },
          },
        },
      },
    });
    const answer = confirms.ana.answers['tecnico:tech-foh'];
    assert.equal(answer?.reopened, true);
    assert.equal(answer?.reopenReason, 'Cambia el recinto');
    assert.equal(answer?.reopenAuthor, 'artista-ana');
    assert.equal(answer?.previousDecision?.response, 'cubro');
    assert.equal(isApprovalInForce(answer!), false);
  });
});
