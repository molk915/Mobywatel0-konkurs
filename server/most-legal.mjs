export const legalTemplates = Object.freeze({
  civil: {
    procedure: "Pełnomocnictwo szczególne · wzór cywilny",
    type: "specific", form: "Forma właściwa dla konkretnej czynności",
    scope: "Wyłącznie wskazana czynność demonstracyjna",
    basis: { label: "Kodeks cywilny, art. 98–101", href: "https://eli.gov.pl/eli/DU/1964/93/ogl/pol" },
    filing: "Zależy od czynności i odbiorcy dokumentu.",
    methods: ["kwalifikowany"],
  },
  administrative: {
    procedure: "Pełnomocnictwo w postępowaniu administracyjnym · wzór",
    type: "administrative", form: "Dokument elektroniczny · demonstracja",
    scope: "Odpowiedź na wskazane wezwanie w pokazie",
    basis: { label: "Kodeks postępowania administracyjnego, art. 32–33", href: "https://eli.gov.pl/eli/DU/1960/168/ogl/pol" },
    filing: "Weryfikacja dokumentu i kanału złożenia w konkretnej sprawie.",
    methods: ["zaufany", "osobisty", "kwalifikowany"],
  },
  tax: {
    procedure: "Pełnomocnictwo szczególne w sprawie podatkowej · wzór",
    type: "tax-specific", form: "Wymagania właściwe dla procedury podatkowej",
    scope: "Wskazana sprawa podatkowa w pokazie",
    basis: { label: "Ordynacja podatkowa i formularze KAS", href: "https://podatki.gov.pl/pelnomocnictwa/formularze-pelnomocnictwa" },
    filing: "W pokazie symulujemy sprawdzenie zakresu. W usłudze urzędowej rodzaj pełnomocnictwa i sposób złożenia zależą od czynności.",
    methods: ["zaufany", "osobisty", "kwalifikowany"],
  },
});

export function formalTemplateFor(resource) {
  if (resource === "letter" || resource === "registration") return "administrative";
  if (resource === "tax" || resource === "tax-address") return "tax";
  return "civil";
}
