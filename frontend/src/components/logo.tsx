export function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Chart bars representing trading */}
      <rect x="4" y="20" width="4" height="8" fill="currentColor" opacity="0.8" />
      <rect x="10" y="16" width="4" height="12" fill="currentColor" opacity="0.8" />
      <rect x="16" y="12" width="4" height="16" fill="currentColor" />
      <rect x="22" y="8" width="4" height="20" fill="currentColor" opacity="0.8" />
      
      {/* Trend line */}
      <path
        d="M6 22L12 18L18 14L24 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Arrow indicating growth */}
      <path
        d="M24 10L28 6M28 6L24 6M28 6V10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}