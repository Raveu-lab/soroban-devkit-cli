import { parseSteps } from "../../src/commands/chain";

describe("parseSteps", () => {
  it("parses a JSON array of steps", () => {
    const steps = parseSteps(
      '[{"contract":"CABC","method":"approve","args":["GXYZ","1000000"],"caller":"GABC"}]'
    );
    expect(steps).toEqual([
      { contract: "CABC", method: "approve", args: ["GXYZ", "1000000"], caller: "GABC" },
    ]);
  });

  it("defaults a missing args field to an empty array", () => {
    const steps = parseSteps('[{"contract":"CABC","method":"get","caller":"GABC"}]');
    expect(steps[0].args).toEqual([]);
  });

  it("parses multiple steps in order", () => {
    const steps = parseSteps(
      '[{"contract":"C1","method":"m1","caller":"G1"},{"contract":"C2","method":"m2","caller":"G2"}]'
    );
    expect(steps).toHaveLength(2);
    expect(steps[0].method).toBe("m1");
    expect(steps[1].method).toBe("m2");
  });

  it("throws a descriptive error for invalid JSON", () => {
    expect(() => parseSteps("not json")).toThrow("--steps must be valid JSON");
  });

  it("throws for a JSON value that is not an array", () => {
    expect(() => parseSteps('{"contract":"CABC"}')).toThrow("--steps must be a JSON array");
  });

  it("throws for an empty array", () => {
    expect(() => parseSteps("[]")).toThrow("--steps must contain at least one step");
  });

  it("throws identifying which step is missing a required field", () => {
    expect(() => parseSteps('[{"contract":"CABC","caller":"GABC"}]')).toThrow(
      'step 0 is missing "method"'
    );
  });

  it("throws identifying a later invalid step by index", () => {
    expect(() =>
      parseSteps('[{"contract":"C1","method":"m1","caller":"G1"},{"contract":"C2"}]')
    ).toThrow('step 1 is missing "method"');
  });
});
