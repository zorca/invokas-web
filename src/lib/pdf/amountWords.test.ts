import { describe, expect, it } from "vitest";
import { formatAmountInWords } from "./amountWords";

describe("invoice amount in words", () => {
  it("spells a Lithuanian euro amount like the reference invoice", () => {
    expect(formatAmountInWords(4800, "EUR", "lt")).toBe("keturiasdešimt aštuoni EUR ir nulis ct");
  });

  it("keeps cents in the spoken amount", () => {
    expect(formatAmountInWords(4815, "EUR", "lt")).toBe("keturiasdešimt aštuoni EUR ir penkiolika ct");
  });

  it.each([
    ["en", "forty-eight EUR and fifteen ct"],
    ["ru", "сорок восемь EUR и пятнадцать ct"],
    ["uk", "сорок вісім EUR і п’ятнадцять ct"],
    ["pl", "czterdzieści osiem EUR i piętnaście ct"],
  ] as const)("spells the amount in %s", (language, expected) => {
    expect(formatAmountInWords(4815, "EUR", language)).toBe(expected);
  });
});
