/* =====================================================================
   Animações e efeitos visuais
   ===================================================================== */
const Efeitos = (() => {
  const reduzido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // revela elementos .revelar ao rolar
  const obs = 'IntersectionObserver' in window
    ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add('visivel'); obs.unobserve(e.target); } }), { threshold:.12 })
    : null;
  function revelar(raiz = document){ $$('.revelar:not(.visivel)', raiz).forEach(el => obs ? obs.observe(el) : el.classList.add('visivel')); }

  // ondinha no clique dos botões + som
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('.btn, .icone-btn, nav a, .conv, .op-avatar, .op-tema, .perfil-abas a');
    if (!b) return;
    if (b.classList.contains('btn') && !reduzido()){
      const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height);
      const s = document.createElement('span');
      s.className = 'onda-clique';
      s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
      b.appendChild(s); setTimeout(() => s.remove(), 650);
    }
    Som.tocar('clique');
  });

  // inclinação 3D e brilho nos cards
  document.addEventListener('pointermove', e => {
    const c = e.target.closest?.('.card');
    if (!c || reduzido() || e.pointerType !== 'mouse') return;
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    c.style.setProperty('--ry', `${(x - .5) * 10}deg`);
    c.style.setProperty('--rx', `${(.5 - y) * 8}deg`);
    c.style.setProperty('--mx', `${x * 100}%`); c.style.setProperty('--my', `${y * 100}%`);
  });
  document.addEventListener('pointerout', e => {
    const c = e.target.closest?.('.card');
    if (c && !c.contains(e.relatedTarget)){ c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); }
  });

  // confete de patinhas e corações
  function confete(x = innerWidth / 2, y = innerHeight / 2, n = 34, itens = ['🐾','🧡','✨','🎉','🐶','🐱','💙']){
    if (reduzido()) return;
    for (let i = 0; i < n; i++){
      const s = document.createElement('span');
      s.className = 'confete';
      s.textContent = itens[i % itens.length];
      const ang = Math.random() * Math.PI * 2, dist = 120 + Math.random() * 260;
      s.style.cssText = `--x:${x}px;--y:${y}px;--dx:${Math.cos(ang) * dist}px;--dy:${Math.sin(ang) * dist - 120 + Math.random() * 240}px;` +
        `--r:${(Math.random() - .5) * 720}deg;--t:${16 + Math.random() * 18}px;--d:${1.1 + Math.random() * .9}s`;
      document.body.appendChild(s); setTimeout(() => s.remove(), 2200);
    }
  }
  const confeteNo = (el, n) => { const r = el?.getBoundingClientRect?.(); confete(r ? r.left + r.width / 2 : undefined, r ? r.top + r.height / 2 : undefined, n); };

  // números que sobem contando
  function contar(raiz = document){
    $$('[data-contar]', raiz).forEach(el => {
      const fim = +el.dataset.contar || 0;
      if (reduzido() || fim === 0){ el.textContent = fim; return; }
      const t0 = performance.now(), dur = 1100;
      const passo = t => { const p = Math.min(1, (t - t0) / dur); el.textContent = Math.round(fim * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(passo); };
      requestAnimationFrame(passo);
    });
  }

  // troca de tema com círculo que se expande a partir do clique
  async function trocarTema(tema, ev){
    const aplicar = () => { document.documentElement.dataset.tema = tema; pref.set('tema', tema); };
    if (!document.startViewTransition || reduzido()){ aplicar(); return; }
    const x = ev?.clientX ?? innerWidth - 60, y = ev?.clientY ?? 30;
    const raio = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(aplicar);
    await vt.ready;
    document.documentElement.animate({ clipPath:[`circle(0 at ${x}px ${y}px)`, `circle(${raio}px at ${x}px ${y}px)`] },
      { duration:650, easing:'cubic-bezier(.22,1,.36,1)', pseudoElement:'::view-transition-new(root)' });
  }

  // patinhas que sobem no hero
  const patinhaSVG = '<svg viewBox="0 0 48 48" fill="currentColor"><ellipse cx="24" cy="30" rx="9" ry="7.5"/><circle cx="12" cy="19" r="4.2"/><circle cx="19.5" cy="12" r="4.2"/><circle cx="28.5" cy="12" r="4.2"/><circle cx="36" cy="19" r="4.2"/></svg>';
  function patinhas(n = 9){
    return Array.from({ length:n }, (_, i) =>
      `<span class="patinha-voa" style="left:${5 + i * (90 / n) + Math.random() * 6}%;--t:${18 + Math.random() * 22}px;--d:${10 + Math.random() * 8}s;--a:${-Math.random() * 14}s;--r:${(Math.random() - .5) * 120}deg">${patinhaSVG}</span>`).join('');
  }

  // sombra no topo ao rolar
  addEventListener('scroll', () => $('#topo')?.classList.toggle('rolou', scrollY > 8), { passive:true });

  // pílula deslizante das abas (entrar / criar conta)
  function pilula(abas){
    const at = $('button.ativo', abas), p = $('.pilula', abas);
    if (at && p){ p.style.left = at.offsetLeft + 'px'; p.style.width = at.offsetWidth + 'px'; }
  }

  return { revelar, confete, confeteNo, contar, trocarTema, patinhas, pilula, reduzido };
})();
