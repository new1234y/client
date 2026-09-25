import logger from "./logger.js";

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function sendSystemNotification(title, body) {
  if (typeof document === "undefined" || document.visibilityState !== "hidden") return;
  if (isIosDevice()) return;
  const options = { body, tag: "chase-gps-game", renotify: true, icon: "/icon-192x192.png" };
  const useServiceWorkerNotification = navigator.serviceWorker?.ready
    ? navigator.serviceWorker.ready.then((registration) =>
        registration.showNotification(title, options)
      )
    : null;
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      if (useServiceWorkerNotification) {
        useServiceWorkerNotification.catch((error) => logger.warn("Notification PWA indisponible", error));
      } else {
        new Notification(title, options);
      }
      return;
    } catch (error) {
      logger.warn("Notification système indisponible", error);
    }
  }
  if (useServiceWorkerNotification) {
    useServiceWorkerNotification.catch((error) => logger.warn("Notification PWA indisponible", error));
  }
}

export function notifyGameOrSystem(addNotification, title, body, type = "warning") {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    sendSystemNotification(title, body);
    return;
  }
  addNotification(`${title} : ${body}`, type, 5000);
}

export { isIosDevice };
