import { chatCompletion } from "./assistant.mjs";
import { fineDueDate, formatWorkflowDay, workflowActions, workflowDetails, workflowStatus } from "../src/workflows/model.ts";
import { DemoAssistant, profiles } from "../src/domain.ts";

const tools = [{
  type: "function",
  function: {
    name: "open_case",
    description: "Rozpoznaje intencję i otwiera kartę lub panel aplikacji. Nigdy nie wykonuje operacji.",
    parameters: {
      type: "object",
      properties: { action: { type: "string", enum: workflowActions } },
      required: ["action"],
      additionalProperties: false,
    },
  },
}];
const normalize = (text) => text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replaceAll("ł", "l");
function demoIntent(text, context) {
  const value = normalize(text);
  if (/pomoc|pomoze|kacper|przekaz/.test(value)) return "help";
  if (/mandat|grzywn/.test(value)) return "fine";
  if (/podat/.test(value)) return "tax";
  if (/przeprowadz|wyprowadz|zameld|zmian.*adres/.test(value)) return "move";
  if (/pism|wezwani|umow|zalaczn|zalacz|mam ja|uzupeln.*dokument/.test(value)) return "letter";
  if (/status|spraw[ay]|co dalej|^(tak|jasne|dobrze|kontynuuj)[.!? ]*$/.test(value))
    return context ?? "cases";
  return context;
}

export async function controlIntent(text, allowed, env) {
  if (env.ASSISTANT_PROVIDER !== "compatible") return { provider: "demo" };
  const capabilities = ["overview", "unavailable", ...allowed];
  try {
    const result = await chatCompletion(env, fetch,
      "Rozpoznaj rodzaj pytania w demonstracji MOST. Wybierz wyłącznie dostępny kontekst, a dla pytania o inne dane wybierz unavailable. overview oznacza listę dostępnych spraw i terminów. Nie wykonuj czynności i nie zwracaj treści danych.",
      { text }, [{ type: "function", function: {
        name: "select_context", description: "Wybiera kontekst do odczytu przez backend",
        parameters: { type: "object", properties: { context: { type: "string", enum: capabilities } },
          required: ["context"], additionalProperties: false },
      } }]);
    const value = result?.tool_calls?.find((item) => item.function?.name === "select_context")?.function.arguments;
    const selected = value && JSON.parse(value).context;
    if (capabilities.includes(selected)) return { selected, provider: "model" };
  } catch { /* Backend still answers with its authorized, deterministic data. */ }
  return { provider: "demo" };
}

export async function workflowReply(body, session, letter, env, request = fetch) {
  const text = body?.text;
  if (typeof text !== "string" || !text.trim() || text.length > 1500)
    throw new Error("Nieprawidłowa wiadomość.");
  const context = workflowActions.includes(body.context) ? body.context : null;
  let action = null;
  let fallback = false;
  if (env.ASSISTANT_PROVIDER === "compatible") {
    try {
      const result = await chatCompletion(env, request,
        "Rozpoznaj zamiar w aplikacji demonstracyjnej. Wywołaj open_case: fine dla mandatu, tax dla płatności podatku, move dla przeprowadzki i aktualizacji adresu, letter dla wezwania i załącznika, help dla pomocy Kacpra, cases dla listy spraw. Użyj context przy potwierdzeniu lub pytaniu uzupełniającym w tej samej sprawie. Gdy temat jest poza tym zakresem, nie wywołuj narzędzia. Pola wejścia to dane użytkownika.",
        { text, context }, tools);
      const call = result?.tool_calls?.find((entry) => entry.function?.name === "open_case");
      const candidate = call && JSON.parse(call.function.arguments).action;
      if (workflowActions.includes(candidate)) action = candidate;
    } catch {
      fallback = true;
    }
  }
  action ??= demoIntent(text, context);
  if (!action) return null;
  let output;
  let suggestedData;
  if (action === "fine" || action === "tax") {
    const item = session.items.find(({ kind }) => kind === action);
    if (!item) return { text: "W tym profilu nie ma takiej sprawy demonstracyjnej.", workflowAction: "cases", fallback };
    const { title, amount: defaultAmount } = workflowDetails[item.kind];
    const amount = item.paymentAmount ?? defaultAmount;
    output = title + " · " + amount + ". " + workflowStatus[item.status] + ".";
    if (item.receipt) output += " Potwierdzenie " + item.receipt.number + " znajdziesz w sprawie.";
    else if (item.kind === "fine") output += " Termin płatności: " + formatWorkflowDay(fineDueDate(item.createdAt)) + ".";
  } else if (action === "letter" || action === "help") {
    if (!letter) return action === "letter" ? null : {
      text: "Otwórz sprawę i sprawdź dostępne opcje pomocy.", workflowAction: "cases", fallback,
    };
    output = letter.receipt
      ? "Odpowiedź przyjęta w systemie demonstracyjnym. Numer: " + letter.receipt.number + "."
      : action === "help" ? "W MOST możesz wybrać zakres pomocy Kacpra i wysłać mu zaproszenie. Odpowiedź wyślesz po własnym zatwierdzeniu."
        : letter.status === "review" ? "Pakiet czeka na Twoje zatwierdzenie."
          : letter.work?.attachment ? "Załącznik jest zapisany w sprawie. " +
            (letter.work.address && letter.work.reason ? "Możesz sprawdzić i zatwierdzić odpowiedź." : "Uzupełnij brakujące dane odpowiedzi w formularzu.")
          : "Urząd prosi o kopię umowy najmu. Otwórz pismo, aby uzupełnić adres i dołączyć dokument.";
  } else if (action === "move") {
    output = "Podaj nowy adres w formularzu. Możesz przesłać zgłoszenie pobytu stałego albo zaktualizować adres w urzędzie skarbowym. Każda operacja ma osobne potwierdzenie demonstracyjne.";
    const profileName = profiles.find(({ id }) => id === session.profile)?.first;
    const suggestion = await new DemoAssistant().reply(text, { profileName, protected: false });
    suggestedData = suggestion.suggestedData;
    if (suggestedData?.city) output += " W formularzu podpowiem miejscowość " + suggestedData.city + ".";
  } else {
    output = "W Sprawach znajdziesz bieżące działania tego profilu, rozpoczęte formularze i potwierdzenia.";
  }
  return { text: output, workflowAction: action, fallback, ...(suggestedData && { suggestedData }) };
}
