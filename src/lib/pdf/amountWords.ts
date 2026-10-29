import type { AppLanguage } from "@/i18n";

type Forms = readonly [string, string, string];

function slavicForm(value: number, forms: Forms): string {
  const lastTwo = value % 100;
  const last = value % 10;
  if (lastTwo >= 11 && lastTwo <= 19) return forms[2];
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

const LT_ONES = ["nulis", "vienas", "du", "trys", "keturi", "penki", "šeši", "septyni", "aštuoni", "devyni"] as const;
const LT_TEENS = ["dešimt", "vienuolika", "dvylika", "trylika", "keturiolika", "penkiolika", "šešiolika", "septyniolika", "aštuoniolika", "devyniolika"] as const;
const LT_TENS = ["", "", "dvidešimt", "trisdešimt", "keturiasdešimt", "penkiasdešimt", "šešiasdešimt", "septyniasdešimt", "aštuoniasdešimt", "devyniasdešimt"] as const;

function lithuanianUnderThousand(value: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  if (hundreds > 0) parts.push(hundreds === 1 ? "vienas šimtas" : `${LT_ONES[hundreds]} šimtai`);
  if (remainder >= 10 && remainder < 20) parts.push(LT_TEENS[remainder - 10]);
  else {
    const tens = Math.floor(remainder / 10);
    const ones = remainder % 10;
    if (tens > 0) parts.push(LT_TENS[tens]);
    if (ones > 0) parts.push(LT_ONES[ones]);
  }
  return parts.join(" ");
}

function lithuanianInteger(value: number): string {
  if (value === 0) return LT_ONES[0];
  const groups: Array<[number, Forms]> = [
    [1_000_000, ["milijonas", "milijonai", "milijonų"]],
    [1_000, ["tūkstantis", "tūkstančiai", "tūkstančių"]],
  ];
  const parts: string[] = [];
  let remainder = value;
  for (const [size, forms] of groups) {
    const count = Math.floor(remainder / size);
    if (count > 0) {
      const lastTwo = count % 100;
      const last = count % 10;
      const form = lastTwo >= 11 && lastTwo <= 19 ? forms[2] : last === 1 ? forms[0] : last === 0 ? forms[2] : forms[1];
      parts.push(lithuanianUnderThousand(count), form);
      remainder %= size;
    }
  }
  if (remainder > 0) parts.push(lithuanianUnderThousand(remainder));
  return parts.join(" ");
}

const EN_ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"] as const;
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"] as const;
function englishUnderThousand(value: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  if (hundreds) parts.push(`${EN_ONES[hundreds]} hundred`);
  if (remainder < 20) {
    if (remainder) parts.push(EN_ONES[remainder]);
  } else {
    const tens = EN_TENS[Math.floor(remainder / 10)];
    const one = remainder % 10;
    parts.push(one ? `${tens}-${EN_ONES[one]}` : tens);
  }
  return parts.join(" ");
}
function englishInteger(value: number): string {
  if (value === 0) return EN_ONES[0];
  const parts: string[] = [];
  let remainder = value;
  for (const [size, name] of [[1_000_000, "million"], [1_000, "thousand"]] as const) {
    const count = Math.floor(remainder / size);
    if (count) { parts.push(englishUnderThousand(count), name); remainder %= size; }
  }
  if (remainder) parts.push(englishUnderThousand(remainder));
  return parts.join(" ");
}

type SlavicConfig = {
  zero: string;
  ones: readonly string[];
  feminineOnes: readonly string[];
  teens: readonly string[];
  tens: readonly string[];
  hundreds: readonly string[];
  thousand: Forms;
  million: Forms;
};
const RU: SlavicConfig = {
  zero: "ноль",
  ones: ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"],
  feminineOnes: ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"],
  teens: ["десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"],
  tens: ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"],
  hundreds: ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"],
  thousand: ["тысяча", "тысячи", "тысяч"], million: ["миллион", "миллиона", "миллионов"],
};
const UK: SlavicConfig = {
  zero: "нуль",
  ones: ["", "один", "два", "три", "чотири", "п’ять", "шість", "сім", "вісім", "дев’ять"],
  feminineOnes: ["", "одна", "дві", "три", "чотири", "п’ять", "шість", "сім", "вісім", "дев’ять"],
  teens: ["десять", "одинадцять", "дванадцять", "тринадцять", "чотирнадцять", "п’ятнадцять", "шістнадцять", "сімнадцять", "вісімнадцять", "дев’ятнадцять"],
  tens: ["", "", "двадцять", "тридцять", "сорок", "п’ятдесят", "шістдесят", "сімдесят", "вісімдесят", "дев’яносто"],
  hundreds: ["", "сто", "двісті", "триста", "чотириста", "п’ятсот", "шістсот", "сімсот", "вісімсот", "дев’ятсот"],
  thousand: ["тисяча", "тисячі", "тисяч"], million: ["мільйон", "мільйони", "мільйонів"],
};
function slavicUnderThousand(value: number, config: SlavicConfig, feminine = false): string {
  const parts: string[] = [];
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  if (hundreds) parts.push(config.hundreds[hundreds]);
  if (remainder >= 10 && remainder < 20) parts.push(config.teens[remainder - 10]);
  else {
    const tens = Math.floor(remainder / 10);
    const ones = remainder % 10;
    if (tens) parts.push(config.tens[tens]);
    if (ones) parts.push((feminine ? config.feminineOnes : config.ones)[ones]);
  }
  return parts.join(" ");
}
function slavicInteger(value: number, config: SlavicConfig): string {
  if (value === 0) return config.zero;
  const millions = Math.floor(value / 1_000_000);
  const thousands = Math.floor((value % 1_000_000) / 1_000);
  const rest = value % 1_000;
  const parts: string[] = [];
  if (millions) parts.push(slavicUnderThousand(millions, config), slavicForm(millions, config.million));
  if (thousands) parts.push(slavicUnderThousand(thousands, config, true), slavicForm(thousands, config.thousand));
  if (rest) parts.push(slavicUnderThousand(rest, config));
  return parts.join(" ");
}

const PL_ONES = ["zero", "jeden", "dwa", "trzy", "cztery", "pięć", "sześć", "siedem", "osiem", "dziewięć"] as const;
const PL_TEENS = ["dziesięć", "jedenaście", "dwanaście", "trzynaście", "czternaście", "piętnaście", "szesnaście", "siedemnaście", "osiemnaście", "dziewiętnaście"] as const;
const PL_TENS = ["", "", "dwadzieścia", "trzydzieści", "czterdzieści", "pięćdziesiąt", "sześćdziesiąt", "siedemdziesiąt", "osiemdziesiąt", "dziewięćdziesiąt"] as const;
const PL_HUNDREDS = ["", "sto", "dwieście", "trzysta", "czterysta", "pięćset", "sześćset", "siedemset", "osiemset", "dziewięćset"] as const;
function polishUnderThousand(value: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  if (hundreds) parts.push(PL_HUNDREDS[hundreds]);
  if (remainder >= 10 && remainder < 20) parts.push(PL_TEENS[remainder - 10]);
  else {
    const tens = Math.floor(remainder / 10);
    const ones = remainder % 10;
    if (tens) parts.push(PL_TENS[tens]);
    if (ones) parts.push(PL_ONES[ones]);
  }
  return parts.join(" ");
}
function polishInteger(value: number): string {
  if (value === 0) return PL_ONES[0];
  const parts: string[] = [];
  let remainder = value;
  for (const [size, forms] of [[1_000_000, ["milion", "miliony", "milionów"]], [1_000, ["tysiąc", "tysiące", "tysięcy"]]] as const) {
    const count = Math.floor(remainder / size);
    if (count) { parts.push(polishUnderThousand(count), slavicForm(count, forms)); remainder %= size; }
  }
  if (remainder) parts.push(polishUnderThousand(remainder));
  return parts.join(" ");
}

const INTEGER_FORMATTERS: Record<AppLanguage, (value: number) => string> = {
  lt: lithuanianInteger,
  en: englishInteger,
  ru: (value) => slavicInteger(value, RU),
  uk: (value) => slavicInteger(value, UK),
  pl: polishInteger,
};
const CONJUNCTIONS: Record<AppLanguage, string> = { lt: "ir", en: "and", ru: "и", uk: "і", pl: "i" };

export function formatAmountInWords(totalMinor: number, currency: string, language: AppLanguage): string {
  const safeMinor = Math.min(99_999_999_999, Math.max(0, Math.round(totalMinor)));
  const major = Math.floor(safeMinor / 100);
  const cents = safeMinor % 100;
  const words = INTEGER_FORMATTERS[language];
  return `${words(major)} ${currency} ${CONJUNCTIONS[language]} ${words(cents)} ct`;
}