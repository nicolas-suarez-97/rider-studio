import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  absoluteExclusionConflict,
  formatExclusionLabel,
  readAbsoluteExclusions,
  textIncludesExclusion,
} from './exclusions.ts';

const jblSrx = { id: 'ex-1', brand: 'JBL', model: 'SRX' };
const meyer = { id: 'ex-2', brand: 'Meyer' };

describe('lectura de exclusiones absolutas', () => {
  it('lee metadata.absoluteExclusions e ignora filas sin marca', () => {
    assert.deepEqual(readAbsoluteExclusions({}), []);
    assert.deepEqual(
      readAbsoluteExclusions({
        absoluteExclusions: [
          { id: 'ex-1', brand: 'JBL', model: 'SRX' },
          { brand: '  ', model: 'K2' },
          { id: 'ex-2', brand: 'Meyer' },
        ],
      }),
      [jblSrx, meyer]
    );
  });
});

describe('match simple de exclusión', () => {
  it('marca + modelo opcional son subcadenas del texto, sin importar mayúsculas', () => {
    assert.equal(textIncludesExclusion('PA JBL SRX828P en towers', jblSrx), true);
    assert.equal(textIncludesExclusion('jbl srx en sidefills', jblSrx), true);
    assert.equal(textIncludesExclusion('JBL VTX', jblSrx), false);
    assert.equal(textIncludesExclusion('L-Acoustics K2', meyer), false);
    assert.equal(textIncludesExclusion('Meyer Sound LEO', meyer), true);
  });
});

describe('conflicto al confirmar', () => {
  it('bloquea Aprobado si el pedido incluye una exclusión vigente', () => {
    const error = absoluteExclusionConflict({
      exclusions: [jblSrx],
      pedido: 'Sistema PA: JBL SRX828P',
      response: 'cubro',
      offer: '',
    });
    assert.match(error || '', /no aceptado/i);
    assert.match(error || '', /JBL/i);
  });

  it('bloquea Alternativa si la oferta incluye marca o modelo excluido', () => {
    const error = absoluteExclusionConflict({
      exclusions: [meyer],
      pedido: 'PA L-Acoustics K2',
      response: 'alternativa',
      offer: 'Podemos poner Meyer UPQ',
    });
    assert.match(error || '', /no aceptado/i);
    assert.match(error || '', /Meyer/i);
  });

  it('no bloquea si la exclusión ya no está en la lista', () => {
    const error = absoluteExclusionConflict({
      exclusions: [],
      pedido: 'Sistema PA: JBL SRX828P',
      response: 'cubro',
      offer: '',
    });
    assert.equal(error, null);
  });

  it('no bloquea Rechazado ni Pregunta aunque el texto mencione la marca', () => {
    const rejected = absoluteExclusionConflict({
      exclusions: [jblSrx],
      pedido: 'JBL SRX',
      response: 'no_puedo',
      offer: '',
    });
    const question = absoluteExclusionConflict({
      exclusions: [jblSrx],
      pedido: 'JBL SRX',
      response: 'pregunta',
      offer: '',
    });
    assert.equal(rejected, null);
    assert.equal(question, null);
  });

  it('etiqueta marca · modelo para el copy de no aceptado', () => {
    assert.equal(formatExclusionLabel(jblSrx), 'JBL · SRX');
    assert.equal(formatExclusionLabel(meyer), 'Meyer');
  });
});
