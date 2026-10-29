import { describe, expect, it } from "vitest";
import { runtimeProblem } from "./browser-runtime";

describe("hosted browser runtime", () => {
  it("allows HTTP and HTTPS only", () => {
    expect(runtimeProblem("https:", "example.com", "")).toBeNull();
    expect(runtimeProblem("http:", "localhost", "")).toBeNull();
    expect(runtimeProblem("file:", "", "")).toBe("protocol");
    expect(runtimeProblem("data:", "", "")).toBe("protocol");
  });
  it("can bind production deployment to explicitly configured hosts", () => {
    expect(runtimeProblem("https:", "invokas.lt", "invokas.lt,www.invokas.lt")).toBeNull();
    expect(runtimeProblem("https:", "copy.example", "invokas.lt,www.invokas.lt")).toBe("host");
    expect(runtimeProblem("https:", "invokas.lt.evil.test", "invokas.lt")).toBe("host");
  });
});
