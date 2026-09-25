export function roleBadgeText(player) {
  if (player.spectator) return "Spectateur";
  if (player.role === "cat" && player.originalRole === "player") return "Chat (devenu chat)";
  if (player.role === "cat") return "Chat";
  if (player.role === "player" && player.originalRole === "cat") return "Souris (ex-chat)";
  return "Souris";
}
