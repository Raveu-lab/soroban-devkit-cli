import { Network, NETWORK_CONFIGS, NetworkConfig } from "@soroban-devkit/core";

/**
 * network.ts
 *
 * Pure utility functions for resolving and validating network configuration.
 * Single Responsibility: network name parsing and RPC URL resolution only.
 */

const VALID_NETWORKS: Network[] = ["mainnet", "testnet", "futurenet", "local"];

/**
 * Returns true if the given string is a valid Network identifier.
 */
export function isValidNetwork(value: string): value is Network {
  return VALID_NETWORKS.includes(value as Network);
}

/**
 * Resolve a network name string to a full NetworkConfig.
 * Throws a descriptive error if the network name is not recognised.
 */
export function resolveNetworkConfig(network: string): NetworkConfig {
  if (!isValidNetwork(network)) {
    throw new Error(
      `Unknown network "${network}". Valid options: ${VALID_NETWORKS.join(", ")}`
    );
  }
  return NETWORK_CONFIGS[network];
}

/**
 * Return the RPC URL for a given network name.
 * Throws if the network name is not recognised.
 */
export function resolveRpcUrl(network: string): string {
  return resolveNetworkConfig(network).rpcUrl;
}
