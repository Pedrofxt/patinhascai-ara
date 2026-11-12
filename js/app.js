/* =====================================================================
   Inicialização, tema, topo e rotas
   Rotas: #inicio  #animal-<id>  #anunciar  #chat  #chat-<id>  #entrar  #nova-senha
          #perfil  #perfil-aparencia  #perfil-seguranca  #perfil-anuncios  #usuario-<id>
          #microchip  #microchip-novo  #microchip-editar-<id>  #microchip-<id>
   ===================================================================== */
let api = null, usuario = null, cancelarAssinatura = null, destinoPosLogin = null;
const PRIVADAS = ['anunciar', 'chat', 'perfil', 'nova'];

/* ---------- tema e som ---------- */
async function definirTema(tema, ev){
  if (document.documentElement.dataset.tema === tema) return;
  Som.tocar('tema');
  await Efeitos.trocarTema(tema, ev);
  if (usuario){ try { usuario = await api.atualizarPerfil({ tema }); } catch {} }
}
function atualizarBotaoSom(){
  const b = $('#btn-som');
  b.textContent = Som.ligado ? '🔊' : '🔇';
  b.setAttribute('aria-label', Som.ligado ? 'Desligar sons' : 'Ligar sons');
}
$('#btn-tema').onclick = ev => definirTema(document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro', ev);
$('#btn-som').onclick = () => { Som.definir(!Som.ligado); atualizarBotaoSom(); aviso(Som.ligado ? 'Sons ligados 🔊' : 'Sons desligados 🔇'); };
atualizarBotaoSom();

function atualizarTopo(){
  const b = $('#btn-conta');
  if (usuario){
    b.className = 'conta'; b.href = '#perfil';
    b.innerHTML = `${avatarHTML(usuario, 32)}<span class="nome">${esc(primeiroNome(usuario.nome) || 'Perfil')}</span>`;
    b.setAttribute('aria-label', 'Meu perfil');
  } else {
    b.className = 'conta sem-login'; b.href = '#entrar'; b.textContent = 'Entrar'; b.removeAttribute('aria-label');
  }
}

/* ---------- rotas ---------- */
async function rotear(){
  if (cancelarAssinatura){ cancelarAssinatura(); cancelarAssinatura = null; }
  const h = location.hash.slice(1) || 'inicio';
  const raiz = h.split('-')[0];
  $$('[data-nav]').forEach(a => a.classList.toggle('ativo', a.dataset.nav === raiz || (raiz === 'animal' && a.dataset.nav === 'inicio') || (raiz === 'usuario' && a.dataset.nav === 'perfil')));
  if ((PRIVADAS.includes(raiz) || (raiz === 'microchip' && h !== 'microchip')) && !usuario){
    if (raiz !== 'nova'){ destinoPosLogin = '#' + h; aviso('Entre na sua conta para continuar'); }
    location.hash = 'entrar'; return;
  }
  scrollTo(0, 0);
  try {
    if (raiz === 'animal')          await telaAnimal(h.slice(7));
    else if (raiz === 'anunciar')   telaAnunciar();
    else if (raiz === 'chat')       await telaChat(h.slice(5) || null);
    else if (raiz === 'entrar')     usuario ? (location.hash = 'perfil') : telaEntrar();
    else if (raiz === 'nova')       telaNovaSenha();
    else if (raiz === 'perfil')     await telaPerfil(h.slice(7) || 'dados');
    else if (raiz === 'usuario')    await telaUsuario(h.slice(8));
    else if (raiz === 'microchip'){
      const sub = h.slice(10);
      if (!sub)                           await telaMicrochip();
      else if (sub === 'novo')            await telaMicrochipForm(null);
      else if (sub.startsWith('editar-')) await telaMicrochipForm(sub.slice(7));
      else                                await telaMicrochipDetalhe(sub);
    }
    else await telaInicio();
    Efeitos.revelar(app);
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="wrap estreito"><div class="painel" style="text-align:center"><div style="font-size:3rem">🦀</div>
      <h2>Ops! Algo deu errado</h2><p class="meta">${esc(e.message)}</p><a class="btn btn-coral" href="#inicio">Voltar ao início</a></div></div>`;
    Som.tocar('erro');
  }
}

/* ---------- tela quando o Supabase não está configurado ---------- */
function telaConfigurar(){
  app.innerHTML = `
    <div class="wrap config">
      <div class="painel">
        <div style="font-size:3rem">🛠️</div>
        <h2>Falta conectar o Supabase</h2>
        <p class="meta">O Patinhas Caiçara guarda tudo no Supabase. Para ligar o site:</p>
        <ol>
          <li>Crie um projeto em <a href="https://supabase.com" target="_blank" rel="noopener">supabase.com</a>.</li>
          <li>No <b>SQL Editor</b>, rode na ordem <code>supabase/01_base.sql</code>, <code>02_microchipagem.sql</code> e <code>03_perfil.sql</code>.</li>
          <li>Copie a <b>Project URL</b> e a chave <b>anon/publishable</b> para <code>js/config.js</code>.</li>
          <li>Abra o site por um endereço <code>http(s)://</code> (Vercel, Netlify ou <code>npx serve</code>).</li>
        </ol>
        ${window.supabase ? '' : '<div class="erro">A biblioteca do Supabase não carregou. Verifique a conexão com a internet.</div>'}
      </div>
    </div>`;
}

/* ---------- início ---------- */
(async () => {
  if (!(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase)){ telaConfigurar(); return; }
  api = criarApi();
  api.aoMudarAuth((evento, u) => {
    const entrou = !usuario && u;
    usuario = u; atualizarTopo();
    if (u?.tema && entrou && u.tema !== document.documentElement.dataset.tema){ document.documentElement.dataset.tema = u.tema; pref.set('tema', u.tema); }
    if (evento === 'PASSWORD_RECOVERY'){ location.hash = 'nova-senha'; return; }
    if (entrou && evento === 'SIGNED_IN' && location.hash === '#entrar'){
      location.hash = destinoPosLogin || 'inicio'; destinoPosLogin = null;
      aviso(`Olá, ${primeiroNome(u.nome)}! 🐾`, 'sucesso');
    } else if (!u && evento === 'SIGNED_OUT'){
      const r = location.hash.slice(1).split('-')[0];
      if (PRIVADAS.includes(r) || location.hash.startsWith('#microchip-')) location.hash = 'inicio'; else rotear();
    } else if (entrou && location.hash === '#microchip') rotear();
  });
  try { usuario = await api.usuario(); } catch { usuario = null; }
  atualizarTopo();
  addEventListener('hashchange', rotear);
  rotear();
})();
