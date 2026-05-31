'use client';

import { useState, useEffect, useCallback } from 'react';
import { cosine, DIMS } from '@/lib/search';

const EXAMPLES = [
  { label: 'Feminine luxury', q: 'Feminine luxury glass serum, premium' },
  { label: 'Gen Z bold', q: 'Gen Z bold color fun affordable' },
  { label: "Men's minimal", q: 'Mens shampoo minimal clean masculine' },
  { label: 'Sustainable', q: 'Sustainable clean beauty refill bamboo' },
  { label: 'Premium ritual', q: 'Premium anti-aging ceremonial glass luxe' },
];

const HEIGHTS = [440, 300, 380, 400, 280, 460, 380, 320, 400];

const TYPE_LABELS: Record<string, string> = {
  Jar_ScrewCap: 'Jar · Screw',
  Bottle_ScrewCap: 'Bottle · Screw',
  Bottle_DispenserPump: 'Bottle · Pump',
  Airless_Bottle: 'Airless',
  Airless_Jar: 'Airless Jar',
  Bottle_FlipTop: 'Bottle · Flip',
  Bottle_Dropper: 'Bottle · Dropper',
  Bottle_Spray: 'Bottle · Spray',
  Tube_FlipTop: 'Tube · Flip',
  Tube_ScrewCap: 'Tube · Screw',
  Bottle_TriggerPump: 'Bottle · Trigger',
};

interface Product {
  id: string;
  name: string;
  supplier: string;
  type: string;
  images: string[];
  vector: number[];
  url?: string;
}
interface Result extends Product { score: number; }

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [input, setInput] = useState('');
  const [queryVector, setQueryVector] = useState<number[] | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [selected, setSelected] = useState<Result | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [currentQuery, setCurrentQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(setProducts).catch(console.error);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const search = useCallback(async (text: string) => {
    if (!text.trim() || !products.length) return;
    setStatus('loading');
    setCurrentQuery(text);
    setShowResults(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });
      const { vector, error } = await res.json();
      if (error) throw new Error(error);
      setQueryVector(vector);
      const scored = products
        .map(p => ({ ...p, score: cosine(vector, p.vector) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 12);
      setResults(scored);
      setStatus('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setStatus('error');
    }
  }, [products]);

  const submit = () => search(input);
  const useExample = (q: string) => { setInput(q); search(q); };

  const goHome = () => {
    setShowResults(false);
    setInput('');
    setCurrentQuery('');
    setResults(null);
    setQueryVector(null);
    setSelected(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleSave = (id: string) => setSaved(s => ({ ...s, [id]: !s[id] }));

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: '#111' }}>
      <style>{`
        input[type="text"]{
          -webkit-appearance:none !important;
          appearance:none !important;
          border:0 !important;
          outline:0 !important;
          background:transparent !important;
          box-shadow:none !important;
          padding:0 !important;
          margin:0 !important;
          width:100% !important;
          color:#111 !important;
          font-family:inherit !important;
        }
        input::placeholder{color:#aaa !important;opacity:1 !important}
        .chips-bar::-webkit-scrollbar{display:none}
        .masonry-grid{columns:3;column-gap:24px}
        @media (max-width: 900px){.masonry-grid{columns:2}}
        @media (max-width: 600px){.masonry-grid{columns:1}}
      `}</style>

      {/* TOPBAR — always visible */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 32px', height: 60, borderBottom: '1px solid #f0f0f0', background: '#fff', gap: 24, position: 'sticky', top: 0, zIndex: 40 }}>
        <span onClick={goHome} style={{ fontSize: 15, fontWeight: 600, color: '#111', cursor: 'pointer', flexShrink: 0 }}>ulba.ai</span>
        {showResults && (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f2f2f2', borderRadius: 999, padding: '10px 20px', width: '100%', maxWidth: 720 }}>
              <span style={{ color: '#888', fontSize: 15 }}>⌕</span>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="Search packaging..."
                style={{ fontSize: 14 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* HERO */}
      {!showResults && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '96px 24px 48px' }}>
          <div style={{ fontSize: 32, fontWeight: 500, color: '#111', marginBottom: 8, textAlign: 'center', letterSpacing: '-0.02em' }}>
            Find your perfect packaging.
          </div>
          <div style={{ fontSize: 15, color: '#999', marginBottom: 36, textAlign: 'center' }}>
            Describe your brand — we'll find the right packaging.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f2f2f2', borderRadius: 999, padding: '16px 24px', width: '100%', maxWidth: 640 }}>
            <span style={{ color: '#888', fontSize: 18 }}>⌕</span>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="e.g. feminine luxury glass serum..."
              style={{ fontSize: 16 }}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 24, maxWidth: 600 }}>
            {EXAMPLES.map((ex, i) => (
              <button key={i} onClick={() => useExample(ex.q)} style={{ background: currentQuery === ex.q ? '#111' : '#f2f2f2', color: currentQuery === ex.q ? '#fff' : '#555', border: 0, borderRadius: 999, padding: '9px 18px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* RESULTS */}
      {showResults && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
          <div className="chips-bar" style={{ display: 'flex', gap: 8, padding: '16px 0', overflowX: 'auto', flexWrap: 'nowrap' }}>
            {EXAMPLES.map((ex, i) => (
              <button key={i} onClick={() => useExample(ex.q)} style={{ background: currentQuery === ex.q ? '#111' : '#f2f2f2', color: currentQuery === ex.q ? '#fff' : '#555', border: 0, borderRadius: 999, padding: '9px 18px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0 }}>
                {ex.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '8px 0 24px', fontSize: 14, color: '#999', display: 'flex', alignItems: 'baseline', gap: 10 }}>
            {status === 'loading' && <span>Searching...</span>}
            {status === 'error' && <span style={{ color: '#dc2626' }}>Error — please try again</span>}
            {results && status === 'done' && (
              <>
                <b style={{ color: '#111', fontWeight: 500, fontSize: 15 }}>{results.length} packagings</b>
                <span>for "{currentQuery}"</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: '#bbb' }}>Sorted by relevance</span>
              </>
            )}
          </div>

          {results && (
            <div className="masonry-grid" style={{ paddingBottom: 60 }}>
              {results.map((r, i) => (
                <div key={r.id} onClick={() => setSelected(r)} style={{ breakInside: 'avoid', marginBottom: 28, cursor: 'pointer' }}>
                  <div style={{ width: '100%', minHeight: HEIGHTS[i % HEIGHTS.length], background: '#f0f0f0', position: 'relative', borderRadius: 20, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {r.images?.[0] ? (
                      <img src={r.images[0]} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: HEIGHTS[i % HEIGHTS.length] }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <span style={{ fontSize: 40, color: '#ccc' }}>◇</span>
                    )}
                    <div style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.95)', borderRadius: 999, padding: '5px 13px', fontSize: 12, fontWeight: 600, color: '#111', backdropFilter: 'blur(10px)' }}>
                      {Math.round(r.score * 100)}%
                    </div>
                  </div>
                  <div style={{ padding: '14px 4px 0' }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: '#111', lineHeight: 1.3, marginBottom: 3 }}>{r.name}</div>
                    <div style={{ fontSize: 13, color: '#999' }}>{r.supplier}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PANEL — 680px wide */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 50 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, width: 680, maxWidth: '100vw', height: '100%', background: '#fff', zIndex: 51, overflowY: 'auto', boxShadow: '-2px 0 30px rgba(0,0,0,0.08)' }}>
            <div style={{ padding: '36px 44px 52px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <button onClick={() => toggleSave(selected.id)} style={{ background: saved[selected.id] ? '#fff' : '#111', color: saved[selected.id] ? '#111' : '#fff', border: saved[selected.id] ? '1px solid #111' : 0, borderRadius: 999, padding: '12px 28px', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {saved[selected.id] ? 'Saved' : 'Save'}
                </button>
                <button onClick={() => setSelected(null)} style={{ background: '#f2f2f2', border: 0, borderRadius: 999, width: 40, height: 40, cursor: 'pointer', color: '#555', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ✕
                </button>
              </div>

              <div style={{ width: '100%', aspectRatio: '1', background: '#f5f5f5', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28, overflow: 'hidden' }}>
                {selected.images?.[0] ? (
                  <img src={selected.images[0]} alt={selected.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: 88, color: '#ddd' }}>◇</span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 12 }}>
                <b style={{ fontSize: 44, fontWeight: 600, color: '#111', letterSpacing: '-0.02em' }}>{Math.round(selected.score * 100)}%</b>
                <span style={{ fontSize: 14, color: '#999' }}>match</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 500, color: '#111', lineHeight: 1.25, marginBottom: 6, letterSpacing: '-0.01em' }}>{selected.name}</div>
              <div style={{ fontSize: 15, color: '#999', marginBottom: 28 }}>{selected.supplier}</div>

              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 12, color: '#bbb', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 16 }}>Specifications</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: '#f7f7f7', borderRadius: 16, padding: '16px 20px' }}>
                    <div style={{ fontSize: 12, color: '#aaa', marginBottom: 5 }}>Type</div>
                    <div style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>{TYPE_LABELS[selected.type] || selected.type.replace(/_/g, ' ')}</div>
                  </div>
                  <div style={{ background: '#f7f7f7', borderRadius: 16, padding: '16px 20px' }}>
                    <div style={{ fontSize: 12, color: '#aaa', marginBottom: 5 }}>Supplier</div>
                    <div style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>{selected.supplier}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 12, color: '#bbb', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 16 }}>Brand profile</div>
                {selected.vector.map((v, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 9 }}>
                    <span style={{ width: 110, fontSize: 13, color: '#aaa', textAlign: 'right', flexShrink: 0 }}>{DIMS[i]}</span>
                    <div style={{ flex: 1, height: 4, background: '#f0f0f0', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${(v / 5) * 100}%`, background: queryVector && Math.abs(queryVector[i] - v) <= 1 ? '#111' : '#ccc', borderRadius: 2 }} />
                    </div>
                    <span style={{ width: 18, fontSize: 12.5, color: '#bbb', textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
                <button style={{ flex: 1, padding: 18, background: '#111', color: '#fff', border: 0, borderRadius: 999, fontSize: 16, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Request sample →
                </button>
                {selected.url && (
                  <a href={selected.url} target="_blank" rel="noopener noreferrer" style={{ padding: '18px 32px', background: '#fff', color: '#111', border: '1px solid #e5e5e5', borderRadius: 999, fontSize: 16, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' }}>
                    Supplier
                  </a>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
