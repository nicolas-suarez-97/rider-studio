import { APPROVED_HARDWARE_CATALOG, RIDER_RED_FLAG_RULES } from '@/core/constants/rider-guidelines';
import { RIDER_GENERATOR_SYSTEM_PROMPT } from '@/lib/agents/prompts/rider-llm-prompts';

/**
 * Reglas de calidad que ya estaban en el producto.
 * Se inyectan siempre; el catálogo de familias las complementa, no las sustituye.
 */
export function renderExistingQualityRules(): string {
  const flags = Object.values(RIDER_RED_FLAG_RULES)
    .map((rule) => `- ${rule.type} (−${rule.penaltyPoints}, ${rule.severity}): ${rule.description}`)
    .join('\n');

  const { paSystems, fohConsoles, microphonesAndDI, inEarSystems } = APPROVED_HARDWARE_CATALOG;

  return `=== REGLAS DE CALIDAD VIGENTES (se mantienen) ===
Estas reglas siguen aplicando en chat, redacción y auditoría. El catálogo de familias las complementa; no las anula.

${RIDER_GENERATOR_SYSTEM_PROMPT}

RED FLAGS:
${flags}

HARDWARE APROBADO (tier vigente):
- PA Tier 1: ${paSystems.tier1.join('; ')}
- PA Tier 2: ${paSystems.tier2.join('; ')}
- PA no aceptado: ${paSystems.banned.join('; ')}
- FOH Tier 1: ${fohConsoles.tier1.join('; ')}
- FOH Tier 2: ${fohConsoles.tier2.join('; ')}
- FOH no aceptado: ${fohConsoles.banned.join('; ')}
- Microfonía: ${microphonesAndDI.preferredBrands.join(', ')}
- DIs: ${microphonesAndDI.directBoxes.join('; ')}
- IEM: ${inEarSystems.preferred.join('; ')}`;
}
