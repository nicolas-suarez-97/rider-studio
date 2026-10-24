import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyArtistShareAction,
  listArtistShareItems,
  needsArtistAction,
  summarizeArtistShareItems,
} from './artist-confirms.ts';
import { readShareConfirms } from './confirm.ts';

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
      guestNames: [],
    });
  });
});
