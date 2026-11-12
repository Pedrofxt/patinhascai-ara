/* =====================================================================
   Utilitários, rótulos e avatares
   ===================================================================== */
const CIDADES = ['Antonina','Guaraqueçaba','Guaratuba','Matinhos','Morretes','Paranaguá','Pontal do Paraná'];
const ROTULO = {
  cachorro:'Cachorro', gato:'Gato', outro:'Outro', macho:'Macho', femea:'Fêmea',
  pequeno:'Pequeno', medio:'Médio', grande:'Grande',
  disponivel:'Disponível', reservado:'Reservado', adotado:'Adotado'
};
const EMOJI = { cachorro:'🐶', gato:'🐱', outro:'🐾' };

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const opcoes = (lista, sel = '', vazio) => (vazio ? `<option value="">${vazio}</option>` : '') +
  lista.map(v => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(ROTULO[v] || v)}</option>`).join('');
const hora = d => new Date(d).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
const dataBR = d => d ? new Date(String(d).length === 10 ? d + 'T12:00' : d).toLocaleDateString('pt-BR') : '—';
const mesAno = d => new Date(d).toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
const quando = d => {
  const min = (Date.now() - new Date(d)) / 6e4;
  if (min < 60) return 'agora há pouco';
  const dias = Math.floor(min / 1440);
  return dias < 1 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias} dias`;
};
const ehNovo = d => Date.now() - new Date(d) < 2 * 864e5;
const primeiroNome = n => (n || '').trim().split(/\s+/)[0] || '';
const lerArquivo = f => new Promise((ok, erro) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = erro; r.readAsDataURL(f); });
const espera = ms => new Promise(r => setTimeout(r, ms));

/* preferências locais (tema, som) */
const pref = {
  get(k, d){ try { return localStorage.getItem('pc-' + k) ?? d; } catch { return d; } },
  set(k, v){ try { localStorage.setItem('pc-' + k, v); } catch {} }
};

/* reduz a imagem antes de enviar (mais rápido e economiza Storage) */
async function redimensionar(arquivo, max = 1280, quadrado = false){
  if (!arquivo?.type?.startsWith('image/')) throw new Error('Envie um arquivo de imagem (JPG, PNG ou WEBP).');
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => erro(new Error('Não consegui ler essa imagem.')); i.src = url; });
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
    if (quadrado){ const lado = Math.min(sw, sh); sx = (sw - lado) / 2; sy = (sh - lado) / 2; sw = sh = lado; }
    const k = Math.min(1, max / Math.max(sw, sh));
    const c = document.createElement('canvas');
    c.width = Math.round(sw * k); c.height = Math.round(sh * k);
    c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    return await new Promise((ok, erro) => c.toBlob(b => b ? ok(b) : erro(new Error('Falha ao processar a imagem.')), 'image/jpeg', .86));
  } finally { URL.revokeObjectURL(url); }
}

/* aviso flutuante + som */
function aviso(msg, tipo = 'info'){
  const t = $('#toast');
  t.className = tipo === 'erro' ? 'erro' : '';
  t.innerHTML = `<span>${tipo === 'erro' ? '⚠️' : tipo === 'sucesso' ? '✨' : '🐾'}</span><span>${esc(msg)}</span>`;
  requestAnimationFrame(() => t.classList.add('on'));
  if (tipo === 'erro') Som.tocar('erro'); else if (tipo === 'sucesso') Som.tocar('sucesso');
  clearTimeout(aviso.t); aviso.t = setTimeout(() => t.classList.remove('on'), 3200);
}

/* foto do anúncio ou ilustração */
function foto(a){
  const src = a?.fotos?.[0];
  if (src) return `<img class="foto" src="${esc(src)}" alt="Foto de ${esc(a.nome)}" loading="lazy">`;
  const e = a?.especie || 'outro';
  return `<div class="foto ph ph-${e}" role="img" aria-label="Sem foto"><span>${EMOJI[e]}</span></div>`;
}

/* avatares ilustrados (escolha do usuário quando não há foto) */
const AVATARES = {
  cachorro:{ nome:'Cachorro', svg:`<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#f5b98d"/><ellipse cx="16" cy="31" rx="7" ry="13" fill="#8a5a3c" transform="rotate(16 16 31)"/><ellipse cx="48" cy="31" rx="7" ry="13" fill="#8a5a3c" transform="rotate(-16 48 31)"/><ellipse cx="32" cy="35" rx="16" ry="17" fill="#e9b07c"/><ellipse cx="32" cy="44" rx="9.5" ry="7" fill="#fbe3c8"/><circle cx="25" cy="31" r="2.7" fill="#1d2a2e"/><circle cx="39" cy="31" r="2.7" fill="#1d2a2e"/><circle cx="26" cy="30" r=".9" fill="#fff"/><circle cx="40" cy="30" r=".9" fill="#fff"/><ellipse cx="32" cy="40" rx="3.8" ry="2.7" fill="#1d2a2e"/><path d="M28.5 45q3.5 3 7 0" stroke="#1d2a2e" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M31 47.5q1 4 3.5 2.2" fill="#ef6f53"/></svg>` },
  gato:{ nome:'Gato', svg:`<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#a7d3cf"/><path d="M15 28 18 10l11 10z" fill="#7c818f"/><path d="M49 28 46 10 35 20z" fill="#7c818f"/><path d="M19 15l1.6 8 4.4-3.4z" fill="#f4b6b0"/><path d="M45 15l-1.6 8-4.4-3.4z" fill="#f4b6b0"/><ellipse cx="32" cy="36" rx="18" ry="15.5" fill="#949aa8"/><path d="M27 22q5 3 10 0" stroke="#7c818f" stroke-width="2" fill="none"/><ellipse cx="25" cy="34" rx="3" ry="3.8" fill="#e8f08a"/><ellipse cx="39" cy="34" rx="3" ry="3.8" fill="#e8f08a"/><ellipse cx="25" cy="34" rx="1.1" ry="3" fill="#1d2a2e"/><ellipse cx="39" cy="34" rx="1.1" ry="3" fill="#1d2a2e"/><path d="M30 40h4l-2 2.4z" fill="#ef8f8f"/><path d="M32 42.4v1.6m0 0q-2 2-4 .6m4-.6q2 2 4 .6" stroke="#1d2a2e" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M14 38l9 .5M14 42l9-1M50 38l-9 .5M50 42l-9-1" stroke="#fff" stroke-width=".9" opacity=".8"/></svg>` },
  papagaio:{ nome:'Papagaio', svg:`<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#ffd27a"/><path d="M26 14q2-7 7-6-1 4 1 6 3-5 7-3-2 3-1 6" fill="#e4573d"/><circle cx="30" cy="34" r="17" fill="#3fae5a"/><path d="M14 40q4 14 18 12 10-1 13-8" fill="#2e8b4a"/><ellipse cx="34" cy="29" rx="7" ry="6" fill="#fff"/><circle cx="35" cy="29" r="3" fill="#1d2a2e"/><circle cx="36" cy="28" r="1" fill="#fff"/><path d="M41 33q12-1 10 11-4-5-10-4z" fill="#ef6f53"/><path d="M41 37q5 0 7 3" stroke="#b2432a" stroke-width="1.2" fill="none"/><ellipse cx="24" cy="38" rx="3" ry="2" fill="#ffd27a" opacity=".6"/></svg>` },
  tartaruga:{ nome:'Tartaruga', svg:`<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#bfe3e1"/><path d="M6 60q4-24 26-24t26 24z" fill="#3d8b5a"/><path d="M20 46l6-6h12l6 6-4 8H24z" fill="#5aa874" stroke="#2f6f47" stroke-width="1.2"/><circle cx="32" cy="27" r="13" fill="#8cc084"/><circle cx="27" cy="25" r="2.5" fill="#1d2a2e"/><circle cx="37" cy="25" r="2.5" fill="#1d2a2e"/><circle cx="27.8" cy="24.2" r=".8" fill="#fff"/><circle cx="37.8" cy="24.2" r=".8" fill="#fff"/><path d="M28 31q4 3.5 8 0" stroke="#1d2a2e" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="23.5" cy="30" r="2" fill="#f4a6a0" opacity=".7"/><circle cx="40.5" cy="30" r="2" fill="#f4a6a0" opacity=".7"/></svg>` },
  caranguejo:{ nome:'Caranguejo', svg:`<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#fde3dc"/><path d="M18 46l-8 6M18 42l-9 2M46 46l8 6M46 42l9 2" stroke="#c9432c" stroke-width="2.4" stroke-linecap="round"/><path d="M24 34l-6-10M40 34l6-10" stroke="#c9432c" stroke-width="2.4"/><path d="M11 22a7 7 0 1 1 9-6l-4 1 3 3a7 7 0 0 1-8 2z" fill="#e4573d"/><path d="M53 22a7 7 0 1 0-9-6l4 1-3 3a7 7 0 0 0 8 2z" fill="#e4573d"/><ellipse cx="32" cy="40" rx="17" ry="12" fill="#e4573d"/><path d="M27 30v-6M37 30v-6" stroke="#c9432c" stroke-width="2"/><circle cx="27" cy="23" r="4" fill="#fff"/><circle cx="37" cy="23" r="4" fill="#fff"/><circle cx="27.5" cy="23.5" r="2" fill="#1d2a2e"/><circle cx="37.5" cy="23.5" r="2" fill="#1d2a2e"/><path d="M27 42q5 4 10 0" stroke="#7a1f12" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>` },
  peixe:{ nome:'Peixe', svg:`<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#d8ecec"/><path d="M44 32l14-10v20z" fill="#e2852c"/><ellipse cx="30" cy="32" rx="18" ry="12.5" fill="#f29d38"/><path d="M26 20q6-6 12 1" fill="#e2852c"/><path d="M30 26v12M36 25v14" stroke="#fff" stroke-width="2.6" opacity=".85"/><circle cx="20" cy="29" r="3.4" fill="#fff"/><circle cx="19.6" cy="29.4" r="1.8" fill="#1d2a2e"/><path d="M13 35q3 2 5 0" stroke="#1d2a2e" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="12" cy="18" r="2.2" fill="none" stroke="#127a86" stroke-width="1.2"/><circle cx="8" cy="11" r="1.5" fill="none" stroke="#127a86" stroke-width="1.1"/></svg>` }
};
function avatarHTML(p, tam = 40){
  const estilo = `width:${tam}px;height:${tam}px`;
  if (p?.avatar_url) return `<img class="av" src="${esc(p.avatar_url)}" style="${estilo}" alt="Foto de ${esc(p.nome || 'perfil')}">`;
  const k = AVATARES[p?.avatar_preset] ? p.avatar_preset : 'cachorro';
  return `<span class="av" style="${estilo}" role="img" aria-label="Avatar ${AVATARES[k].nome}">${AVATARES[k].svg}</span>`;
}

/* número do microchip: 981 020 000123456 */
const formatarChip = n => String(n || '').replace(/\D/g, '').slice(0, 15)
  .replace(/^(\d{3})(\d{1,3})?(\d{1,9})?$/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' '));

/* traduz erros comuns do Supabase */
function traduzErro(msg = ''){
  const m = String(msg);
  const mapa = [
    [/Invalid login credentials/i, 'E-mail ou senha incorretos.'],
    [/Email not confirmed/i, 'Confirme seu e-mail pelo link que enviamos antes de entrar.'],
    [/User already registered/i, 'Já existe uma conta com este e-mail.'],
    [/Password should be at least/i, 'A senha precisa ter pelo menos 6 caracteres.'],
    [/New password should be different/i, 'A nova senha precisa ser diferente da atual.'],
    [/rate limit|too many/i, 'Muitas tentativas. Espere um pouco e tente de novo.'],
    [/duplicate key|unique/i, 'Este registro já existe.'],
    [/Failed to fetch|NetworkError/i, 'Sem conexão com o servidor. Verifique sua internet.'],
    [/JWT|not authenticated|session/i, 'Sua sessão expirou. Entre novamente.'],
    [/row-level security|permission denied/i, 'Você não tem permissão para fazer isso.']
  ];
  for (const [re, t] of mapa) if (re.test(m)) return t;
  return m || 'Algo deu errado. Tente novamente.';
}
