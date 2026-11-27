const params = new URLSearchParams(location.search);

// Each opening of the main demo gets its own state. Invitation links and
// paired phones still use their existing connection, including after reload.
export const freshDemo = window.parent === window &&
  !/^#(?:most|zdrowie|rodzina|workflow)=/.test(location.hash) &&
  params.get("most") !== "pomoc" && params.get("zdrowie") !== "pomoc" &&
  params.get("rodzina") !== "pomoc" &&
  !["most", "most3"].includes(params.get("pokaz") ?? "");

const saved = new Map<string, string>();
export const demoStorage = {
  getItem(key: string, persistent = false) {
    return freshDemo ? saved.get(key) ?? null : (persistent ? localStorage : sessionStorage).getItem(key);
  },
  setItem(key: string, value: string, persistent = false) {
    if (freshDemo) saved.set(key, value);
    else (persistent ? localStorage : sessionStorage).setItem(key, value);
  },
  removeItem(key: string) {
    if (freshDemo) saved.delete(key);
    else sessionStorage.removeItem(key);
  },
};
