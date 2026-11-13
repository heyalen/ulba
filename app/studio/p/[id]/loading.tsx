/* ulba · Vorschlag: sofortiges Gerüst beim Wechsel zwischen Vorschlägen. */
export default function Laedt() {
  return (
    <div className="st-skel" aria-busy="true" aria-label="Vorschlag lädt">
      <div className="st-skel-titel" />
      <div className="st-skel-zeile" />
      <div className="st-skel-leiste" />
      <div className="st-skel-gitter">{Array.from({ length: 8 }, (_, i) => <div key={i} className="st-skel-zelle" />)}</div>
    </div>
  );
}
