import { useCallback, useRef, useState } from "react";

function formatMsgTime(t) {
  if (t == null) return "";
  try {
    return new Date(t).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function PartyChatPanel({
  messages = [],
  sessionId,
  position,
  onSend,
  onFocusLocation,
  compact = false,
  fillHeight = false,
  disabled = false,
  /** "discussion" : libellés adaptés à la discussion de groupe */
  variant = "default",
}) {
  const [text, setText] = useState("");
  const [attachPosToImage, setAttachPosToImage] = useState(true);
  const fileRef = useRef(null);
  const isDiscussion = variant === "discussion";

  const sendText = useCallback(() => {
    const t = text.trim();
    if (!t || !onSend || disabled) return;
    onSend({ type: "text", text: t });
    setText("");
  }, [text, onSend, disabled]);

  const sendLocation = useCallback(() => {
    if (!onSend || !position || disabled) return;
    onSend({
      type: "location",
      lat: position.lat,
      lng: position.lng,
    });
  }, [onSend, position, disabled]);

  const onPickFile = useCallback(
    (e) => {
      const f = e.target.files?.[0];
      if (!f || !onSend || disabled) return;
      if (!f.type.startsWith("image/")) return;
      const r = new FileReader();
      r.onload = () => {
        const image = String(r.result || "");
        const payload = { type: "image", image };
        if (attachPosToImage && position) {
          payload.lat = position.lat;
          payload.lng = position.lng;
        }
        onSend(payload);
      };
      r.readAsDataURL(f);
      e.target.value = "";
    },
    [onSend, position, attachPosToImage, disabled]
  );

  const heightCls = fillHeight
    ? "h-full min-h-0"
    : compact
      ? "max-h-64"
      : "h-full max-h-[min(420px,50vh)]";

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/95 ${heightCls} ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      {!fillHeight && (
        <div className="shrink-0 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
            {isDiscussion ? "Discussion" : "Échanges"}
          </p>
          {isDiscussion && (
            <p className="mt-0.5 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
              Texte, photo (option GPS sur la carte) ou envoi de votre position.
            </p>
          )}
        </div>
      )}
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3 text-sm">
        {(!messages || messages.length === 0) && (
          <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            {isDiscussion
              ? "Aucun message pour l’instant. Les nouveaux messages peuvent déclencher une notification."
              : "Aucun message pour l’instant."}
          </p>
        )}
        {(messages || []).map((m) => {
          const mine = m.sessionId === sessionId;
          const timeStr = formatMsgTime(m.t);
          return (
            <div
              key={m.id}
              className={`rounded-2xl px-3 py-2 ${
                mine
                  ? "ml-6 bg-indigo-50 text-slate-900 ring-1 ring-indigo-100/80 dark:bg-indigo-950/50 dark:text-indigo-50 dark:ring-indigo-900/60"
                  : "mr-6 bg-slate-50 text-slate-800 ring-1 ring-slate-100 dark:bg-slate-800/90 dark:text-slate-100 dark:ring-slate-700/80"
              }`}
            >
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  {m.nickname}
                </span>
                {timeStr ? (
                  <span className="shrink-0 text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                    {timeStr}
                  </span>
                ) : null}
              </div>
              {m.type === "text" && (
                <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">{m.text}</p>
              )}
              {m.type === "location" && m.lat != null && m.lng != null && (
                <button
                  type="button"
                  disabled={!onFocusLocation}
                  onClick={() => onFocusLocation?.(m.lat, m.lng, m)}
                  className="flex w-full items-center gap-2 rounded-xl bg-sky-50 px-2.5 py-2 text-left text-xs font-semibold text-sky-900 ring-1 ring-sky-100 disabled:opacity-60 dark:bg-sky-950/40 dark:text-sky-100 dark:ring-sky-900/50"
                >
                  <span className="text-base leading-none" aria-hidden>
                    📍
                  </span>
                  <span className="min-w-0 flex-1">
                    {mine ? "Vous avez partagé une position" : "Position partagée"}
                    {m.text ? (
                      <span className="mt-0.5 block truncate text-[11px] font-medium text-sky-700 dark:text-sky-200">
                        {m.text}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[11px] font-bold text-sky-700 dark:text-sky-200">
                    Voir
                  </span>
                </button>
              )}
              {m.type === "image" && m.image && (
                <div className="mt-1">
                  <img
                    src={m.image}
                    alt=""
                    className="max-h-48 max-w-full rounded-xl border border-slate-200/80 object-cover dark:border-slate-600"
                  />
                  {m.lat != null && m.lng != null && (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Visible sur la carte.
                      </p>
                      <button
                        type="button"
                        disabled={!onFocusLocation}
                        onClick={() => onFocusLocation?.(m.lat, m.lng, m)}
                        className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700 disabled:opacity-60 dark:bg-slate-800 dark:text-slate-200"
                      >
                        Voir sur la carte
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="shrink-0 space-y-2 border-t border-slate-100 p-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onPickFile}
          />
          <button
            type="button"
            disabled={disabled || !onSend}
            onClick={() => fileRef.current?.click()}
            className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-100"
          >
            Photo
          </button>
          <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={attachPosToImage}
              disabled={disabled}
              onChange={(e) => setAttachPosToImage(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 dark:border-slate-600"
            />
            Placer sur la carte
          </label>
          <button
            type="button"
            disabled={disabled || !position}
            onClick={sendLocation}
            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            Ma position
          </button>
        </div>
        <div className="flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled || !onSend}
            placeholder="Écrire un message…"
            rows={2}
            maxLength={2000}
            className="min-w-0 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
          />
          <button
            type="button"
            disabled={disabled || !onSend}
            onClick={sendText}
            className="shrink-0 self-end rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}
