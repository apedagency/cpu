/** Shared by the server layout (pre-paint gate) and the client loader. */
export const INTRO_KEY = "cpu-intro-seen";

/** Runs before first paint: repeat visitors in this session never see the intro. */
export const INTRO_GATE_SCRIPT = `try{if(sessionStorage.getItem("${INTRO_KEY}")||matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.dataset.intro="seen"}}catch(e){}`;
