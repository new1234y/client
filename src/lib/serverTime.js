let serverTimeOffset = 0;
let lastSyncTime = 0;

/**
 * Synchronise l'heure locale avec l'heure du serveur
 * @param {number} serverTimestamp - Timestamp reçu du serveur
 */
export function syncServerTime(serverTimestamp) {
  if (!Number.isFinite(serverTimestamp)) return;
  const localNow = Date.now();
  serverTimeOffset = serverTimestamp - localNow;
  lastSyncTime = localNow;
}

/**
 * Retourne l'heure actuelle du serveur (basée sur la dernière synchronisation)
 * @returns {number} Timestamp du serveur en millisecondes
 */
export function getServerTime() {
  return Date.now() + serverTimeOffset;
}

/**
 * Retourne l'offset actuel entre le serveur et le client
 * @returns {number} Offset en millisecondes
 */
export function getServerTimeOffset() {
  return serverTimeOffset;
}

/**
 * Vérifie si la synchronisation est récente (moins de 5 minutes)
 * @returns {boolean}
 */
export function isSyncRecent() {
  return Date.now() - lastSyncTime < 5 * 60 * 1000;
}

/**
 * Réinitialise la synchronisation (utile pour les tests ou reconnexion)
 */
export function resetServerTimeSync() {
  serverTimeOffset = 0;
  lastSyncTime = 0;
}
