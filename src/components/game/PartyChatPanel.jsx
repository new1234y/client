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
    const t = text.trim();
    onSend({
      type: "location",
      lat: position.lat,
      lng: position.lng,
      text: t || undefined,
    });
    if (t) setText("");
  }, [onSend, position, disabled, text, setText]);

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
              className={`rounded-xl px-3 py-2.5 shadow-sm ${
                mine
                  ? "ml-8 bg-gradient-to-br from-[#5B7FA5] to-[#4A6A8A] text-white"
                  : "mr-8 bg-white text-slate-800 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
              }`}
            >
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className={`text-[11px] font-semibold ${
                  mine ? "text-white/90" : "text-[#5B7FA5] dark:text-[#7B9BB8]"
                }`}>
                  {m.nickname}
                </span>
                {timeStr ? (
                  <span className={`shrink-0 text-[10px] tabular-nums ${
                    mine ? "text-white/70" : "text-slate-400 dark:text-slate-500"
                  }`}>
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
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-opacity disabled:opacity-60 ${
                    mine
                      ? "bg-white/20 text-white hover:bg-white/30"
                      : "bg-[#5B7FA5]/10 text-[#5B7FA5] hover:bg-[#5B7FA5]/20 dark:bg-[#5B7FA5]/20 dark:text-[#7B9BB8]"
                  }`}
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="min-w-0 flex-1">
                    {mine ? "Position partagée" : `${m.nickname} a partagé sa position`}
                    {m.text ? (
                      <span className={`mt-0.5 block truncate text-[11px] font-medium ${
                        mine ? "text-white/80" : "text-slate-600 dark:text-slate-300"
                      }`}>
                        {m.text}
                      </span>
                    ) : null}
                  </span>
                  <span className={`shrink-0 text-[10px] font-bold ${
                    mine ? "text-white/90" : "text-[#5B7FA5]"
                  }`}>
                    Voir
                  </span>
                </button>
              )}
              {m.type === "image" && m.image && (
                <div className="mt-1">
                  <img
                    src={m.image}
                    alt=""
                    className="max-h-48 max-w-full rounded-lg object-cover shadow-sm"
                  />
                  {m.lat != null && m.lng != null && (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className={`text-[10px] ${
                        mine ? "text-white/70" : "text-slate-500 dark:text-slate-400"
                      }`}>
                        Visible sur la carte
                      </p>
                      <button
                        type="button"
                        disabled={!onFocusLocation}
                        onClick={() => onFocusLocation?.(m.lat, m.lng, m)}
                        className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold transition-opacity disabled:opacity-60 ${
                          mine
                            ? "bg-white/20 text-white hover:bg-white/30"
                            : "bg-[#5B7FA5] text-white hover:bg-[#4A6A8A]"
                        }`}
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
      <div className="shrink-0 border-t border-slate-100 p-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onPickFile}
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled || !onSend}
            placeholder="Écrire un message…"
            rows={1}
            maxLength={2000}
            className="min-w-0 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm disabled:opacity-50 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
          />
          <button
            type="button"
            disabled={disabled || !onSend}
            onClick={() => fileRef.current?.click()}
            className="grid h-10 w-10 shrink-0 place-content-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            title="Photo"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <button
            type="button"
            disabled={disabled || !position || !onSend}
            onClick={sendLocation}
            className="grid h-10 w-10 shrink-0 place-content-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            title="Partager ma position"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            type="button"
            disabled={disabled || !onSend || !text.trim()}
            onClick={sendText}
            className="grid h-10 w-10 shrink-0 place-content-center rounded-full bg-[#C45454] text-white transition-colors hover:bg-[#B04A4A] disabled:opacity-50"
            title="Envoyer"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
