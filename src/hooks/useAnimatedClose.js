import { useCallback, useEffect, useRef, useState } from "react";

export const SHEET_CLOSE_MS = 280;
const SHEET_CLOSE_TIMEOUT_MS = 320;

function shouldSkipSheetMotion() {
  if (typeof document !== "undefined" && document.documentElement.classList.contains("reduce-motion")) {
    return true;
  }
  try {
    return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  } catch {
    return false;
  }
}

export default function useAnimatedClose(onClose, durationMs = SHEET_CLOSE_MS) {
  const [leaving, setLeaving] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const timerRef = useRef(0);
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = 0;
    }
    onCloseRef.current?.();
  }, []);

  const requestClose = useCallback(() => {
    if (leaving || finishedRef.current) return;
    if (shouldSkipSheetMotion()) {
      setLeaving(true);
      finish();
      return;
    }
    setLeaving(true);
    timerRef.current = window.setTimeout(finish, Math.max(durationMs, SHEET_CLOSE_TIMEOUT_MS));
  }, [leaving, finish, durationMs]);

  const onExitAnimationEnd = useCallback(
    (event) => {
      if (!leaving) return;
      if (event.target !== event.currentTarget) return;
      finish();
    },
    [leaving, finish]
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return { leaving, requestClose, onExitAnimationEnd };
}
