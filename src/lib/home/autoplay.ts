/** A single cancellable five-second clock, shared by carousel interaction states. */
export function createAutoAdvance(advance: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  function schedule() {
    timer = setTimeout(() => {
      timer = undefined;
      if (!running) return;
      advance();
      if (running) schedule();
    }, 5000);
  }
  return {
    start() {
      if (running) return;
      running = true;
      schedule();
    },
    stop() {
      running = false;
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    },
  };
}
