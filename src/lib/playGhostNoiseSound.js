/**
 * Joue le son du bruit fantôme avec reprise AudioContext (iOS) et fallback HTML5.
 */
export async function playGhostNoiseSound(sharedAudioContextRef, noiseAudioRef, durationSec, volume) {
  const dur = Math.min(20, Math.max(1, Number(durationSec) || 1));
  const baseGain = 1;

  if (noiseAudioRef?.current) {
    try {
      const { audioCtx, osc, gain, stopTimer } = noiseAudioRef.current;
      clearTimeout(stopTimer);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.stop(audioCtx.currentTime + 0.2);
    } catch {}
    noiseAudioRef.current = null;
  }

  let webAudioOk = false;
  try {
    let audioCtx = sharedAudioContextRef?.current;
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (sharedAudioContextRef) sharedAudioContextRef.current = audioCtx;
    }

    if (audioCtx.state !== "running") await audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();

    for (let i = 0; i < dur; i += 1) {
      const t0 = audioCtx.currentTime + i * 1.0;
      gain.gain.setValueAtTime(baseGain, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.7);
    }

    const stopTimer = setTimeout(() => {
      try {
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      } catch {}
      try {
        osc.stop(audioCtx.currentTime + 0.12);
      } catch {}
      if (noiseAudioRef) noiseAudioRef.current = null;
    }, dur * 1000 + 150);

    if (noiseAudioRef) {
      noiseAudioRef.current = { audioCtx, osc, gain, stopTimer };
    }
    webAudioOk = true;
  } catch (e) {
    console.warn("[playGhostNoiseSound] Web Audio failed:", e);
  }

  if (!webAudioOk) {
    try {
      const beepCount = Math.min(dur, 20);
      for (let i = 0; i < beepCount; i++) {
        setTimeout(() => {
          const a = new Audio(
            "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleRkFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeRgFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE="
          );
          a.setAttribute("playsinline", "");
          a.volume = 1;
          a.play().catch(() => {});
        }, i * 1000);
      }
    } catch (e) {
      console.warn("[playGhostNoiseSound] HTML5 fallback failed:", e);
    }
  }

  try {
    if (navigator.vibrate) {
      if (volume === "low") navigator.vibrate([150, 80, 150]);
      else if (volume === "high") navigator.vibrate([300, 100, 300, 100, 300, 100, 300]);
      else navigator.vibrate([200, 100, 200, 100, 200]);
    }
  } catch {}
}
