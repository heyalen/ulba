'use client';

import { useState, useEffect, useCallback } from 'react';

const EXAMPLES = [
  { label: 'Feminine luxury', q: 'Feminine luxury glass serum, premium' },
  { label: 'Gen Z bold', q: 'Gen Z bold color fun affordable' },
  { label: "Men's minimal", q: 'Mens shampoo minimal clean masculine' },
  { label: 'Sustainable', q: 'Sustainable clean beauty refill bamboo' },
  { label: 'Premium ritual', q: 'Premium anti-aging ceremonial glass luxe' },
];

const HEIGHTS = [440, 300, 380, 400, 280, 460, 380, 320, 400];

const TYPE_LABELS: Record<string, string> = {
  Jar_ScrewCap: 'Jar · Screw', Bottle_ScrewCap: 'Bottle · Screw',
  Bottle_DispenserPump: 'Bottle · Pump', Airless_Bottle: 'Airless',
  Airless_Jar: 'Airless Jar', Bottle_FlipTop: 'Bottle · Flip',
  Bottle_Dropper: 'Bottle · Dropper', Bottle_Spray: 'Bottle · Spray',
  Tube_FlipTop: 'Tube · Flip', Tube_ScrewCap: 'Tube · Screw',
  Bottle_TriggerPump: 'Bottle · Trigger',
};

interface Product {
  id: string; name: string; supplier: string; type: string;
  images: string[]; harmonisedImage?: string; bildTyp?: string; url?: string;
  material?: string[]; volume?: number | null; closure?: string; form?: string[]; capImages?: string[];
}
interface Result extends Product {
  score: number; reasoning: string; rendering_brief: string; constraints: string[];
}
interface Project { id: string; name: string; createdAt: number; }
interface FavoriteEntry { productId: string; projectId: string; savedAt: number; product: Product; }
interface DetectedFilter { key: string; value: any; label: string; }

const LS_PROJECTS  = 'ulba_projects';
const LS_FAVORITES = 'ulba_favorites';

function loadProjects(): Project[] {
  try { const raw = localStorage.getItem(LS_PROJECTS); if (raw) return JSON.parse(raw); } catch {}
  const def: Project[] = [{ id: 'default', name: 'My Collection', createdAt: Date.now() }];
  localStorage.setItem(LS_PROJECTS, JSON.stringify(def)); return def;
}
function saveProjects(p: Project[]) { localStorage.setItem(LS_PROJECTS, JSON.stringify(p)); }
function loadFavorites(): FavoriteEntry[] {
  try { const raw = localStorage.getItem(LS_FAVORITES); if (raw) return JSON.parse(raw); } catch {}
  return [];
}
function saveFavorites(f: FavoriteEntry[]) { localStorage.setItem(LS_FAVORITES, JSON.stringify(f)); }

function scoreBg(score: number) {
  if (score >= 80) return '#111';
  if (score >= 60) return '#555';
  return '#999';
}


function CapSlider({ caps }: { caps: string[] }) {
  const [active, setActive] = useState(0);
  if (!caps.length) return null;
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ fontSize:11,color:'#aaa',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:10 }}>Passende Verschlüsse · {caps.length}</div>
      <div style={{ display:'flex',gap:8,overflowX:'auto',paddingBottom:4,scrollbarWidth:'none' as const }}>
        {caps.map((url,i)=>(
          <div key={i} onClick={()=>setActive(i)} style={{ flexShrink:0,width:64,height:64,borderRadius:12,overflow:'hidden',cursor:'pointer',border:active===i?'2px solid #111':'1.5px solid #e5e5e5',background:'#f7f7f7',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <img src={url} alt={`Cap ${i+1}`} style={{ width:'100%',height:'100%',objectFit:'contain',padding:4 }} onError={e=>{(e.target as HTMLImageElement).style.opacity='0.2';}} />
          </div>
        ))}
      </div>
      <div style={{ marginTop:12,width:'100%',height:160,background:'#f7f7f7',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden' }}>
        <img src={caps[active]} alt="Verschluss" style={{ maxHeight:'100%',maxWidth:'100%',objectFit:'contain',padding:16 }} />
      </div>
    </div>
  );
}

function SampleModal({ product, onClose }: { product: Result; onClose: () => void }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [firm, setFirm] = useState(''); const [brief, setBrief] = useState('');
  const [status, setStatus] = useState<'idle'|'sending'|'done'|'error'>('idle');
  const submit = async () => {
    if (!email.trim()) return; setStatus('sending');
    try {
      const res = await fetch('/api/sample-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id, productName: product.name, supplier: product.supplier, brandName: firm||name, brandEmail: email, brief }) });
      if (!res.ok) throw new Error(); setStatus('done');
    } catch { setStatus('error'); }
  };
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:100 }} />
      <div style={{ position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:480,maxWidth:'calc(100vw - 48px)',background:'#fff',borderRadius:28,padding:'44px 44px 40px',zIndex:101,boxShadow:'0 24px 60px rgba(0,0,0,0.15)' }}>
        {status==='done' ? (
          <div style={{ textAlign:'center',padding:'20px 0' }}>
            <div style={{ fontSize:40,marginBottom:16 }}>✓</div>
            <div style={{ fontSize:22,fontWeight:600,color:'#111',marginBottom:10 }}>Request sent</div>
            <div style={{ fontSize:14,color:'#999',marginBottom:32,lineHeight:1.6 }}>We'll get back to you within 3–5 business days<br />with samples and pricing from {product.supplier}.</div>
            <button onClick={onClose} style={{ background:'#111',color:'#fff',border:0,borderRadius:999,padding:'14px 36px',fontSize:15,fontWeight:500,cursor:'pointer',fontFamily:'inherit' }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:28 }}>
              <div><div style={{ fontSize:20,fontWeight:600,color:'#111',marginBottom:4 }}>Request a sample</div><div style={{ fontSize:13,color:'#999' }}>{product.name} · {product.supplier}</div></div>
              <button onClick={onClose} style={{ background:'#f2f2f2',border:0,borderRadius:999,width:36,height:36,cursor:'pointer',color:'#555',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>✕</button>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <div><div style={{ fontSize:11,color:'#aaa',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:6 }}>Name</div><input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={{ width:'100%',background:'#f7f7f7',border:0,borderRadius:12,padding:'12px 16px',fontSize:14,color:'#111',fontFamily:'inherit',boxSizing:'border-box' as const }} /></div>
                <div><div style={{ fontSize:11,color:'#aaa',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:6 }}>Brand</div><input type="text" value={firm} onChange={e=>setFirm(e.target.value)} placeholder="Brand name" style={{ width:'100%',background:'#f7f7f7',border:0,borderRadius:12,padding:'12px 16px',fontSize:14,color:'#111',fontFamily:'inherit',boxSizing:'border-box' as const }} /></div>
              </div>
              <div><div style={{ fontSize:11,color:'#aaa',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:6 }}>Email *</div><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@brand.com" style={{ width:'100%',background:'#f7f7f7',border:0,borderRadius:12,padding:'12px 16px',fontSize:14,color:'#111',fontFamily:'inherit',boxSizing:'border-box' as const }} /></div>
              <div><div style={{ fontSize:11,color:'#aaa',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:6 }}>Brief <span style={{ fontWeight:400,textTransform:'none' as const,letterSpacing:0 }}>(optional)</span></div><textarea value={brief} onChange={e=>setBrief(e.target.value)} placeholder="Volume, quantity, finish, timeline..." rows={3} style={{ width:'100%',background:'#f7f7f7',border:0,borderRadius:12,padding:'12px 16px',fontSize:14,color:'#111',fontFamily:'inherit',boxSizing:'border-box' as const,resize:'none',lineHeight:1.5,outline:'none' }} /></div>
            </div>
            {status==='error'&&<div style={{ fontSize:13,color:'#dc2626',marginTop:10 }}>Something went wrong — please try again.</div>}
            <button onClick={submit} disabled={!email.trim()||status==='sending'} style={{ width:'100%',marginTop:20,padding:'16px',background:email.trim()?'#111':'#e5e5e5',color:email.trim()?'#fff':'#aaa',border:0,borderRadius:999,fontSize:15,fontWeight:500,cursor:email.trim()?'pointer':'default',fontFamily:'inherit' }}>{status==='sending'?'Sending...':'Send request →'}</button>
            <div style={{ fontSize:12,color:'#bbb',textAlign:'center',marginTop:14 }}>We'll respond within 3–5 business days with samples and pricing.</div>
          </>
        )}
      </div>
    </>
  );
}

function SaveToProjectModal({ product, projects, favorites, onSave, onClose }: { product: Product; projects: Project[]; favorites: FavoriteEntry[]; onSave: (projectId: string) => void; onClose: () => void; }) {
  const [newName, setNewName] = useState(''); const [creating, setCreating] = useState(false);
  const savedProjectIds = favorites.filter(f=>f.productId===product.id).map(f=>f.projectId);
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.3)',zIndex:200 }} />
      <div style={{ position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:360,maxWidth:'calc(100vw - 48px)',background:'#fff',borderRadius:24,padding:'32px 32px 28px',zIndex:201,boxShadow:'0 20px 50px rgba(0,0,0,0.15)' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <div style={{ fontSize:17,fontWeight:600,color:'#111' }}>Save to project</div>
          <button onClick={onClose} style={{ background:'#f2f2f2',border:0,borderRadius:999,width:32,height:32,cursor:'pointer',color:'#555',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:16 }}>
          {projects.map(p=>{ const isSaved=savedProjectIds.includes(p.id); return (
            <button key={p.id} onClick={()=>onSave(p.id)} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:isSaved?'#f0f7f0':'#f7f7f7',border:isSaved?'1px solid #86c986':'1px solid transparent',borderRadius:14,cursor:'pointer',fontFamily:'inherit',fontSize:14,color:'#111',textAlign:'left' }}>
              <span>{p.name}</span>{isSaved&&<span style={{ fontSize:16 }}>♥</span>}
            </button>
          ); })}
        </div>
        {creating ? (
          <div style={{ display:'flex',gap:8 }}>
            <input autoFocus type="text" value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&newName.trim()){onSave('__new__:'+newName.trim());setCreating(false);setNewName('');} if(e.key==='Escape')setCreating(false); }} placeholder="Project name..." style={{ flex:1,background:'#f7f7f7',border:0,borderRadius:12,padding:'10px 14px',fontSize:14,color:'#111',fontFamily:'inherit',outline:'none' }} />
            <button onClick={()=>{ if(newName.trim()){onSave('__new__:'+newName.trim());setCreating(false);setNewName('');} }} style={{ background:'#111',color:'#fff',border:0,borderRadius:12,padding:'10px 16px',fontSize:13,cursor:'pointer',fontFamily:'inherit' }}>Add</button>
          </div>
        ) : (
          <button onClick={()=>setCreating(true)} style={{ width:'100%',padding:'11px',background:'#fff',color:'#555',border:'1px dashed #ddd',borderRadius:14,fontSize:13,cursor:'pointer',fontFamily:'inherit' }}>+ New project</button>
        )}
      </div>
    </>
  );
}

function FavoritesView({ projects, favorites, onRemove, onRenameProject, onDeleteProject, onProductClick }: { projects: Project[]; favorites: FavoriteEntry[]; onRemove: (productId: string, projectId: string) => void; onRenameProject: (id: string, name: string) => void; onDeleteProject: (id: string) => void; onProductClick: (product: Product) => void; }) {
  const [editingId, setEditingId] = useState<string|null>(null); const [editName, setEditName] = useState(''); const [activeProject, setActiveProject] = useState<string>('all');
  const filtered = activeProject==='all' ? favorites : favorites.filter(f=>f.projectId===activeProject);
  const uniqueProducts = filtered.filter((f,i,arr)=>arr.findIndex(x=>x.productId===f.productId)===i);
  return (
    <div style={{ maxWidth:1200,margin:'0 auto',padding:'0 32px 60px' }}>
      <div style={{ display:'flex',gap:8,padding:'20px 0 24px',overflowX:'auto',flexWrap:'nowrap' }}>
        <button onClick={()=>setActiveProject('all')} style={{ background:activeProject==='all'?'#111':'#f2f2f2',color:activeProject==='all'?'#fff':'#555',border:0,borderRadius:999,padding:'9px 18px',fontSize:13,cursor:'pointer',whiteSpace:'nowrap',fontFamily:'inherit',flexShrink:0 }}>All ({favorites.filter((f,i,arr)=>arr.findIndex(x=>x.productId===f.productId)===i).length})</button>
        {projects.map(p=>{ const count=favorites.filter(f=>f.projectId===p.id).length; return (
          <div key={p.id} style={{ position:'relative',flexShrink:0 }}>
            {editingId===p.id
              ? <input autoFocus value={editName} onChange={e=>setEditName(e.target.value)} onBlur={()=>{ if(editName.trim())onRenameProject(p.id,editName.trim());setEditingId(null); }} onKeyDown={e=>{ if(e.key==='Enter'){if(editName.trim())onRenameProject(p.id,editName.trim());setEditingId(null);} }} style={{ background:'#f2f2f2',border:0,borderRadius:999,padding:'9px 18px',fontSize:13,fontFamily:'inherit',outline:'none',width:140 }} />
              : <button onClick={()=>setActiveProject(p.id)} onDoubleClick={()=>{ setEditingId(p.id);setEditName(p.name); }} style={{ background:activeProject===p.id?'#111':'#f2f2f2',color:activeProject===p.id?'#fff':'#555',border:0,borderRadius:999,padding:'9px 18px',fontSize:13,cursor:'pointer',whiteSpace:'nowrap',fontFamily:'inherit' }}>{p.name} ({count})</button>}
          </div>
        ); })}
      </div>
      {activeProject!=='all'&&(
        <div style={{ display:'flex',gap:12,marginBottom:20 }}>
          <button onClick={()=>{ const p=projects.find(x=>x.id===activeProject);if(p){setEditingId(p.id);setEditName(p.name);} }} style={{ background:'#f7f7f7',border:0,borderRadius:999,padding:'8px 16px',fontSize:12,cursor:'pointer',color:'#666',fontFamily:'inherit' }}>Rename</button>
          <button onClick={()=>{ onDeleteProject(activeProject);setActiveProject('all'); }} style={{ background:'#fff0f0',border:0,borderRadius:999,padding:'8px 16px',fontSize:12,cursor:'pointer',color:'#dc2626',fontFamily:'inherit' }}>Delete project</button>
        </div>
      )}
      {uniqueProducts.length===0
        ? <div style={{ textAlign:'center',padding:'80px 0',color:'#bbb' }}><div style={{ fontSize:48,marginBottom:16 }}>♡</div><div style={{ fontSize:16 }}>No saved packagings yet</div></div>
        : <div className="masonry-grid">{uniqueProducts.map((f,i)=>(
            <div key={f.productId+f.projectId} style={{ breakInside:'avoid',marginBottom:28 }}>
              <div onClick={()=>onProductClick(f.product)} style={{ width:'100%',minHeight:HEIGHTS[i%HEIGHTS.length],background:'#f5f5f5',position:'relative',borderRadius:20,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' }}>
                {f.product.images?.[0]?<img src={f.product.images[0]} alt={f.product.name} style={{ width:'100%',height:'100%',objectFit:'contain',padding:12,minHeight:HEIGHTS[i%HEIGHTS.length] }} />:<span style={{ fontSize:40,color:'#ccc' }}>◇</span>}
                <button onClick={e=>{ e.stopPropagation();onRemove(f.productId,f.projectId); }} style={{ position:'absolute',top:12,right:12,background:'rgba(255,255,255,0.95)',border:0,borderRadius:999,width:36,height:36,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center' }}>♥</button>
              </div>
              <div style={{ padding:'14px 4px 0' }}><div style={{ fontSize:15,fontWeight:500,color:'#111',lineHeight:1.3,marginBottom:3 }}>{f.product.name}</div><div style={{ fontSize:13,color:'#999' }}>{f.product.supplier}</div></div>
            </div>
          ))}</div>}
    </div>
  );
}

export default function Home() {
  const [mounted, setMounted]                   = useState(false);
  const [input, setInput]                       = useState('');
  const [results, setResults]                   = useState<Result[]|null>(null);
  const [detectedFilters, setDetectedFilters]   = useState<DetectedFilter[]>([]);
  const [activeFilters, setActiveFilters]       = useState<Record<string,any>>({});
  const [status, setStatus]                     = useState<'idle'|'loading'|'done'|'error'>('idle');
  const [selected, setSelected]                 = useState<Result|null>(null);
  const [reasoningLoading, setReasoningLoading] = useState(false);
  const [currentQuery, setCurrentQuery]         = useState('');
  const [showResults, setShowResults]           = useState(false);
  const [sampleProduct, setSampleProduct]       = useState<Result|null>(null);
  const [view, setView]                         = useState<'search'|'saved'>('search');
  const [projects, setProjects]                 = useState<Project[]>([]);
  const [favorites, setFavorites]               = useState<FavoriteEntry[]>([]);
  const [saveModal, setSaveModal]               = useState<Product|null>(null);
  const [copied, setCopied]                     = useState(false);

  useEffect(() => { setMounted(true); setProjects(loadProjects()); setFavorites(loadFavorites()); }, []);

  useEffect(() => {
    if (!mounted) return;
    const h = (e: KeyboardEvent) => { if(e.key==='Escape'){if(sampleProduct){setSampleProduct(null);return;}if(saveModal){setSaveModal(null);return;}setSelected(null);} };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [mounted, sampleProduct, saveModal]);

  useEffect(() => {
    if (!mounted) return;
    if (selected) { const u=new URL(window.location.href); u.searchParams.set('product',selected.id); window.history.replaceState(null,'',u.toString()); }
    else { const u=new URL(window.location.href); u.searchParams.delete('product'); window.history.replaceState(null,'',u.toString()); }
  }, [mounted, selected]);

  // On-demand reasoning — lädt nur wenn Detail-Panel geöffnet wird
  useEffect(() => {
    if (!selected || !currentQuery || selected.reasoning) return;
    setReasoningLoading(true);
    const ctx = [selected.type,(selected.material??[]).join('+'),selected.volume?`${selected.volume}ml`:'',selected.closure,(selected.form??[]).join('+')].filter(Boolean).join(' ');
    fetch('/api/reasoning', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ productName: selected.name, productContext: ctx, query: currentQuery }) })
      .then(r=>r.json())
      .then(d=>{ if(d.reasoning) setSelected(p=>p?{...p,reasoning:d.reasoning,rendering_brief:d.rendering_brief??''}:p); })
      .catch(()=>{})
      .finally(()=>setReasoningLoading(false));
  }, [selected?.id]);

  const isFavorited = (id: string) => favorites.some(f=>f.productId===id);

  const handleSave = (product: Product, projectIdOrNew: string) => {
    let pid = projectIdOrNew; let updP = projects;
    if (projectIdOrNew.startsWith('__new__:')) {
      const name = projectIdOrNew.replace('__new__:','');
      const np: Project = { id: Date.now().toString(), name, createdAt: Date.now() };
      updP = [...projects, np]; setProjects(updP); saveProjects(updP); pid = np.id;
    }
    const saved = favorites.some(f=>f.productId===product.id&&f.projectId===pid);
    const upd = saved ? favorites.filter(f=>!(f.productId===product.id&&f.projectId===pid)) : [...favorites,{productId:product.id,projectId:pid,savedAt:Date.now(),product}];
    setFavorites(upd); saveFavorites(upd); setSaveModal(null);
  };
  const removeFavorite = (pid: string, prj: string) => { const u=favorites.filter(f=>!(f.productId===pid&&f.projectId===prj)); setFavorites(u); saveFavorites(u); };
  const renameProject  = (id: string, name: string) => { const u=projects.map(p=>p.id===id?{...p,name}:p); setProjects(u); saveProjects(u); };
  const deleteProject  = (id: string) => {
    const updP=projects.filter(p=>p.id!==id); const updF=favorites.filter(f=>f.projectId!==id);
    if(!updP.length){const d=[{id:'default',name:'My Collection',createdAt:Date.now()}];setProjects(d);saveProjects(d);}else{setProjects(updP);saveProjects(updP);}
    setFavorites(updF); saveFavorites(updF);
  };
  const copyLink = () => {
    if(!selected||!mounted) return;
    const u=new URL(window.location.href); u.searchParams.set('product',selected.id);
    navigator.clipboard.writeText(u.toString()); setCopied(true); setTimeout(()=>setCopied(false),2000);
  };

  const doSearch = useCallback(async (text: string, overrideFilters?: Record<string,any>) => {
    if (!text.trim()) return;
    setStatus('loading'); setCurrentQuery(text); setShowResults(true); setView('search');
    try {
      const body: any = { query: text };
      if (overrideFilters !== undefined) body.active_filters = overrideFilters;
      const res = await fetch('/api/search', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDetectedFilters(data.detected_filters||[]);
      const na: Record<string,any> = {};
      for (const f of (data.detected_filters||[])) na[f.key]=f.value;
      setActiveFilters(na);
      setResults(data.results||[]);
      setStatus('done');
      if (mounted) window.scrollTo({top:0,behavior:'smooth'});
    } catch { setStatus('error'); }
  }, [mounted]);

  const search     = (t: string) => { setActiveFilters({}); doSearch(t); };
  const submit     = () => search(input);
  const useExample = (q: string) => { setInput(q); search(q); };
  const removeFilter = (key: string) => { const n={...activeFilters}; delete n[key]; setActiveFilters(n); doSearch(currentQuery,n); };
  const goHome = () => { setShowResults(false); setInput(''); setCurrentQuery(''); setResults(null); setDetectedFilters([]); setActiveFilters({}); setSelected(null); setView('search'); if(mounted)window.scrollTo({top:0,behavior:'smooth'}); };

  const favCount = favorites.filter((f,i,arr)=>arr.findIndex(x=>x.productId===f.productId)===i).length;

  if (!mounted) return (
    <div style={{ minHeight:'100vh',background:'#fff',fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ display:'flex',alignItems:'center',padding:'0 32px',height:60,borderBottom:'1px solid #f0f0f0' }}><span style={{ fontSize:15,fontWeight:600,color:'#111' }}>ulba.ai</span></div>
      <div style={{ display:'flex',flexDirection:'column',alignItems:'center',padding:'96px 24px 48px' }}>
        <div style={{ fontSize:32,fontWeight:500,color:'#111',marginBottom:8,textAlign:'center' }}>Find your perfect packaging.</div>
        <div style={{ fontSize:15,color:'#999',marginBottom:36,textAlign:'center' }}>Describe your brand — we'll find the right packaging.</div>
        <div style={{ display:'flex',alignItems:'center',gap:12,background:'#f2f2f2',borderRadius:999,padding:'16px 24px',width:'100%',maxWidth:640 }}><span style={{ color:'#888',fontSize:18 }}>⌕</span><input type="text" placeholder="e.g. feminine luxury glass serum..." style={{ fontSize:16,flex:1,border:0,background:'transparent',outline:'none',color:'#111',fontFamily:'inherit' }} /></div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh',background:'#fff',fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",color:'#111' }}>
      <style>{`
        input[type="text"],input[type="email"]{-webkit-appearance:none!important;appearance:none!important;border:0!important;outline:0!important;background:transparent!important;box-shadow:none!important;padding:0!important;margin:0!important;width:100%!important;color:#111!important;font-family:inherit!important}
        input::placeholder{color:#aaa!important;opacity:1!important} textarea::placeholder{color:#aaa;opacity:1} textarea{outline:none}
        .chips-bar::-webkit-scrollbar{display:none}
        .masonry-grid{columns:3;column-gap:24px} @media(max-width:900px){.masonry-grid{columns:2}} @media(max-width:600px){.masonry-grid{columns:1}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} .rl{animation:pulse 1.5s ease-in-out infinite}
      `}</style>

      <div style={{ display:'flex',alignItems:'center',padding:'0 32px',height:60,borderBottom:'1px solid #f0f0f0',background:'#fff',gap:20,position:'sticky',top:0,zIndex:40 }}>
        <span onClick={goHome} style={{ fontSize:15,fontWeight:600,color:'#111',cursor:'pointer',flexShrink:0 }}>ulba.ai</span>
        {(showResults||view==='saved')&&<div style={{ flex:1,display:'flex',justifyContent:'center' }}>{view==='search'&&<div style={{ display:'flex',alignItems:'center',gap:10,background:'#f2f2f2',borderRadius:999,padding:'10px 20px',width:'100%',maxWidth:720 }}><span style={{ color:'#888',fontSize:15 }}>⌕</span><input type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} placeholder="Search packaging..." style={{ fontSize:14 }} /></div>}</div>}
        <button onClick={()=>setView(v=>v==='saved'?'search':'saved')} style={{ display:'flex',alignItems:'center',gap:6,background:view==='saved'?'#111':'#f2f2f2',color:view==='saved'?'#fff':'#555',border:0,borderRadius:999,padding:'8px 16px',fontSize:13,cursor:'pointer',fontFamily:'inherit',flexShrink:0 }}>
          <span style={{ fontSize:14 }}>{view==='saved'?'♥':'♡'}</span><span>Saved{favCount>0?` (${favCount})`:''}</span>
        </button>
      </div>

      {!showResults&&view==='search'&&(
        <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'96px 24px 48px' }}>
          <div style={{ fontSize:32,fontWeight:500,color:'#111',marginBottom:8,textAlign:'center',letterSpacing:'-0.02em' }}>Find your perfect packaging.</div>
          <div style={{ fontSize:15,color:'#999',marginBottom:36,textAlign:'center' }}>Describe your brand — we'll find the right packaging.</div>
          <div style={{ display:'flex',alignItems:'center',gap:12,background:'#f2f2f2',borderRadius:999,padding:'16px 24px',width:'100%',maxWidth:640 }}>
            <span style={{ color:'#888',fontSize:18 }}>⌕</span>
            <input type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} placeholder="e.g. feminine luxury glass serum..." style={{ fontSize:16 }} autoFocus />
          </div>
          <div style={{ display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center',marginTop:24,maxWidth:600 }}>
            {EXAMPLES.map((ex,i)=><button key={i} onClick={()=>useExample(ex.q)} style={{ background:'#f2f2f2',color:'#555',border:0,borderRadius:999,padding:'9px 18px',fontSize:13,cursor:'pointer',whiteSpace:'nowrap',fontFamily:'inherit' }}>{ex.label}</button>)}
          </div>
        </div>
      )}

      {view==='saved'&&<FavoritesView projects={projects} favorites={favorites} onRemove={removeFavorite} onRenameProject={renameProject} onDeleteProject={deleteProject} onProductClick={p=>setSelected({...p,score:0,reasoning:'',rendering_brief:'',constraints:[]})} />}

      {showResults&&view==='search'&&(
        <div style={{ maxWidth:1200,margin:'0 auto',padding:'0 32px' }}>
          <div className="chips-bar" style={{ display:'flex',gap:8,padding:'16px 0 8px',overflowX:'auto',flexWrap:'nowrap' }}>
            {EXAMPLES.map((ex,i)=><button key={i} onClick={()=>useExample(ex.q)} style={{ background:currentQuery===ex.q?'#111':'#f2f2f2',color:currentQuery===ex.q?'#fff':'#555',border:0,borderRadius:999,padding:'9px 18px',fontSize:13,cursor:'pointer',whiteSpace:'nowrap',fontFamily:'inherit',flexShrink:0 }}>{ex.label}</button>)}
          </div>
          {detectedFilters.length>0&&<div style={{ display:'flex',gap:6,flexWrap:'wrap',padding:'4px 0 8px' }}>{detectedFilters.map(f=><div key={f.key} style={{ display:'flex',alignItems:'center',gap:6,background:'#111',color:'#fff',borderRadius:999,padding:'6px 12px',fontSize:12,fontWeight:500 }}><span>{f.label}</span><span onClick={()=>removeFilter(f.key)} style={{ cursor:'pointer',opacity:0.7,fontSize:16,lineHeight:1,marginLeft:2 }}>×</span></div>)}</div>}
          <div style={{ padding:'8px 0 24px',fontSize:14,color:'#999',display:'flex',alignItems:'baseline',gap:10 }}>
            {status==='loading'&&<span>Searching...</span>}
            {status==='error'&&<span style={{ color:'#dc2626' }}>Error — please try again</span>}
            {results&&status==='done'&&<><b style={{ color:'#111',fontWeight:500,fontSize:15 }}>{results.length} packagings</b><span>for "{currentQuery}"</span><span style={{ marginLeft:'auto',fontSize:12,color:'#bbb' }}>Sorted by relevance</span></>}
            {results&&status==='done'&&results.length===0&&<span style={{ color:'#aaa' }}>No results — try a broader search</span>}
          </div>
          {results&&results.length>0&&(
            <div className="masonry-grid" style={{ paddingBottom:60 }}>
              {results.map((r,i)=>{ const img=r.harmonisedImage||r.images?.[0]||null; return (
                <div key={r.id} style={{ breakInside:'avoid',marginBottom:28 }}>
                  <div onClick={()=>setSelected(r)} style={{ width:'100%',minHeight:HEIGHTS[i%HEIGHTS.length],background:'#f5f5f5',position:'relative',borderRadius:20,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' }}>
                    {img?<img src={img} alt={r.name} style={{ width:'100%',height:'100%',objectFit:'contain',minHeight:HEIGHTS[i%HEIGHTS.length],padding:12 }} onError={e=>{(e.target as HTMLImageElement).style.display='none';}} />:<span style={{ fontSize:40,color:'#ccc' }}>◇</span>}
                    <div style={{ position:'absolute',top:14,right:14,background:scoreBg(r.score),color:'#fff',borderRadius:999,padding:'5px 13px',fontSize:12,fontWeight:600 }}>{r.score}%</div>
                    <button onClick={e=>{e.stopPropagation();setSaveModal(r);}} style={{ position:'absolute',bottom:12,right:12,background:'rgba(255,255,255,0.95)',border:0,borderRadius:999,width:36,height:36,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',color:isFavorited(r.id)?'#e11d48':'#999' }}>{isFavorited(r.id)?'♥':'♡'}</button>
                  </div>
                  <div style={{ padding:'14px 4px 0' }}>
                    <div style={{ fontSize:15,fontWeight:500,color:'#111',lineHeight:1.3,marginBottom:3 }}>{r.name}</div>
                    <div style={{ fontSize:13,color:'#999' }}>{r.supplier}</div>
                  </div>
                </div>
              ); })}
            </div>
          )}
        </div>
      )}

      {selected&&(
        <>
          <div onClick={()=>setSelected(null)} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.25)',zIndex:50 }} />
          <div style={{ position:'fixed',top:0,right:0,width:680,maxWidth:'100vw',height:'100%',background:'#fff',zIndex:51,overflowY:'auto',boxShadow:'-2px 0 30px rgba(0,0,0,0.08)' }}>
            <div style={{ padding:'36px 44px 52px' }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,gap:10 }}>
                <div style={{ display:'flex',gap:10 }}>
                  <button onClick={()=>setSaveModal(selected)} style={{ display:'flex',alignItems:'center',gap:6,background:isFavorited(selected.id)?'#fff0f4':'#f2f2f2',color:isFavorited(selected.id)?'#e11d48':'#555',border:isFavorited(selected.id)?'1px solid #fecdd3':'1px solid transparent',borderRadius:999,padding:'10px 20px',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit' }}>
                    <span>{isFavorited(selected.id)?'♥':'♡'}</span><span>{isFavorited(selected.id)?'Saved':'Save'}</span>
                  </button>
                  <button onClick={copyLink} style={{ display:'flex',alignItems:'center',gap:6,background:copied?'#f0fdf4':'#f2f2f2',color:copied?'#16a34a':'#555',border:copied?'1px solid #bbf7d0':'1px solid transparent',borderRadius:999,padding:'10px 20px',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit' }}>
                    <span style={{ fontSize:13 }}>{copied?'✓':'↗'}</span><span>{copied?'Copied!':'Share'}</span>
                  </button>
                </div>
                <button onClick={()=>setSelected(null)} style={{ background:'#f2f2f2',border:0,borderRadius:999,width:40,height:40,cursor:'pointer',color:'#555',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>✕</button>
              </div>

              {selected.capImages&&selected.capImages.length>0&&<CapSlider caps={selected.capImages} />}

              <div style={{ marginBottom:28 }}>
                <div style={{ width:'100%',aspectRatio:'1',background:'#f5f5f5',borderRadius:24,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden' }}>
                  {selected.harmonisedImage?<img src={selected.harmonisedImage} alt={selected.name} style={{ width:'100%',height:'100%',objectFit:'contain',padding:24 }} />:selected.images?.length>0?<img src={selected.images[0]} alt={selected.name} style={{ width:'100%',height:'100%',objectFit:'contain' }} />:<span style={{ fontSize:88,color:'#ddd' }}>◇</span>}
                </div>
              </div>

              <div style={{ fontSize:28,fontWeight:500,color:'#111',lineHeight:1.25,marginBottom:4,letterSpacing:'-0.01em' }}>{selected.name}</div>
              <div style={{ fontSize:15,color:'#999',marginBottom:24 }}>{selected.supplier}</div>

              {/* Score + Reasoning (on-demand) */}
              {selected.score>0&&(
                <div style={{ background:'#f7f7f7',borderRadius:20,padding:'20px 24px',marginBottom:24 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:10 }}>
                    <b style={{ fontSize:32,fontWeight:600,color:'#111' }}>{selected.score}%</b>
                    <span style={{ fontSize:13,color:'#999' }}>match</span>
                  </div>
                  {reasoningLoading&&<div className="rl" style={{ height:14,width:'75%',background:'#ddd',borderRadius:7 }} />}
                  {!reasoningLoading&&selected.reasoning&&<p style={{ margin:0,fontSize:14,color:'#555',lineHeight:1.6 }}>{selected.reasoning}</p>}
                </div>
              )}

              {selected.constraints?.length>0&&(
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontSize:11,color:'#bbb',letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:500,marginBottom:10 }}>Nicht möglich</div>
                  {selected.constraints.map((c,i)=><div key={i} style={{ display:'flex',alignItems:'flex-start',gap:8,fontSize:13,color:'#666',marginBottom:6,lineHeight:1.5 }}><span style={{ color:'#dc2626',flexShrink:0,marginTop:1 }}>✕</span>{c}</div>)}
                </div>
              )}

              <div style={{ marginBottom:28 }}>
                <div style={{ fontSize:11,color:'#bbb',letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:500,marginBottom:14 }}>Specifications</div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                  {selected.type&&<div style={{ background:'#f7f7f7',borderRadius:14,padding:'14px 18px' }}><div style={{ fontSize:11,color:'#aaa',marginBottom:4 }}>Type</div><div style={{ fontSize:15,fontWeight:500,color:'#111' }}>{TYPE_LABELS[selected.type]||selected.type}</div></div>}
                  {selected.supplier&&<div style={{ background:'#f7f7f7',borderRadius:14,padding:'14px 18px' }}><div style={{ fontSize:11,color:'#aaa',marginBottom:4 }}>Supplier</div><div style={{ fontSize:15,fontWeight:500,color:'#111' }}>{selected.supplier}</div></div>}
                  {selected.material?.length?<div style={{ background:'#f7f7f7',borderRadius:14,padding:'14px 18px' }}><div style={{ fontSize:11,color:'#aaa',marginBottom:4 }}>Material</div><div style={{ fontSize:15,fontWeight:500,color:'#111' }}>{selected.material.join(', ')}</div></div>:null}
                  {selected.volume?<div style={{ background:'#f7f7f7',borderRadius:14,padding:'14px 18px' }}><div style={{ fontSize:11,color:'#aaa',marginBottom:4 }}>Volume</div><div style={{ fontSize:15,fontWeight:500,color:'#111' }}>{selected.volume} ml</div></div>:null}
                  {selected.closure&&<div style={{ background:'#f7f7f7',borderRadius:14,padding:'14px 18px' }}><div style={{ fontSize:11,color:'#aaa',marginBottom:4 }}>Closure</div><div style={{ fontSize:15,fontWeight:500,color:'#111' }}>{selected.closure}</div></div>}
                  {selected.form?.length?<div style={{ background:'#f7f7f7',borderRadius:14,padding:'14px 18px' }}><div style={{ fontSize:11,color:'#aaa',marginBottom:4 }}>Form</div><div style={{ fontSize:15,fontWeight:500,color:'#111' }}>{selected.form.join(', ')}</div></div>:null}
                </div>
              </div>

              <div style={{ display:'flex',gap:12,marginTop:32 }}>
                <button onClick={()=>setSampleProduct(selected)} style={{ flex:1,padding:18,background:'#111',color:'#fff',border:0,borderRadius:999,fontSize:16,fontWeight:500,cursor:'pointer',fontFamily:'inherit' }}>Request sample →</button>
                {selected.url&&<a href={selected.url} target="_blank" rel="noopener noreferrer" style={{ padding:'18px 32px',background:'#fff',color:'#111',border:'1px solid #e5e5e5',borderRadius:999,fontSize:16,fontWeight:500,cursor:'pointer',fontFamily:'inherit',textDecoration:'none' }}>Supplier</a>}
              </div>
            </div>
          </div>
        </>
      )}

      {sampleProduct&&<SampleModal product={sampleProduct} onClose={()=>setSampleProduct(null)} />}
      {saveModal&&<SaveToProjectModal product={saveModal} projects={projects} favorites={favorites} onSave={(pid)=>handleSave(saveModal,pid)} onClose={()=>setSaveModal(null)} />}
    </div>
  );
}
