export function pollWhileVisible(
  run: (signal: AbortSignal) => Promise<void>,
  interval: number,
  active: () => boolean = () => true,
  immediate = true,
) {
  const controller = new AbortController();
  let timer: number | undefined;
  let running = false;
  let failures = 0;
  const ready = () => !controller.signal.aborted && active() && !document.hidden && navigator.onLine;

  function schedule(delay: number) {
    window.clearTimeout(timer);
    if (ready()) timer = window.setTimeout(poll, delay);
  }

  async function poll() {
    if (!ready() || running) return;
    running = true;
    try {
      await run(controller.signal);
      failures = 0;
    } catch {
      failures = Math.min(failures + 1, 5);
    } finally {
      running = false;
      schedule(Math.min(interval * 2 ** failures, 60_000));
    }
  }

  function resume() {
    window.clearTimeout(timer);
    void poll();
  }

  document.addEventListener("visibilitychange", resume);
  window.addEventListener("online", resume);
  window.addEventListener("offline", resume);
  if (immediate) void poll();
  else schedule(interval);
  return () => {
    controller.abort();
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", resume);
    window.removeEventListener("online", resume);
    window.removeEventListener("offline", resume);
  };
}
