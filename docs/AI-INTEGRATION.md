# Asystent: jeden kontrakt, dwa sposoby uruchomienia

Domyślnie frontend używa `DemoAssistant` bez sieci i modelu. Ten sam provider jest wykorzystywany przez działający backend Node w `server/assistant.mjs`. Reguły rozpoznają trzy intencje i wybrane miejscowości. To jawny, ograniczony pokaz, nie LLM.

Backend uruchomisz poleceniem `npm run server`. Słucha tylko na `127.0.0.1:4190`. `GET /api/health` pokazuje tryb, `POST /api/assistant` obsługuje wiadomość. Aby użyć go z frontendem, ustaw w PowerShell `$env:VITE_ASSISTANT_MODE='server'`, następnie uruchom `npm run dev`. Vite przekazuje `/api` do lokalnego backendu, także w preview. Statyczny pokaz pozostaje domyślnie całkowicie lokalny i działa offline.

## Kontrakt

`AssistantProvider.reply(text, context, signal): Promise<Message>` w `src/domain.ts`.

```json
{"text":"Co mam zrobić dalej?","context":{"profileName":"Aleksandra","protected":false,"process":{"id":"DEMO-EXAMPLE","kind":"move","nextStep":"Czeka na dokument","completed":1,"total":2}}}
```

`process` jest opcjonalny. Nie wysyłamy zdjęcia, PESEL, plików, całej historii ani adresu profilu. Wiadomości w prototypie mogą zawierać wyłącznie dane fikcyjne. Odpowiedź kontekstowa:

```json
{"role":"assistant","text":"Następny krok: uzupełnij dokument.","caseId":"DEMO-EXAMPLE"}
```

Albo propozycja nowego planu:

```json
{"role":"assistant","text":"Przygotujmy plan.","action":"move","suggestedData":{"city":"Kraków"}}
```

Klient akceptuje tylko `move`, `wallet`, `letter`; sugerowane dane ogranicza do znanej miejscowości. `caseId` otwiera wyłącznie sprawę obecną w aktualnym profilu. Zgoda i wyniki operacji nigdy nie pochodzą z odpowiedzi modelu. Treść renderowana jest jako tekst. Zamknięcie asystenta przerywa żądanie; aktualizacja przypisana jest do profilu, który je rozpoczął.

## Podłączenie modelu

Przykład konfiguracji: `server/.env.example`. Po utworzeniu własnego pliku konfiguracji serwer można uruchomić przez `node --env-file=server/.env --experimental-strip-types server/index.mjs`.

- `ASSISTANT_PROVIDER=compatible`
- `MODEL_BASE_URL`: bazowy adres wdrożenia, np. kończący się `/v1`.
- `MODEL_NAME`: nazwa modelu na tym serwerze.
- `MODEL_API_KEY`: wyłącznie serwerowy sekret, opcjonalny dla lokalnego wdrożenia.
- `APP_ORIGIN`: dodatkowy dozwolony origin interfejsu.

Adapter korzysta z [Chat Completions i narzędzi](https://developers.openai.com/api/reference/resources/chat). Może obsłużyć wdrożenie Bielika lub PLLuM, jeżeli konkretny serwer implementuje ten kontrakt i tool calling. Zgodność trzeba sprawdzić dla wybranego wdrożenia. Sama nazwa modelu nie jest adresem API.

Narzędzie `prepare_process` zwraca rodzaj planu, uzasadnienie i ewentualnie miasto. Wynik przechodzi normalizację i otwiera edytowalny proces. Model nie ma dostępu do localStorage ani do `completeCase`. Nie zatwierdza zgód, nie zmienia dokumentów i nie wywołuje instytucji. Prawdziwe wykonanie operacji wymagałoby osobnego, autoryzowanego serwisu; nie jest częścią demonstratora.

Backend ogranicza wiadomość do 1500 znaków, żądanie do 8 KB, częstotliwość do 30/min/adres, a wywołanie modelu do 25 sekund. Weryfikuje profile demonstracyjne i minimalny kontekst. Nie zapisuje treści rozmów w logach. Klucze nie trafiają do `VITE_*`, pakietu frontendowego ani service workera. Serwer pozostaje lokalny; nie ma produkcyjnego logowania ani infrastruktury rejestrów. Do wdrożenia API potrzebny będzie osobny serwer i proxy tego samego originu.

Zweryfikowano rzeczywiste HTTP w trybie demo, błędne żądania, obcy origin, limit wielkości, kontekst sprawy i normalizację tool call na atrapach API. Nie wykonywano płatnych wywołań ani integracji z konkretnym wdrożeniem Bielika/PLLuM. W produkcyjnej PWA domyślnie nadal działa lokalny pokaz.

Kontekst rozszerzono o opcjonalne `screen` (home/documents/cases/privacy), `documentId` (0–3) i `drafts` (maks. trzy elementy kind/nextStep, bez zawartości formularza). Serwer waliduje te wartości. Odpowiedź może wskazać `documentId`, `shareDocumentId` lub `showPrivacy`; klient odrzuca numery poza zakresem i wyświetla kartę prowadzącą do istniejącego interfejsu. Nadal nie są to polecenia wykonania operacji.
