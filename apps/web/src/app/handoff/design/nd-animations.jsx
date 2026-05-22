// Nebula Dominion — Animation layer (auto-injects CSS keyframes)
// Race-specific animation classes that components can opt into.
// All animations are subtle (1.5-6s loops); avoid being distracting.

(function injectNDAnims() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('nd-anim-style')) return;
  const css = `
    /* ===== Universal ===== */
    @keyframes nd-pulse-soft {
      0%, 100% { opacity: 0.55; }
      50% { opacity: 1; }
    }
    @keyframes nd-pulse-glow {
      0%, 100% { filter: drop-shadow(0 0 4px currentColor); }
      50%      { filter: drop-shadow(0 0 14px currentColor); }
    }
    @keyframes nd-blink {
      0%, 92%, 100% { opacity: 1; }
      94%, 96%      { opacity: 0.15; }
    }
    @keyframes nd-scan-y {
      0%   { transform: translateY(0); opacity: 0; }
      10%  { opacity: 0.85; }
      90%  { opacity: 0.85; }
      100% { transform: translateY(100%); opacity: 0; }
    }
    @keyframes nd-scan-x {
      0%   { transform: translateX(-10%); opacity: 0; }
      10%  { opacity: 0.85; }
      90%  { opacity: 0.85; }
      100% { transform: translateX(110%); opacity: 0; }
    }

    /* ===== Insan: LED blink, scanline ===== */
    @keyframes nd-ins-led {
      0%, 100% { opacity: 0.9; }
      48%, 52% { opacity: 0.2; }
    }

    /* ===== Zerg: embryo / vein pulse ===== */
    @keyframes nd-zerg-breath {
      0%, 100% { transform: scale(1); }
      50%      { transform: scale(1.04); }
    }
    @keyframes nd-zerg-vein {
      0%, 100% { stroke-opacity: 0.45; }
      50%      { stroke-opacity: 0.85; }
    }
    @keyframes nd-zerg-spore {
      0%   { transform: translate(0, 0); opacity: 0.35; }
      50%  { opacity: 0.95; }
      100% { transform: translate(2px, -8px); opacity: 0; }
    }

    /* ===== Otomat: data flow, boot text ===== */
    @keyframes nd-oto-flow {
      0%   { stroke-dashoffset: 0; }
      100% { stroke-dashoffset: -28; }
    }
    @keyframes nd-oto-tick {
      0%, 49%, 100% { opacity: 1; }
      50%, 99% { opacity: 0.0; }
    }
    @keyframes nd-oto-packet {
      0%   { offset-distance: 0%; opacity: 0; }
      10%  { opacity: 1; }
      90%  { opacity: 1; }
      100% { offset-distance: 100%; opacity: 0; }
    }

    /* ===== Canavar: eye flicker, breath puff ===== */
    @keyframes nd-cnv-eye {
      0%, 100% { opacity: 1; transform: scale(1); }
      45%, 55% { opacity: 0.55; transform: scale(0.85); }
    }
    @keyframes nd-cnv-breath {
      0%   { opacity: 0.25; transform: translate(0, 0) scale(0.6); }
      60%  { opacity: 0.50; }
      100% { opacity: 0;    transform: translate(8px, -6px) scale(1.4); }
    }

    /* ===== Şeytan: candle flame, sigil glow ===== */
    @keyframes nd-syt-flame {
      0%, 100% { transform: scale(1, 1) rotate(-1deg); }
      25%      { transform: scale(0.94, 1.08) rotate(1.5deg); }
      50%      { transform: scale(1.04, 0.96) rotate(-0.5deg); }
      75%      { transform: scale(0.98, 1.04) rotate(1deg); }
    }
    @keyframes nd-syt-sigil {
      0%, 100% { filter: drop-shadow(0 0 6px currentColor); }
      50%      { filter: drop-shadow(0 0 18px currentColor); }
    }

    /* ===== Utility classes ===== */
    .nd-pulse  { animation: nd-pulse-soft 3.2s ease-in-out infinite; }
    .nd-glow   { animation: nd-pulse-glow 2.8s ease-in-out infinite; }
    .nd-blink  { animation: nd-blink 5s ease-in-out infinite; }
    .nd-breath { animation: nd-zerg-breath 3.6s ease-in-out infinite; }
    .nd-vein   { animation: nd-zerg-vein 2.4s ease-in-out infinite; }
    .nd-spore  { animation: nd-zerg-spore 4.2s ease-out infinite; }
    .nd-flow   { animation: nd-oto-flow 1.4s linear infinite; }
    .nd-tick   { animation: nd-oto-tick 1.0s steps(2, end) infinite; }
    .nd-led    { animation: nd-ins-led 1.6s ease-in-out infinite; }
    .nd-eye    { animation: nd-cnv-eye 3.2s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
    .nd-puff   { animation: nd-cnv-breath 2.2s ease-out infinite; transform-origin: center; transform-box: fill-box; }
    .nd-flame  { animation: nd-syt-flame 1.4s ease-in-out infinite; transform-origin: bottom center; transform-box: fill-box; }
    .nd-sigil  { animation: nd-syt-sigil 3.4s ease-in-out infinite; }

    /* Stagger helpers (apply with delay on duplicates) */
    .nd-d1 { animation-delay: 0.4s; }
    .nd-d2 { animation-delay: 0.8s; }
    .nd-d3 { animation-delay: 1.2s; }
    .nd-d4 { animation-delay: 1.6s; }
    .nd-d5 { animation-delay: 2.0s; }

    /* ===== Tweak-driven global overrides ===== */
    /* Animations off — stops every nd-* animation */
    html[data-nd-anim="off"] *,
    html[data-nd-anim="off"] *::before,
    html[data-nd-anim="off"] *::after {
      animation: none !important;
      transition: none !important;
    }

    /* Sigil glow off — drop heavy shadows */
    html[data-nd-glow="off"] [class*="nd-glow"],
    html[data-nd-glow="off"] [class*="nd-sigil"] {
      filter: none !important;
    }

    /* Density: compact reduces type/spacing in dense game UIs */
    html[data-nd-density="compact"] {
      --nd-density-scale: 0.92;
    }
    html[data-nd-density="compact"] body {
      font-size: 95%;
    }
  `;
  const style = document.createElement('style');
  style.id = 'nd-anim-style';
  style.textContent = css;
  document.head.appendChild(style);
})();
