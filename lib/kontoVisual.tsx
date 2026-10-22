/* ulba · lib/kontoVisual.tsx — das grosse Visual rechts auf den Konto-
   Seiten (v79.8, Claude-Vorbild: Text links, Bild rechts). Kein Foto,
   sondern ein flaches Editorial-Panel in ulbas Design-Welt-Farben:
   fünf Packmittel-Silhouetten auf gemeinsamer Standlinie. Reines SVG —
   laedt sofort, skaliert scharf, kein Asset noetig. */

export function KontoVisual() {
  return (
    <svg viewBox="0 0 800 1000" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Beauty-Packaging in ulba Design-Welten">
      <defs>
        <linearGradient id="kv-aqua" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#00AEEF" />
          <stop offset="0.66" stopColor="#00AEEF" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>

      {/* Panel */}
      <rect x="0" y="0" width="800" height="1000" fill="#F3F1EC" />

      {/* Standlinien-Schatten */}
      <ellipse cx="165" cy="772" rx="70" ry="12" fill="rgba(28,28,26,.07)" />
      <ellipse cx="330" cy="772" rx="90" ry="12" fill="rgba(28,28,26,.07)" />
      <ellipse cx="505" cy="772" rx="75" ry="12" fill="rgba(28,28,26,.07)" />
      <ellipse cx="650" cy="772" rx="55" ry="12" fill="rgba(28,28,26,.07)" />

      {/* 1 · Indigo Precision — schlanke Flasche, Verschluss schwarz matt */}
      <rect x="120" y="380" width="90" height="380" rx="18" fill="#2E1A5E" />
      <rect x="140" y="560" width="50" height="120" rx="6" fill="#FFFFFF" />
      <rect x="145" y="328" width="40" height="52" rx="9" fill="#1C1C1A" />

      {/* 2 · Golden Ritual — Tiegel, Deckel schwarz */}
      <rect x="260" y="600" width="140" height="160" rx="26" fill="#F2C94C" />
      <rect x="260" y="562" width="140" height="38" rx="16" fill="#1C1C1A" />

      {/* 3 · Aqua Minimal — Verlauf unten satt, Kappe weiss */}
      <rect x="450" y="460" width="110" height="300" rx="20" fill="url(#kv-aqua)" />
      <rect x="483" y="416" width="44" height="44" rx="9" fill="#FFFFFF" stroke="#EAEAE7" strokeWidth="2" />

      {/* 4 · Amber Clinical — Braunglas mit Pipette */}
      <rect x="610" y="540" width="80" height="220" rx="16" fill="#8A3E12" />
      <rect x="645" y="520" width="10" height="46" fill="#1C1C1A" />
      <circle cx="650" cy="502" r="21" fill="#1C1C1A" />

      {/* Bildzeile */}
      <text x="120" y="880" fontFamily="Archivo, system-ui, sans-serif" fontWeight="800" fontSize="46" letterSpacing="-1.4" fill="#1C1C1A">Jede Welt. Jedes Teil.</text>
      <text x="120" y="922" fontFamily="Archivo, system-ui, sans-serif" fontWeight="500" fontSize="21" fill="#5D5D58">ulba rendert dein Design in Minuten.</text>
    </svg>
  );
}
