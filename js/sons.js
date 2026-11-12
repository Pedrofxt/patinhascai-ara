/* =====================================================================
   Efeitos sonoros sintetizados com Web Audio (sem arquivos de áudio)
   Som.tocar('clique' | 'sucesso' | 'erro' | 'enviar' | 'receber' | 'tema' | 'festa' | 'pop' | 'latido' | 'miau')
   ===================================================================== */
const Som = (() => {
  let ctx = null;
  let ligado = pref.get('som', '1') === '1';

  const contexto = () => {
    if (!ctx){ const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  function tom(freq, { dur = .12, tipo = 'sine', vol = .1, ate = null, atraso = 0 } = {}){
    const c = contexto(); if (!c) return;
    const t = c.currentTime + atraso;
    const o = c.createOscillator(), g = c.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(freq, t);
    if (ate) o.frequency.exponentialRampToValueAtTime(ate, t + dur);
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + .012);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + .03);
  }

  // ruído filtrado: "chuá" de onda
  function onda(dur = .5, vol = .05){
    const c = contexto(); if (!c) return;
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / d.length);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'bandpass'; f.frequency.setValueAtTime(400, c.currentTime); f.frequency.exponentialRampToValueAtTime(1800, c.currentTime + dur);
    g.gain.value = vol; s.buffer = buf; s.connect(f).connect(g).connect(c.destination); s.start();
  }

  const sons = {
    clique:  () => tom(540, { dur:.07, ate:820, vol:.05 }),
    pop:     () => tom(300, { dur:.09, ate:900, vol:.07, tipo:'triangle' }),
    sucesso: () => [523, 659, 784, 1047].forEach((f, i) => tom(f, { dur:.2, tipo:'triangle', vol:.08, atraso:i * .07 })),
    erro:    () => { tom(240, { dur:.16, tipo:'square', vol:.035 }); tom(170, { dur:.24, tipo:'square', vol:.035, atraso:.13 }); },
    enviar:  () => { tom(380, { dur:.14, ate:1150, vol:.06 }); onda(.18, .02); },
    receber: () => { tom(880, { dur:.24, vol:.08 }); tom(1320, { dur:.32, vol:.06, atraso:.09 }); },
    tema:    () => { onda(.6, .045); tom(330, { dur:.4, ate:880, tipo:'triangle', vol:.04 }); },
    festa:   () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tom(f, { dur:.22, tipo:'triangle', vol:.08, atraso:i * .09 })),
    latido:  () => { tom(420, { dur:.09, ate:260, tipo:'sawtooth', vol:.05 }); tom(440, { dur:.1, ate:250, tipo:'sawtooth', vol:.05, atraso:.16 }); },
    miau:    () => tom(620, { dur:.45, ate:900, tipo:'triangle', vol:.05 }),
    alternar:() => tom(700, { dur:.08, vol:.05 })
  };

  return {
    tocar(nome){ if (!ligado) return; try { sons[nome]?.(); } catch {} },
    get ligado(){ return ligado; },
    definir(v){ ligado = !!v; pref.set('som', ligado ? '1' : '0'); if (ligado) sons.alternar(); return ligado; }
  };
})();
