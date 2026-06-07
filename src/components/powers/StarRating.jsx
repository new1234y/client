import React from "react";

export default function StarRating({ value = 0, max = 5, size = 16, className = "" }) {
  const stars = [];
  for (let i = 1; i <= max; i++) {
    const active = i <= value;
    stars.push(
      <svg
        key={i}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className={className}
        aria-hidden
      >
        <path
          d="M12 17.27L18.18 21 16.54 13.97 22 9.24 14.81 8.63 12 2 9.19 8.63 2 9.24 7.46 13.97 5.82 21z"
          fill={active ? "#FBBF24" : "#E5E7EB"}
          stroke={active ? "#D97706" : "#CBD5E1"}
          strokeWidth="0.5"
        />
      </svg>
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
}
