/**
 * Módulo unificado para resolución y llamada resiliente a proveedores de IA
 * Soporta:
 * 1. Vercel AI Gateway (AI_GATEWAY_API_KEY o VERCEL_OIDC_TOKEN automático en Vercel)
 * 2. OpenAI directo (OPENAI_API_KEY / OPENAI_API_TOKEN)
 * 3. Enrutamiento automático si una clave sk- se coloca en AI_GATEWAY_API_KEY
 * 4. Respaldo en cascada (si un proveedor falla con 401/402/500, prueba el siguiente)
 */

export interface AiProviderConfig {
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: 'vercel_ai_gateway' | 'openai';
}

export interface AiCompletionOptions {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  jsonMode?: boolean;
}

export interface AiCompletionResult {
  content: string;
  provider: 'vercel_ai_gateway' | 'openai';
  configName: string;
}

export function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '***';
  return `${key.slice(0, 6)}...${key.slice(-4)} (${key.length} chars)`;
}

export function getAiConfigs(): AiProviderConfig[] {
  const configs: AiProviderConfig[] = [];

  // 1. Claves explícitas de Vercel AI Gateway
  const explicitGatewayKey =
    process.env.AI_GATEWAY_API_KEY ||
    process.env.VERCEL_AI_GATEWAY_API_KEY ||
    process.env.AI_GATEWAY_TOKEN ||
    process.env.VERCEL_AI_GATEWAY_TOKEN ||
    process.env.NEXT_PUBLIC_AI_GATEWAY_API_KEY;

  if (explicitGatewayKey) {
    if (explicitGatewayKey.startsWith('sk-')) {
      // Clave de OpenAI colocada por error en la variable de Vercel Gateway
      configs.push({
        name: 'openai_direct_from_gateway_var',
        apiKey: explicitGatewayKey,
        baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        provider: 'openai',
      });
    } else {
      configs.push({
        name: 'vercel_ai_gateway_explicit',
        apiKey: explicitGatewayKey,
        baseUrl: process.env.AI_GATEWAY_BASE_URL || 'https://ai-gateway.vercel.sh/v1',
        model: process.env.AI_GATEWAY_MODEL || 'openai/gpt-4o-mini',
        provider: 'vercel_ai_gateway',
      });
    }
  }

  // 2. Token OIDC que Vercel inyecta automáticamente en deployments (producción/preview)
  const oidcToken = process.env.VERCEL_OIDC_TOKEN;
  if (oidcToken) {
    configs.push({
      name: 'vercel_oidc_gateway',
      apiKey: oidcToken,
      baseUrl: process.env.AI_GATEWAY_BASE_URL || 'https://ai-gateway.vercel.sh/v1',
      model: process.env.AI_GATEWAY_MODEL || 'openai/gpt-4o-mini',
      provider: 'vercel_ai_gateway',
    });
  }

  // 3. Clave directa de OpenAI
  const openaiKey =
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_API_TOKEN ||
    process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (openaiKey && openaiKey !== explicitGatewayKey) {
    configs.push({
      name: 'openai_direct',
      apiKey: openaiKey,
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      provider: 'openai',
    });
  }

  // 4. Claves genéricas de AI
  const genericKey = process.env.AI_TOKEN || process.env.AI_KEY;
  if (genericKey && genericKey !== explicitGatewayKey && genericKey !== openaiKey) {
    if (genericKey.startsWith('sk-')) {
      configs.push({
        name: 'openai_generic',
        apiKey: genericKey,
        baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        provider: 'openai',
      });
    } else {
      configs.push({
        name: 'gateway_generic',
        apiKey: genericKey,
        baseUrl: process.env.AI_GATEWAY_BASE_URL || 'https://ai-gateway.vercel.sh/v1',
        model: process.env.AI_GATEWAY_MODEL || 'openai/gpt-4o-mini',
        provider: 'vercel_ai_gateway',
      });
    }
  }

  return configs;
}

export function getAiDiagnostics(): {
  configured: boolean;
  activeProviders: string[];
  environment: string;
} {
  const configs = getAiConfigs();
  return {
    configured: configs.length > 0,
    activeProviders: configs.map(c => `${c.name} [${maskKey(c.apiKey)}] -> ${c.baseUrl}`),
    environment: process.env.NODE_ENV || 'development',
  };
}

export async function callAiCompletion(options: AiCompletionOptions): Promise<AiCompletionResult | null> {
  const configs = getAiConfigs();

  if (configs.length === 0) {
    console.warn(
      '[AI Provider] No se encontraron credenciales de IA en el entorno. Variables verificadas: AI_GATEWAY_API_KEY, VERCEL_OIDC_TOKEN, OPENAI_API_KEY, AI_GATEWAY_TOKEN, VERCEL_AI_GATEWAY_API_KEY, AI_TOKEN.'
    );
    return null;
  }

  for (const config of configs) {
    try {
      const bodyPayload: Record<string, unknown> = {
        model: config.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.max_tokens ?? 800,
      };

      if (options.jsonMode) {
        bodyPayload.response_format = { type: 'json_object' };
      }

      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(bodyPayload),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = data.choices?.[0]?.message?.content || '';
        return {
          content,
          provider: config.provider,
          configName: config.name,
        };
      }

      const errData = await response.json().catch(() => ({}));
      console.warn(
        `[AI Provider Warning] Configuración "${config.name}" devolvió HTTP ${response.status}:`,
        errData
      );
      // Intenta con la siguiente configuración disponible si hay error (401, 402, 429, 500, etc.)
    } catch (err) {
      console.warn(
        `[AI Provider Connection Error] Configuración "${config.name}":`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return null;
}
