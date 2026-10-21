/**
 * LLM integration point for the agent layer.
 *
 * The prototype ships with the `simulated` provider: every agent in
 * `engine.ts` is deterministic and rule-based, so the demo runs with no model,
 * no GPU and no network. The architecture calls for an Ollama-hosted
 * multi-agent layer; when that's ready, implement `OllamaProvider.complete()`
 * (POST `${OLLAMA_URL}/api/generate`) and have the agents call
 * `getProvider().complete(prompt)` to *narrate or refine* their rule-based
 * output — the rule-based result stays as the fallback so the product never
 * hard-fails when the model is unavailable.
 */

export interface LLMProvider {
  readonly name: string;
  complete(prompt: string): Promise<string>;
}

class SimulatedProvider implements LLMProvider {
  readonly name = "simulated";
  async complete(): Promise<string> {
    return "";
  }
}

export function getProvider(): LLMProvider {
  // Future: return new OllamaProvider(process.env.OLLAMA_URL, process.env.OLLAMA_MODEL)
  return new SimulatedProvider();
}
