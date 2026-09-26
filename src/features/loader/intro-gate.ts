/** Shared by the server layout (pre-paint gate) and the client loader. */
export const INTRO_KEY = "cpu-intro-seen";

/**
 * Runs before first paint. Repeat visitors in this session never see the intro
 * (`seen`); reduced motion gets the static mark instead of the sequence (`reduced`).
 */
export const INTRO_GATE_SCRIPT = `(function(){var d=document.documentElement.dataset,s;try{s=sessionStorage.getItem("${INTRO_KEY}")}catch(e){}if(s){d.intro="seen"}else if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches){d.intro="reduced"}})()`;
