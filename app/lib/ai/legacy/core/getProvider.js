import { PROVIDER_REGISTRY } from "../providers/providerRegistry";

export function getProvider(agentName) {
  const provider = PROVIDER_REGISTRY[agentName];

  if (!provider) {
    throw new Error(`No provider configured for ${agentName}`);
  }

  return provider;
}
