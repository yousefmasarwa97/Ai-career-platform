import https from 'https';
import { config } from '../config';

// Single abstraction through which every agent reaches an LLM.
// This is the one place where the external-LLM policy flag is enforced
// (Requirement 15.5): candidate/CV data is only sent to an external
// provider when AI_PROVIDER=openai AND ALLOW_EXTERNAL_LLM=true.

export interface AiProvider {
  readonly name: string;
  readonly isExternal: boolean;
  complete(prompt: string): Promise<string>;
}

// -------- Local provider (deterministic, no network, no API key) --------
// Provides useful structured analysis using simple heuristics so the whole
// platform runs offline and never leaks data to third parties.
class LocalProvider implements AiProvider {
  readonly name = 'local';
  readonly isExternal = false;

  async complete(prompt: string): Promise<string> {
    // The agents mostly build their own structured findings and only use
    // the provider for short natural-language phrasing. The local provider
    // echoes a concise, deterministic summary line.
    const firstLine = prompt.split('\n').find((l) => l.trim().length > 0) || '';
    return `Local analysis: ${firstLine.slice(0, 200)}`;
  }
}

// -------- OpenAI-compatible provider (external, policy-gated) --------
class OpenAiProvider implements AiProvider {
  readonly name = 'openai';
  readonly isExternal = true;

  async complete(prompt: string): Promise<string> {
    const body = JSON.stringify({
      model: config.openai.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });

    const url = new URL(config.openai.baseUrl + '/chat/completions');
    return new Promise<string>((resolve, reject) => {
      const req = https.request(
        {
          method: 'POST',
          hostname: url.hostname,
          path: url.pathname + url.search,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.openai.apiKey}`,
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (resp) => {
          let data = '';
          resp.on('data', (chunk) => (data += chunk));
          resp.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed?.choices?.[0]?.message?.content ?? '');
            } catch (e) {
              reject(e);
            }
          });
        }
      );
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}

let cached: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (cached) return cached;

  // Policy gate: only use the external provider if BOTH the provider is set
  // to openai AND external LLM use is explicitly allowed and a key exists.
  const wantsExternal = config.aiProvider === 'openai';
  const externalPermitted = config.allowExternalLlm && !!config.openai.apiKey;

  if (wantsExternal && externalPermitted) {
    cached = new OpenAiProvider();
  } else {
    if (wantsExternal && !externalPermitted) {
      // eslint-disable-next-line no-console
      console.warn(
        '[ai] AI_PROVIDER=openai but external LLM use is not permitted ' +
          '(ALLOW_EXTERNAL_LLM=false or missing OPENAI_API_KEY). Falling back to local provider.'
      );
    }
    cached = new LocalProvider();
  }
  return cached;
}
