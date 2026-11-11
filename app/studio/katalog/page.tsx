import { supabaseServer } from '../../../lib/supabase/server';

type Teil = { id: string; name: string; material: string | null; volumen_ml: number | null; mindestmenge: number | null };

export default async function Katalog() {
  const { data } = await supabaseServer().from('teile').select('id, name, material, volumen_ml, mindestmenge').order('name');
  const teile = (data ?? []) as Teil[];
  return (
    <>
      <div className="st-titelzeile">
        <h1>Katalog</h1>
        <button className="st-btn" type="button" disabled title="Kommt in Phase 2">Katalog hinzufügen</button>
      </div>
      {teile.length === 0 ? (
        <div className="st-leer">
          <h2>Dein Katalog ist noch leer</h2>
          <p>Bald fügst du hier den Link zu deinem Online-Katalog oder ein PDF ein, und ulba liest die Teile ein. Bis dahin richten wir den Katalog für dich ein.</p>
        </div>
      ) : (
        <div className="st-liste">
          {teile.map((t) => (
            <div className="st-zeile" key={t.id}>
              <b>{t.name}</b>
              <span className="st-hilfe">{[t.material, t.volumen_ml ? `${t.volumen_ml} ml` : null, t.mindestmenge ? `ab ${t.mindestmenge.toLocaleString('de-CH')} Stk.` : null].filter(Boolean).join(' · ')}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
