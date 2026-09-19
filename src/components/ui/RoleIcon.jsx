export default function RoleIcon({ role, className = "h-5 w-5", title }) {
  const isCat = role === "cat";
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : "true"}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      {isCat ? (
        <>
          <path d="M5 9 4 4l4 2a7 7 0 0 1 8 0l4-2-1 5" />
          <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
          <path d="M9 16c2 1.5 4 1.5 6 0" />
        </>
      ) : (
        <>
          <circle cx="12" cy="13" r="7" />
          <circle cx="7" cy="6" r="3" />
          <circle cx="17" cy="6" r="3" />
          <circle cx="10" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="14" cy="12" r="1" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}
