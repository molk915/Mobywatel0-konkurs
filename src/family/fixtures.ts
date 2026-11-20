export const familyMembers = {
  aleksandra: { name: "Aleksandra", relation: "Mama", document: "Paszport", attention: false },
  tomasz: { name: "Tomasz", relation: "Tata", document: "Paszport", attention: false },
  zosia: { name: "Zosia", relation: "Córka · 10 lat", document: "Paszport", attention: true },
} as const;

export const travelPurposes = ["Wyjazd wakacyjny", "Wizyta u rodziny", "Wycieczka szkolna"] as const;
export const passportOffices = ["Warszawa – Śródmieście", "Warszawa – Mokotów", "Warszawa – Wola"] as const;

export const requestScope = [
  "Imię i wiek Zosi",
  "Rodzaj dokumentu",
  "Cel podróży i punkt paszportowy",
];
