/** Original illustrative vehicle, drawn for this prototype. No manufacturer insignia. */
export function VehicleArt({ className = "" }: { className?: string }) {
  return (
    <svg
      className={"vehicle-art " + className}
      viewBox="0 0 300 125"
      role="img"
      aria-label="Ilustracja samochodu demonstracyjnego"
    >
      <defs>
        <linearGradient id="car-body" x2=".4" y2="1">
          <stop stopColor="#b8c4d2" />
          <stop offset=".43" stopColor="#e8edf3" />
          <stop offset="1" stopColor="#75879c" />
        </linearGradient>
        <linearGradient id="car-glass" x2="0" y2="1">
          <stop stopColor="#2c405b" />
          <stop offset="1" stopColor="#687e96" />
        </linearGradient>
      </defs>
      <ellipse cx="155" cy="106" rx="125" ry="8" fill="#345177" opacity=".09" />
      <path
        d="M24 81 36 65 91 54 115 29Q125 23 143 24L196 27 235 57 270 69Q281 73 282 87L276 98 29 98 20 91Z"
        fill="url(#car-body)"
        stroke="#708297"
        strokeWidth="1.2"
      />
      <path
        d="m101 54 22-23 28-1 1 25Zm58 1-1-25 34 3 30 24Z"
        fill="url(#car-glass)"
        stroke="#8090a3"
      />
      <path
        d="m25 78 37-3-7 11-32 2m233-13 22 5-1 8-18-4"
        fill="#f7faff"
        stroke="#abb8c7"
      />
      <path
        d="M79 65 240 65M153 59v31M228 62l10 28M106 62l-10 24"
        fill="none"
        stroke="#63788e"
        strokeWidth=".7"
      />
      <path
        d="m32 92 36-2m39 3 105 1m45-2 22-2"
        stroke="#4c6078"
        fill="none"
        strokeWidth="3"
      />
      <path
        d="m165 65 12 1M110 64l10-1"
        stroke="#526a83"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {[85, 235].map((x) => (
        <g key={x}>
          <circle cx={x} cy="94" r="20" fill="#293445" />
          <circle cx={x} cy="94" r="14" fill="#a5b2c2" />
          <circle cx={x} cy="94" r="5" fill="#6a7c92" />
          {[0, 72, 144, 216, 288].map((angle) => (
            <path
              key={angle}
              d={`M${x} 84v6`}
              stroke="#e2e8ef"
              strokeWidth="3"
              transform={`rotate(${angle} ${x} 94)`}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}
