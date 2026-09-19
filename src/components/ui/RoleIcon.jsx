export default function RoleIcon({ role, className = "h-5 w-5", title }) {
  const isCat = role === "cat";
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : "true"}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      {isCat ? (
        <>
          <path d="M5.2 10.2 4.3 4.4l4.6 2.8a7.1 7.1 0 0 1 6.2 0l4.6-2.8-.9 5.8" />
          <path d="M5.5 11.5c0-3.1 2.9-5.2 6.5-5.2s6.5 2.1 6.5 5.2v2.3c0 3.4-2.9 5.7-6.5 5.7s-6.5-2.3-6.5-5.7z" />
          <circle cx="9.3" cy="12.7" r="1" fill="currentColor" stroke="none" />
          <circle cx="14.7" cy="12.7" r="1" fill="currentColor" stroke="none" />
          <path d="M10.2 16c1.2.8 2.4.8 3.6 0M7.2 15.5l-2.7-.8M16.8 15.5l2.7-.8" />
        </>
      ) : (
        <>
          <circle cx="12" cy="13.5" r="6.8" />
          <circle cx="7.1" cy="6.8" r="3.1" />
          <circle cx="16.9" cy="6.8" r="3.1" />
          <circle cx="9.7" cy="12.8" r="1" fill="currentColor" stroke="none" />
          <circle cx="14.3" cy="12.8" r="1" fill="currentColor" stroke="none" />
          <path d="M10.5 16.3c1 .7 2 .7 3 0M5.1 15.2l-2.4.7M18.9 15.2l2.4.7" />
        </>
      )}
    </svg>
  );
}
