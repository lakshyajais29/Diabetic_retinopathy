/**
 * An illustrative fundus schematic.
 *
 * Drawn rather than photographed on purpose: no real patient image appears in
 * the marketing surface of a clinical product. The anatomy is laid out to scale
 * — disc nasal to the macula, arcades sweeping temporally around it — so the
 * illustration teaches the geometry the pipeline actually reasons about.
 */
export function RetinaSchematic({
  showFindings = true,
  className,
}: {
  showFindings?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      role="img"
      aria-label="Schematic of a retinal fundus photograph showing the optic disc, macula, vascular arcades and detected lesions"
    >
      <defs>
        <radialGradient id="rs-fundus" cx="50%" cy="48%" r="62%">
          <stop offset="0%" stopColor="#f0a06a" />
          <stop offset="42%" stopColor="#d9713e" />
          <stop offset="78%" stopColor="#9c3f1f" />
          <stop offset="100%" stopColor="#5c1f0e" />
        </radialGradient>
        <radialGradient id="rs-disc" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#fff6df" />
          <stop offset="55%" stopColor="#ffdf9c" />
          <stop offset="100%" stopColor="#e8a94e" />
        </radialGradient>
        <radialGradient id="rs-macula" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4c1409" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#8d3418" stopOpacity="0" />
        </radialGradient>
        <clipPath id="rs-clip">
          <circle cx="200" cy="200" r="176" />
        </clipPath>
      </defs>

      {/* Field of view */}
      <circle cx="200" cy="200" r="176" fill="url(#rs-fundus)" />

      <g clipPath="url(#rs-clip)">
        {/* Macular darkening */}
        <circle cx="140" cy="203" r="58" fill="url(#rs-macula)" />

        {/* Vascular tree, emerging from the disc and arcading around the macula */}
        <g
          fill="none"
          stroke="#7d1e12"
          strokeLinecap="round"
          strokeOpacity="0.92"
        >
          <path d="M272 176 C 240 150, 196 132, 148 128 C 108 125, 76 136, 52 156" strokeWidth="7" />
          <path d="M272 224 C 240 252, 196 270, 148 275 C 108 279, 76 268, 52 248" strokeWidth="7" />
          <path d="M274 190 C 320 178, 352 168, 384 156" strokeWidth="5.5" />
          <path d="M274 212 C 320 226, 352 238, 384 252" strokeWidth="5.5" />
          <path d="M268 186 C 250 170, 236 150, 230 122" strokeWidth="4" />
          <path d="M268 216 C 250 238, 238 258, 232 284" strokeWidth="4" />
        </g>
        <g fill="none" stroke="#a2402a" strokeLinecap="round" strokeOpacity="0.8">
          <path d="M212 138 C 196 118, 178 100, 152 86" strokeWidth="3" />
          <path d="M180 130 C 160 116, 132 108, 104 108" strokeWidth="2.6" />
          <path d="M208 264 C 190 288, 168 306, 140 316" strokeWidth="3" />
          <path d="M176 272 C 150 288, 122 296, 94 296" strokeWidth="2.6" />
          <path d="M120 130 C 96 140, 76 158, 64 182" strokeWidth="2.2" />
          <path d="M118 274 C 94 264, 74 246, 62 222" strokeWidth="2.2" />
          <path d="M330 172 C 348 186, 360 198, 372 214" strokeWidth="2.4" />
        </g>

        {/* Optic disc, nasal to the macula */}
        <ellipse cx="272" cy="200" rx="30" ry="32" fill="url(#rs-disc)" />
        <ellipse cx="272" cy="200" rx="14" ry="15" fill="#fffaf0" opacity="0.55" />

        {showFindings ? (
          <g>
            {/* Microaneurysms — small filled dots */}
            {[
              [166, 168],
              [188, 236],
              [124, 176],
              [150, 250],
              [206, 176],
            ].map(([x, y]) => (
              <circle
                key={`ma-${x}-${y}`}
                cx={x}
                cy={y}
                r="3.4"
                fill="var(--lesion-microaneurysm)"
                stroke="#0c1421"
                strokeWidth="1"
              />
            ))}

            {/* Haemorrhages — larger soft blots */}
            {[
              [110, 232, 8],
              [196, 300, 7],
            ].map(([x, y, r]) => (
              <circle
                key={`h-${x}-${y}`}
                cx={x}
                cy={y}
                r={r}
                fill="var(--lesion-haemorrhage)"
                opacity="0.9"
                stroke="#0c1421"
                strokeWidth="1"
              />
            ))}

            {/* Hard exudates — bright angular deposits */}
            {[
              [162, 214],
              [176, 198],
              [150, 190],
            ].map(([x, y]) => (
              <rect
                key={`e-${x}-${y}`}
                x={x}
                y={y}
                width="7"
                height="6"
                rx="1.5"
                fill="var(--lesion-hard_exudate)"
                stroke="#0c1421"
                strokeWidth="0.8"
              />
            ))}
          </g>
        ) : null}
      </g>

      {/* Field rim */}
      <circle
        cx="200"
        cy="200"
        r="176"
        fill="none"
        stroke="#0c1421"
        strokeOpacity="0.35"
        strokeWidth="3"
      />

      {showFindings ? (
        <g>
          {/* Anatomical annotation, the way a grading overlay marks it */}
          <circle
            cx="272"
            cy="200"
            r="38"
            fill="none"
            stroke="var(--viz-series-1)"
            strokeWidth="1.6"
            strokeDasharray="5 4"
            opacity="0.95"
          />
          <circle
            cx="140"
            cy="203"
            r="44"
            fill="none"
            stroke="var(--viz-series-3)"
            strokeWidth="1.6"
            strokeDasharray="5 4"
            opacity="0.9"
          />
        </g>
      ) : null}
    </svg>
  );
}
