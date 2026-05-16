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
   className={`flex flex-col overflow-hidden rounded-xl border border-cozy-bordershadow-sm ${heightCls} ${disabled ? "pointer-events-none opacity-60" : ""}`}
  >
   {!fillHeight && (
    <div className="shrink-0 border-b border-cozy-border px-3 py-2.5 border-cozy-border">
     <p className="text-xs font-semibold text-cozy-text">
      {isDiscussion ? "Discussion" : "Échanges"}
     </p>
     {isDiscussion && (
      <p className="mt-0.5 text-[10px] leading-snug text-cozy-text-muted">
       Texte, photo (option GPS sur la carte) ou envoi de votre position.
      </p>
     )}
    </div>
   )}
   <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3 text-sm">
    {(!messages || messages.length === 0) && (
     <p className="rounded-lgpx-3 py-6 text-center text-xs text-cozy-text-muted bg-cozy-surface">
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
       className={`rounded-xl px-3 py-2 ${
        mine
         ? "ml-6 bg-cozy-primary-muted text-cozy-text ring-1 ring-cozy-primary/15 dark:text-cozy-primary"
         : "mr-6text-cozy-text ring-1 ring-cozy-border bg-cozy-surface"
       }`}
      >
       <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold text-cozy-text-secondary">
         {m.nickname}
        </span>
        {timeStr ? (
         <span className="shrink-0 text-[10px] tabular-nums text-cozy-text-muted">
          {timeStr}
         </span>
        ) : null}
       </div>
       {m.type === "text" && (
        <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">{m.text}</p>
       )}
       {m.type === "location" && m.lat != null && m.lng != null && (
        <p className="text-xs text-cozy-text-secondary">
         <span className="mr-1" aria-hidden>
          📍
         </span>
         Position partagée · {m.lat.toFixed(5)}, {m.lng.toFixed(5)}
        </p>
       )}
       {m.type === "image" && m.image && (
        <div className="mt-1">
         <img
          src={m.image}
          alt=""
          className="max-h-48 max-w-full rounded-lg border border-cozy-border/80 object-cover"
         />
         {m.lat != null && m.lng != null && (
          <p className="mt-1.5 text-[10px] text-cozy-text-muted">
           Visible sur la carte des participants qui ont la vue active.
          </p>
         )}
        </div>
       )}
      </div>
     );
    })}
   </div>
   <div className="shrink-0 space-y-2 border-t border-cozy-border p-3 border-cozy-border">
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
      className="rounded-lgpx-3 py-2 text-xs font-semibold text-cozy-text disabled:opacity-50 bg-cozy-surface"
     >
      Photo
     </button>
     <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-cozy-text-secondary">
      <input
       type="checkbox"
       checked={attachPosToImage}
       disabled={disabled}
       onChange={(e) => setAttachPosToImage(e.target.checked)}
       className="rounded border-cozy-border text-cozy-primary"
      />
      Placer sur la carte
     </label>
     <button
      type="button"
      disabled={disabled || !position}
      onClick={sendLocation}
      className="rounded-lg bg-cozy-success px-3 py-2 text-xs font-semibold text-cozy-bg disabled:opacity-40"
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
      className="min-w-0 flex-1 resize-none rounded-lg border border-cozy-borderpx-3 py-2 text-sm disabled:opacity-50 bg-cozy-bg"
     />
     <button
      type="button"
      disabled={disabled || !onSend}
      onClick={sendText}
      className="shrink-0 self-end rounded-lg bg-cozy-primary px-4 py-2.5 text-xs font-bold text-cozy-bg disabled:opacity-50"
     >
      Envoyer
     </button>
    </div>
   </div>
  </div>
 );
}
