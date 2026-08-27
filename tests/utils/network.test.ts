import { isValidNetwork, resolveNetworkConfig, resolveRpcUrl } from "../../src/utils/network";

describe("isValidNetwork", () => {
  it("returns true for testnet", () => {
    expect(isValidNetwork("testnet")).toBe(true);
  });

  it("returns true for mainnet", () => {
    expect(isValidNetwork("mainnet")).toBe(true);
  });

  it("returns true for futurenet", () => {
    expect(isValidNetwork("futurenet")).toBe(true);
  });

  it("returns true for local", () => {
    expect(isValidNetwork("local")).toBe(true);
  });

  it("returns false for unknown network", () => {
    expect(isValidNetwork("devnet")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidNetwork("")).toBe(false);
  });
});

describe("resolveNetworkConfig", () => {
  it("returns config for testnet", () => {
    const config = resolveNetworkConfig("testnet");
    expect(config.network).toBe("testnet");
  });

  it("returns config with non-empty rpcUrl", () => {
    const config = resolveNetworkConfig("mainnet");
    expect(config.rpcUrl.length).toBeGreaterThan(0);
  });

  it("throws for unknown network", () => {
    expect(() => resolveNetworkConfig("invalidnet")).toThrow(
      'Unknown network "invalidnet"'
    );
  });

  it("error message lists valid options", () => {
    expect(() => resolveNetworkConfig("bad")).toThrow("testnet");
  });

  it("overrides rpcUrl when one is provided", () => {
    const config = resolveNetworkConfig("testnet", "https://my-custom-node.example");
    expect(config.rpcUrl).toBe("https://my-custom-node.example");
    expect(config.network).toBe("testnet");
    expect(config.networkPassphrase).toContain("Test SDF Network");
  });

  it("does not mutate the shared NETWORK_CONFIGS entry when overriding rpcUrl", () => {
    resolveNetworkConfig("testnet", "https://my-custom-node.example");
    // A later call with no override must see the real default again —
    // proves the override didn't leak into shared state.
    expect(resolveNetworkConfig("testnet").rpcUrl).not.toBe("https://my-custom-node.example");
  });

  it("ignores an empty-string rpcUrl override", () => {
    const config = resolveNetworkConfig("testnet", "");
    expect(config.rpcUrl).not.toBe("");
  });
});

describe("resolveRpcUrl", () => {
  it("returns the testnet RPC URL", () => {
    expect(resolveRpcUrl("testnet")).toContain("testnet");
  });

  it("returns a URL starting with https for mainnet", () => {
    expect(resolveRpcUrl("mainnet").startsWith("https://")).toBe(true);
  });

  it("throws for unknown network", () => {
    expect(() => resolveRpcUrl("unknown")).toThrow();
  });
});
