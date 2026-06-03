import confetti from 'canvas-confetti';

/**
 * Fire a celebration burst. Call this in onSuccess of create mutations.
 * @param {'default'|'stars'|'side'} style
 */
export function celebrate(style = 'default') {
  if (style === 'stars') {
    confetti({
      particleCount: 40,
      spread: 60,
      shapes: ['star'],
      colors: ['#FFD700', '#FFA500', '#FF6347'],
      origin: { y: 0.6 },
    });
    return;
  }
  if (style === 'side') {
    // Two bursts from the sides
    confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.65 } });
    confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.65 } });
    return;
  }
  // default: single centre burst
  confetti({
    particleCount: 90,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'],
  });
}
