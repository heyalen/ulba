'use client';

import { useState, useEffect, useCallback } from 'react';
import { cosine, DIMS } from '@/lib/search';

const DIM_COLORS = [
  '#c9745a','#8b6abf','#4a8fc9','#4a9e6a','#b8855a',
  '#c96a8f','#5a7abf','#7a5abf','#3aafa0','#6aaa4a',
  '#b84a4a','#4a6aaf','#af6a2a','#8a8a9a','#8a4aaf'
];

const TYPE_LABELS: Record<string, string> = {
  Jar_ScrewCap: 'Jar · Screw', Bottle_ScrewCap: 'Bottle · Screw',
  Bottle_DispenserPump: 'Bottle · Pump', Airless_Bottle: 'Airless',
  Airless_Jar: 'Airless Jar', Bottle_FlipTop: 'Bottle · Flip',
  Bottle_Dropper: 'Bottle · Dropper', Bottle_Spray: 'Bottle · Spray',
  Tube_FlipTop: 'Tube · Flip', Tube_ScrewCap: 'Tube · Screw',
};

const EXAMPLES = [
  'Feminine, luxuriöse Glasflasche, Anti-Aging Serum',
  'Gen Z, verspielt, mutige Farbe, günstig',
  'Herren Shampoo, minimalistisch, clean',
  'Nachhaltig, Clean Beauty, Bambus, Refill',
  'Lippenmaske, glossy, cute, feminin',
];

interface Product {
  id: string; name: string; supplier: string; type: string;
  images: string[]; vector: number[]; url?: string;
}
interface Result extends Product { score: number; }

function Gallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => { setActive(0); setLoaded(false); setError(false); }, [images]);

  if (!images?.length || error) {
    return (
      <div style={{ width: '100%', aspectRatio: '1', background: '#f0ede8', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '28px', color: '#c8c2b8' }}>◇</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ width: '100%', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', background: '#f8f5f0', position: 'relative', marginBottom: '8px' }}>
        {!loaded && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '20px', height: '20px', border: '2px solid #e8e2d8', borderTopColor: '#b8955a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}
        <img src={images[active]} alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: loaded ? 1 : 0, transition: 'opacity 0.2s' }}
          onLoad={() => setLoaded(true)} onError={() => setError(true)} />
        {images.length > 1 && loaded && (
          <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(26,24,20,0.5)', color: '#fff', fontSize: '10px', padding: '2px 8px', borderRadius: '10px' }}>
            {active + 1}/{images.length}
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {images.map((url, i) => (
            <button key={i} onClick={() => { setActive(i); setLoaded(false); }}
              style={{ width: '36px', height: '36px', borderRadius: '4px', overflow: 'hidden', border: `2px solid ${i === active ? 'var(--gold)' : 'transparent'}`, background: '#f0ede8', padding: 0, cursor: 'pointer' }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ResultCard({ result, rank, queryVector, expanded, onToggle }: {
  result: Result; rank: number; queryVector: number[] | null;
  expanded: boolean; onToggle: () => void;
}) {
  const pct = Math.round(result.score * 100);
  const scoreColor = pct >= 90 ? '#4a7a4a' : pct >= 80 ? '#8a6a2a' : '#6b6459';

  return (
    <div style={{ border: `1px solid ${expanded ? 'var(--gold)' : 'var(--border)'}`, borderLeft: `3px solid ${scoreColor}`, borderRadius: '10px', background: rank === 1 ? '#fdfbf7' : 'var(--white)', overflow: 'hidden', transition: 'border-color 0.2s', animation: `fadeUp 0.4s ease ${rank * 80}ms both` }}>
      <button onClick={onToggle} style={{ width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: '12px', color: 'var(--ink-faint)', fontWeight: 500, width: '20px', flexShrink: 0 }}>{rank}</span>
        <div style={{ width: '48px', height: '48px', borderRadius: '6px', overflow: 'hidden', background: '#f0ede8', flexShrink: 0 }}>
          {result.images?.[0] ? (
            <img src={result.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'var(--ink-faint)', fontSize: '14px' }}>◇</span>
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 400, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '3px' }}>
            {result.name}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {result.type && (
              <span style={{ background: '#f0ede8', color: 'var(--ink-soft)', fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px' }}>
                {TYPE_LABELS[result.type] || result.type.replace(/_/g, ' ')}
              </span>
            )}
            {result.supplier && <span style={{ fontSize: '11px', color: 'var(--ink-faint)' }}>{result.supplier}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '24px', width: '90px', flexShrink: 0 }}>
          {result.vector.map((v, i) => (
            <div key={i} title={DIMS[i]} style={{ flex: 1, borderRadius: '1px', height: `${(v / 5) * 100}%`, background: queryVector && Math.abs(queryVector[i] - v) <= 1 ? DIM_COLORS[i] : '#e0dbd4', minHeight: '2px' }} />
          ))}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '52px' }}>
          <span style={{ fontSize: '20px', fontWeight: 500, color: scoreColor, letterSpacing: '-0.02em', fontFamily: 'var(--font-display)' }}>{pct}%</span>
        </div>
        <span style={{ color: 'var(--ink-faint)', fontSize: '10px', flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '20px', display: 'grid', gridTemplateColumns: '180px 1fr', gap: '24px', animation: 'fadeIn 0.2s ease' }}>
          <Gallery images={result.images} name={result.name} />
          <div>
            <p style={{ fontSize: '10px', fontWeight: 500, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '14px' }}>Produkt-Vektor</p>
            {DIMS.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                <span style={{ width: '88px', fontSize: '11px', color: 'var(--ink-soft)', textAlign: 'right', flexShrink: 0 }}>{d}</span>
                <div style={{ flex: 1, height: '10px', background: '#ede8e0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '3px', width: `${(result.vector[i] / 5) * 100}%`, background: queryVector && Math.abs(queryVector[i] - result.vector[i]) <= 1 ? DIM_COLORS[i] : '#c8c2b8', opacity: queryVector && Math.abs(queryVector[i] - result.vector[i]) <= 1 ? 1 : 0.5, transition: 'width 0.6s ease' }} />
                </div>
                <span style={{ width: '14px', fontSize: '10px', color: 'var(--ink-faint)', textAlign: 'right', flexShrink: 0 }}>{result.vector[i]}</span>
              </div>
            ))}
            <div style={{ marginTop: '18px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button style={{ background: 'var(--ink)', color: 'var(--cream)', border: 'none', borderRadius: '6px', padding: '9px 18px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', letterSpacing: '0.03em' }}
                onMouseEnter={e => (e.target as HTMLElement).style.background = 'var(--gold)'}
                onMouseLeave={e => (e.target as HTMLElement).style.background = 'var(--ink)'}
              >Muster anfragen →</button>
              {result.url && (
                <a href={result.url} target="_blank" rel="noopener noreferrer"
                  style={{ background: 'transparent', color: 'var(--ink-soft)', border: '1px solid var(--border)', borderRadius: '6px', padding: '9px 18px', fontSize: '12px', fontWeight: 400, cursor: 'pointer', textDecoration: 'none' }}>
                  Lieferant →
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [input, setInput] = useState('');
  const [queryVector, setQueryVector] = useState<number[] | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(setProducts).catch(console.error);
  }, []);

  const search = useCallback(async (text: string) => {
    if (!text.trim() || !products.length) return;
    setStatus('loading'); setResults(null); setQueryVector(null); setExpanded(null);
    try {
      const res = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: text }) });
      const { vector, error } = await res.json();
      if (error) throw new Error(error);
      setQueryVector(vector);
      const scored = products.map(p => ({ ...p, score: cosine(vector, p.vector) })).sort((a, b) => b.score - a.score).slice(0, 6);
      setResults(scored);
      setStatus('done');
    } catch { setStatus('error'); }
  }, [products]);

  const submit = () => search(input);
  const useExample = (ex: string) => { setInput(ex); search(ex); };
  const toggle = (id: string) => setExpanded(p => p === id ? null : id);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <header style={{ borderBottom: '1px solid var(--border)', padding: '20px 32px', display: 'flex', alignItems: 'baseline', gap: '12px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 300, letterSpacing: '0.05em' }}>ulba.ai</span>
        <span style={{ color: 'var(--border)' }}>·</span>
        <span style={{ fontSize: '12px', color: 'var(--ink-soft)', letterSpacing: '0.08em' }}>Packaging Discovery</span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--ink-faint)' }}>{products.length} Produkte geladen</span>
      </header>
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ marginBottom: '48px', animation: 'fadeUp 0.6s ease both' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 300, lineHeight: 1.15, marginBottom: '12px', letterSpacing: '-0.01em' }}>
            Finde dein<br />
            <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>perfektes Packaging.</em>
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--ink-soft)', fontWeight: 300, maxWidth: '400px' }}>
            Beschreibe dein Produkt und deine Marke — wir finden das passende Packmittel.
          </p>
        </div>
        <div style={{ marginBottom: '32px', animation: 'fadeUp 0.6s ease 0.1s both' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="z.B. feminine Glasflasche für Anti-Aging Serum, premium..."
              style={{ flex: 1, background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '13px 16px', fontSize: '14px', fontWeight: 300, color: 'var(--ink)', outline: 'none', transition: 'border-color 0.15s' }}
              onFocus={e => (e.target.style.borderColor = 'var(--gold)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
            <button onClick={submit} disabled={status === 'loading' || !products.length}
              style={{ background: status === 'loading' ? 'var(--border)' : 'var(--ink)', color: status === 'loading' ? 'var(--ink-faint)' : 'var(--cream)', border: 'none', borderRadius: '10px', padding: '13px 22px', fontSize: '13px', fontWeight: 500, cursor: status === 'loading' ? 'default' : 'pointer', whiteSpace: 'nowrap', transition: 'background 0.15s' }}>
              {status === 'loading' ? 'Suche...' : 'Suchen →'}
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {EXAMPLES.map((ex, i) => (
              <button key={i} onClick={() => useExample(ex)}
                style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '20px', padding: '5px 12px', fontSize: '11px', color: 'var(--ink-soft)', fontWeight: 400, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--gold)'; (e.target as HTMLElement).style.color = 'var(--ink)'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; (e.target as HTMLElement).style.color = 'var(--ink-soft)'; }}>
                {ex}
              </button>
            ))}
          </div>
        </div>
        {status === 'error' && (
          <div style={{ padding: '14px 18px', background: '#fdf0f0', border: '1px solid #f0c0c0', borderRadius: '8px', color: '#a04040', fontSize: '13px', marginBottom: '24px' }}>
            Fehler bei der Suche. Bitte nochmals versuchen.
          </div>
        )}
        {queryVector && (
          <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '18px 22px', marginBottom: '28px', background: 'var(--white)', animation: 'fadeUp 0.4s ease both' }}>
            <p style={{ fontSize: '10px', fontWeight: 500, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '14px' }}>Such-Vektor</p>
            {DIMS.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <span style={{ width: '88px', fontSize: '11px', color: 'var(--ink-soft)', textAlign: 'right', flexShrink: 0 }}>{d}</span>
                <div style={{ flex: 1, height: '11px', background: '#ede8e0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '3px', width: `${(queryVector[i] / 5) * 100}%`, background: DIM_COLORS[i], transition: 'width 0.5s ease' }} />
                </div>
                <span style={{ width: '14px', fontSize: '10px', color: 'var(--ink-faint)', textAlign: 'right', flexShrink: 0 }}>{queryVector[i]}</span>
              </div>
            ))}
          </div>
        )}
        {results && (
          <div>
            <p style={{ fontSize: '12px', color: 'var(--ink-soft)', marginBottom: '14px' }}>
              <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>Matching Packagings</strong>
              <span style={{ marginLeft: '8px' }}>{results.length} Treffer</span>
              <span style={{ marginLeft: '6px', color: 'var(--ink-faint)', fontSize: '11px' }}>— Klicken zum Aufklappen</span>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {results.map((r, i) => (
                <ResultCard key={r.id} result={r} rank={i + 1} queryVector={queryVector} expanded={expanded === r.id} onToggle={() => toggle(r.id)} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
