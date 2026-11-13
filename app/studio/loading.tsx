/* ulba · Studio: sofortiges Gerüst beim Seitenwechsel. */
export default function Laedt() {
  return (
    <div className="st-skel" aria-busy="true" aria-label="Lädt">
      <div className="st-skel-titel" />
      <div className="st-skel-raster">{Array.from({ length: 6 }, (_, i) => <div key={i} className="st-skel-karte" />)}</div>
    </div>
  );
}
