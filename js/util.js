const CIDADES = ['Antonina','Guaraqueçaba','Guaratuba','Matinhos','Morretes','Paranaguá','Pontal do Paraná'];
const ROTULO = {
  cachorro:'Cachorro', gato:'Gato', outro:'Outro',
  macho:'Macho', femea:'Fêmea',
  pequeno:'Pequeno', medio:'Médio', grande:'Grande',
  disponivel:'Disponível', reservado:'Reservado', adotado:'Adotado'
};
const EMOJI = { cachorro:'🐶', gato:'🐱', outro:'🐾' };

/* ---------- utilitários ---------- */
const $ = s => document.querySelector(s);
const app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const opcoes = (lista, sel='', vazio) => (vazio ? `<option value="">${vazio}</option>` : '') +
  lista.map(v => `<option value="${esc(v)}" ${v===sel?'selected':''}>${esc(ROTULO[v]||v)}</option>`).join('');
const hora = d => new Date(d).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
const quando = d => {
  const dias = Math.floor((Date.now() - new Date(d)) / 864e5);
  return dias < 1 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias} dias`;
};
const iniciais = n => (n||'?').split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase();
const lerArquivo = f => new Promise((ok, erro) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = erro; r.readAsDataURL(f); });
function aviso(msg){ const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(aviso.t); aviso.t = setTimeout(()=>t.classList.remove('on'), 2800); }
function foto(a){
  const src = a?.fotos?.[0];
  if (src) return `<img class="foto" src="${esc(src)}" alt="Foto de ${esc(a.nome)}" loading="lazy">`;
  const e = a?.especie || 'outro';
  return `<div class="foto ph ph-${e}" role="img" aria-label="Sem foto"><span>${EMOJI[e]}</span></div>`;
}

