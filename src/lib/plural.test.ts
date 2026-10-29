import { describe, expect, it } from "vitest";
import i18n from "../i18n";

function setLang(lng: string) {
  return i18n.changeLanguage(lng);
}

const t = (key: string, opts: Record<string, unknown>) => i18n.t(`common:${key}`, opts);

describe("plural forms via i18next", () => {
  it("English uses one/other", async () => {
    await setLang("en");
    expect(t("statusbar.invoices", { count: 1 })).toBe("1 invoice");
    expect(t("statusbar.invoices", { count: 2 })).toBe("2 invoices");
    expect(t("statusbar.invoices", { count: 0 })).toBe("0 invoices");
  });

  it("Russian uses one/few/many", async () => {
    await setLang("ru");
    expect(t("statusbar.invoices", { count: 1 })).toBe("1 счёт");
    expect(t("statusbar.invoices", { count: 2 })).toBe("2 счёта");
    expect(t("statusbar.invoices", { count: 5 })).toBe("5 счетов");
    expect(t("statusbar.invoices", { count: 21 })).toBe("21 счёт");
    expect(t("statusbar.invoices", { count: 22 })).toBe("22 счёта");
  });

  it("Lithuanian uses one/few/other", async () => {
    await setLang("lt");
    expect(t("statusbar.invoices", { count: 1 })).toBe("1 sąskaita");
    expect(t("statusbar.invoices", { count: 2 })).toBe("2 sąskaitos");
    expect(t("statusbar.invoices", { count: 10 })).toBe("10 sąskaitų");
    expect(t("statusbar.invoices", { count: 21 })).toBe("21 sąskaita");
    expect(t("statusbar.invoices", { count: 25 })).toBe("25 sąskaitos");
  });
});
