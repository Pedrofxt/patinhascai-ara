const api = (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase) ? criarSupabaseApi() : criarDemoApi();
if (api.modo === 'demo') $('#demo').hidden = false;

/* =====================================================================
   TELAS
   ===================================================================== */
let usuario = null, cancelarAssinatura = null, destinoPosLogin = null;
const filtros = { especie:'', cidade:'', porte:'' };

async function telaInicio(){
  app.innerHTML = `
    <section class="hero">
      <svg class="sol" viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r="62" fill="#ffd27a"/>
        <circle cx="100" cy="100" r="86" fill="none" stroke="#ffd27a" stroke-width="6" stroke-dasharray="4 18" stroke-linecap="round"/>
      </svg>
      <div class="wrap">
        <h1>Um lar na beira do mar pra quem tem quatro patas</h1>
        <p>Encontre cães, gatos e outros bichinhos esperando adoção em Paranaguá, Matinhos, Guaratuba e em todo o litoral do Paraná. Sem venda, só amor.</p>
        <div class="acoes">
          <a class="btn btn-coral" href="#vitrine" onclick="event.preventDefault();document.getElementById('vitrine').scrollIntoView({behavior:'smooth'})">Quero adotar</a>
          <a class="btn btn-claro" href="#anunciar">Tenho um animal para doar</a>
        </div>
      </div>
      <svg class="ondas" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 40c120-30 240-30 360 0s240 30 360 0 240-30 360 0 240 30 360 0v40H0z" fill="#127a86" opacity=".25"/>
        <path d="M0 55c120-22 240-22 360 0s240 22 360 0 240-22 360 0 240 22 360 0v25H0z" fill="#f6efe4"/>
      </svg>
    </section>
    <div class="wrap" id="vitrine">
      <div class="filtros">
        <select id="f-especie" aria-label="Espécie">${opcoes(['cachorro','gato','outro'], filtros.especie, 'Todas as espécies')}</select>
        <select id="f-cidade" aria-label="Cidade">${opcoes(CIDADES, filtros.cidade, 'Todo o litoral')}</select>
        <select id="f-porte" aria-label="Porte">${opcoes(['pequeno','medio','grande'], filtros.porte, 'Qualquer porte')}</select>
      </div>
      <div class="grade" id="grade"><div class="carregando vazio">Buscando patinhas…</div></div>
    </div>`;
  ['especie','cidade','porte'].forEach(k => $('#f-' + k).onchange = e => { filtros[k] = e.target.value; carregarGrade(); });
  carregarGrade();
}

async function carregarGrade(){
  const grade = $('#grade');
  try {
    const lista = await api.listarAnuncios(filtros);
    grade.innerHTML = lista.length ? lista.map(a => `
      <a class="card" href="#animal-${a.id}">
        ${foto(a)}
        <div class="corpo">
          <h3>${esc(a.nome)}</h3>
          <div class="meta">${ROTULO[a.especie]} · ${esc(a.idade || 'idade ?')} · ${ROTULO[a.porte]}</div>
          <div class="meta">📍 ${esc(a.cidade)} · ${quando(a.created_at)}</div>
          <div class="chips">
            ${a.vacinado ? '<span class="chip">Vacinado</span>' : ''}
            ${a.castrado ? '<span class="chip">Castrado</span>' : ''}
            ${a.microchipado ? '<span class="chip">🔖 Microchipado</span>' : ''}
            <span class="chip coral">${ROTULO[a.sexo]}</span>
          </div>
        </div>
      </a>`).join('')
      : `<div class="vazio">Nenhum animal com esses filtros por enquanto. 🌊<br>Tente outra cidade ou espécie.</div>`;
  } catch (e) { grade.innerHTML = `<div class="vazio erro">${esc(e.message)}</div>`; }
}

async function telaAnimal(id){
  const a = await api.obterAnuncio(id);
  const meu = usuario && usuario.id === a.doador_id;
  app.innerHTML = `
    <div class="wrap">
      <a class="voltar" href="#inicio">← Voltar para a vitrine</a>
      <div class="detalhe">
        <div class="galeria">
          <div id="foto-grande">${foto(a)}</div>
          ${a.fotos?.length > 1 ? `<div class="miniaturas">${a.fotos.map((f, i) => `<img src="${esc(f)}" data-i="${i}" class="${i ? '' : 'sel'}" alt="Foto ${i + 1}">`).join('')}</div>` : ''}
        </div>
        <div>
          <h1>${esc(a.nome)} ${EMOJI[a.especie]}</h1>
          <div class="meta">📍 ${esc(a.cidade)} · anunciado ${quando(a.created_at)}${a.status !== 'disponivel' ? ` · <b>${ROTULO[a.status]}</b>` : ''}</div>
          <div class="ficha">
            <div><span>Espécie</span>${ROTULO[a.especie]}</div>
            <div><span>Sexo</span>${ROTULO[a.sexo]}</div>
            <div><span>Idade</span>${esc(a.idade || 'Não informada')}</div>
            <div><span>Porte</span>${ROTULO[a.porte]}</div>
            <div><span>Vacinado</span>${a.vacinado ? 'Sim ✓' : 'Não'}</div>
            <div><span>Castrado</span>${a.castrado ? 'Sim ✓' : 'Não'}</div>
            <div><span>Microchip</span>${a.microchipado ? 'Sim ✓' : 'Não'}</div>
          </div>
          <p>${esc(a.descricao || 'Sem descrição.')}</p>
          <div class="doador">
            <div class="avatar">${iniciais(a.doador?.nome)}</div>
            <div><b>${esc(a.doador?.nome || 'Doador')}</b><div class="meta">Doador · ${esc(a.doador?.cidade || a.cidade)}</div></div>
          </div>
          ${meu
            ? `<a class="btn btn-mar" href="#perfil">Este anúncio é seu — gerenciar</a>
               ${a.microchipado ? '' : '<a class="btn btn-claro" href="#microchip-novo">🔖 Cadastrar microchip</a>'}`
            : `<button class="btn btn-coral" id="btn-conversar">💬 Conversar com o doador</button>`}
        </div>
      </div>
    </div>`;
  document.querySelectorAll('.miniaturas img').forEach(img => img.onclick = () => {
    document.querySelectorAll('.miniaturas img').forEach(i => i.classList.remove('sel'));
    img.classList.add('sel');
    $('#foto-grande').innerHTML = foto({ ...a, fotos:[a.fotos[img.dataset.i]] });
  });
  const b = $('#btn-conversar');
  if (b) b.onclick = async () => {
    if (!usuario){ destinoPosLogin = location.hash; location.hash = 'entrar'; aviso('Entre para conversar com o doador'); return; }
    b.disabled = true;
    try { location.hash = 'chat-' + await api.abrirConversa(a); }
    catch (e) { aviso(e.message); b.disabled = false; }
  };
}

function telaAnunciar(){
  app.innerHTML = `
    <div class="wrap medio">
      <div class="painel">
        <h2>Anunciar um animal para doação</h2>
        <p class="meta" style="margin-top:0">A doação é gratuita. Conte bem sobre o bichinho para achar o lar certo.</p>
        <div id="erro-form"></div>
        <form id="form-anuncio" class="form-grid">
          <div><label for="nome">Nome do animal</label><input type="text" id="nome" name="nome" required maxlength="40" placeholder="Ex.: Caramelo"></div>
          <div><label for="especie">Espécie</label><select id="especie" name="especie">${opcoes(['cachorro','gato','outro'])}</select></div>
          <div><label for="sexo">Sexo</label><select id="sexo" name="sexo">${opcoes(['macho','femea'])}</select></div>
          <div><label for="idade">Idade aproximada</label><input type="text" id="idade" name="idade" maxlength="20" placeholder="Ex.: 4 meses"></div>
          <div><label for="porte">Porte</label><select id="porte" name="porte">${opcoes(['pequeno','medio','grande'])}</select></div>
          <div><label for="cidade">Cidade</label><select id="cidade" name="cidade">${opcoes(CIDADES, usuario?.cidade || 'Paranaguá')}</select></div>
          <label class="check"><input type="checkbox" name="vacinado"> Vacinado</label>
          <label class="check"><input type="checkbox" name="castrado"> Castrado</label>
          <div class="full"><label for="descricao">Sobre o animal</label><textarea id="descricao" name="descricao" rows="4" maxlength="1000" placeholder="Temperamento, saúde, onde foi encontrado, se convive com outros animais…"></textarea></div>
          <div class="full"><label for="fotos">Fotos (até 5)</label><input type="file" id="fotos" accept="image/*" multiple><div class="previas" id="previas"></div></div>
          <div class="full"><button class="btn btn-coral" type="submit">Publicar anúncio</button></div>
        </form>
      </div>
    </div>`;
  const inp = $('#fotos');
  inp.onchange = async () => {
    const urls = await Promise.all([...inp.files].slice(0, 5).map(lerArquivo));
    $('#previas').innerHTML = urls.map(u => `<img src="${u}" alt="">`).join('');
  };
  $('#form-anuncio').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target), btn = e.target.querySelector('button');
    const dados = {
      nome: fd.get('nome').trim(), especie: fd.get('especie'), sexo: fd.get('sexo'), idade: fd.get('idade').trim(),
      porte: fd.get('porte'), cidade: fd.get('cidade'), descricao: fd.get('descricao').trim(),
      vacinado: !!fd.get('vacinado'), castrado: !!fd.get('castrado')
    };
    btn.disabled = true; btn.textContent = 'Publicando…';
    try { const a = await api.criarAnuncio(dados, inp.files); aviso('Anúncio publicado! 🐾'); location.hash = 'animal-' + a.id; }
    catch (err) { $('#erro-form').innerHTML = `<div class="erro">${esc(err.message)}</div>`; btn.disabled = false; btn.textContent = 'Publicar anúncio'; }
  };
}

async function telaChat(id){
  const conversas = await api.listarConversas();
  const atual = conversas.find(c => c.id === id);
  const outro = c => c.doador_id === usuario.id ? c.interessado : c.doador;
  app.innerHTML = `
    <div class="wrap">
      <div class="chat ${atual ? 'com-conversa' : ''}">
        <aside class="lista">
          <h2>Conversas</h2>
          ${conversas.length ? conversas.map(c => `
            <a class="conv ${c.id === id ? 'sel' : ''}" href="#chat-${c.id}">
              <div class="mini">${foto(c.anuncio)}</div>
              <div style="min-width:0"><b>${esc(outro(c)?.nome || 'Usuário')}</b>
                <small>${esc(c.anuncio?.nome || '')} · ${esc(c.ultima?.texto || 'Nenhuma mensagem ainda')}</small></div>
            </a>`).join('')
          : `<p class="meta" style="padding:0 18px">Você ainda não tem conversas. Encontre um animal na <a href="#inicio">vitrine</a> e fale com o doador.</p>`}
        </aside>
        <section class="thread">
          ${atual ? `
            <div class="thread-topo">
              <a class="vol" href="#chat" aria-label="Voltar">←</a>
              <div class="avatar">${iniciais(outro(atual)?.nome)}</div>
              <div><b>${esc(outro(atual)?.nome || 'Usuário')}</b>
                <div class="meta">sobre <a href="#animal-${atual.anuncio_id}">${esc(atual.anuncio?.nome || 'o anúncio')}</a> ·
                ${atual.doador_id === usuario.id ? 'interessado em adotar' : 'doador'}</div></div>
              ${atual.doador_id === usuario.id && atual.anuncio?.status !== 'adotado'
                ? `<div class="concluir" id="concluir"><button class="btn btn-coral btn-p" id="btn-concluir">🎉 Concluir adoção</button></div>`
                : atual.anuncio?.status === 'adotado' ? '<span class="chip" style="margin-left:auto">Adotado 🧡</span>' : ''}
            </div>
            <div id="msgs" aria-live="polite"></div>
            <form class="enviar" id="form-msg">
              <input type="text" id="texto" placeholder="Escreva uma mensagem…" autocomplete="off" maxlength="2000" required>
              <button class="btn btn-mar" type="submit">Enviar</button>
            </form>`
          : `<div class="thread-vazia"><div><div style="font-size:3rem">💬</div>Escolha uma conversa ao lado.</div></div>`}
        </section>
      </div>
    </div>`;
  if (!atual) return;

  const caixa = $('#msgs'), vistas = new Set();
  const adicionar = m => {
    if (vistas.has(m.id)) return; vistas.add(m.id);
    caixa.insertAdjacentHTML('beforeend',
      `<div class="bolha ${m.autor_id === usuario.id ? 'minha' : ''}">${esc(m.texto)}<time>${hora(m.created_at)}</time></div>`);
    caixa.scrollTop = caixa.scrollHeight;
    const prev = document.querySelector('.conv.sel small');
    if (prev) prev.textContent = (atual.anuncio?.nome || '') + ' · ' + m.texto;
  };
  cancelarAssinatura = api.assinarMensagens(id, adicionar);   // tempo real primeiro…
  (await api.listarMensagens(id)).forEach(adicionar);          // …depois o histórico (duplicadas são ignoradas)
  if (!vistas.size) caixa.innerHTML = `<p class="meta" style="text-align:center;margin:auto">Diga oi! Pergunte sobre o temperamento, a saúde e como combinar uma visita.</p>`;

  const bc = $('#btn-concluir');
  if (bc) bc.onclick = () => {
    $('#concluir').innerHTML = `<span class="meta">Marcar ${esc(atual.anuncio?.nome)} como adotado${atual.anuncio?.microchipado ? ' e transferir o microchip para ' + esc(outro(atual)?.nome) : ''}?</span>
      <button class="btn btn-coral btn-p" id="sim">Confirmar</button><button class="btn btn-claro btn-p" id="nao">Cancelar</button>`;
    $('#nao').onclick = () => rotear();
    $('#sim').onclick = async () => {
      try { const n = await api.concluirAdocao(id); aviso(n ? 'Adoção concluída e microchip transferido 🧡' : 'Adoção concluída 🧡'); rotear(); }
      catch (err) { aviso(err.message); }
    };
  };

  $('#form-msg').onsubmit = async e => {
    e.preventDefault();
    const campo = $('#texto'), texto = campo.value.trim(); if (!texto) return;
    if (!vistas.size) caixa.innerHTML = '';
    campo.value = '';
    try { await api.enviarMensagem(id, texto); } catch (err) { aviso(err.message); campo.value = texto; }
    campo.focus();
  };
}

function telaEntrar(){
  let modo = 'entrar';
  const desenhar = () => {
    app.innerHTML = `
      <div class="wrap estreito">
        <div class="painel">
          <div class="abas">
            <button data-m="entrar" class="${modo === 'entrar' ? 'ativo' : ''}">Entrar</button>
            <button data-m="cadastrar" class="${modo === 'cadastrar' ? 'ativo' : ''}">Criar conta</button>
          </div>
          <h2>${modo === 'entrar' ? 'Bem-vindo de volta 🐾' : 'Faça parte da maré do bem'}</h2>
          <div id="erro-auth"></div>
          <form id="form-auth" style="display:grid;gap:12px">
            ${modo === 'cadastrar' ? `
              <div><label for="a-nome">Seu nome</label><input type="text" id="a-nome" name="nome" required maxlength="60"></div>
              <div><label for="a-cidade">Cidade</label><select id="a-cidade" name="cidade">${opcoes(CIDADES, 'Paranaguá')}</select></div>` : ''}
            <div><label for="a-email">E-mail</label><input type="email" id="a-email" name="email" required autocomplete="email"></div>
            <div><label for="a-senha">Senha</label><input type="password" id="a-senha" name="senha" required minlength="6"
              autocomplete="${modo === 'entrar' ? 'current-password' : 'new-password'}"></div>
            <button class="btn btn-coral" type="submit">${modo === 'entrar' ? 'Entrar' : 'Criar conta'}</button>
          </form>
        </div>
      </div>`;
    document.querySelectorAll('.abas button').forEach(b => b.onclick = () => { modo = b.dataset.m; desenhar(); });
    $('#form-auth').onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(e.target), btn = e.target.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        if (modo === 'entrar') await api.entrar(fd.get('email').trim(), fd.get('senha'));
        else {
          const r = await api.cadastrar({ email: fd.get('email').trim(), senha: fd.get('senha'), nome: fd.get('nome').trim(), cidade: fd.get('cidade') });
          if (r?.confirmarEmail){ $('#erro-auth').innerHTML = `<div class="erro" style="background:var(--mar-3);color:var(--mar)">Conta criada! Confirme pelo link enviado ao seu e-mail e depois entre.</div>`; btn.disabled = false; return; }
        }
        // o redirecionamento acontece em aoMudarAuth
      } catch (err) { $('#erro-auth').innerHTML = `<div class="erro">${esc(err.message)}</div>`; btn.disabled = false; }
    };
  };
  desenhar();
}

async function telaPerfil(){
  const meus = await api.meusAnuncios();
  app.innerHTML = `
    <div class="wrap medio">
      <div class="painel">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
          <div class="avatar" style="width:56px;height:56px;font-size:1.2rem">${iniciais(usuario.nome)}</div>
          <div><h2 style="margin:0">${esc(usuario.nome || 'Meu perfil')}</h2><div class="meta">${esc(usuario.email)} · ${esc(usuario.cidade || '')}</div></div>
          <button class="btn btn-claro" id="btn-sair" style="margin-left:auto">Sair</button>
        </div>
        <a class="btn btn-claro" href="#microchip" style="margin-bottom:18px">🔖 Meus animais microchipados</a>
        <h3>Meus anúncios</h3>
        ${meus.length ? meus.map(a => `
          <div class="linha-anuncio">
            <div class="mini">${foto(a)}</div>
            <div><a href="#animal-${a.id}"><b>${esc(a.nome)}</b></a><div class="meta">${esc(a.cidade)} · ${quando(a.created_at)}</div></div>
            <select data-id="${a.id}" aria-label="Situação de ${esc(a.nome)}">${opcoes(['disponivel','reservado','adotado'], a.status)}</select>
          </div>`).join('')
        : `<p class="meta">Nenhum anúncio ainda. <a href="#anunciar">Anunciar um animal</a></p>`}
      </div>
    </div>`;
  $('#btn-sair').onclick = async () => { await api.sair(); location.hash = 'inicio'; };
  document.querySelectorAll('.linha-anuncio select').forEach(sel => sel.onchange = async () => {
    try { await api.mudarStatus(sel.dataset.id, sel.value); aviso(sel.value === 'adotado' ? 'Que alegria! Mais uma patinha com lar 🧡' : 'Situação atualizada'); }
    catch (e) { aviso(e.message); }
  });
}

/* =====================================================================
   MICROCHIPAGEM
   ===================================================================== */
const SITUACAO = { ativo:['Ativo','chip'], perdido:['Perdido','chip alerta'], falecido:['Falecido','chip cinza'] };
const EVENTO = {
  cadastro:['📝','Microchip cadastrado'], atualizacao:['✏️','Dados atualizados'], transferencia:['🤝','Transferido para novo tutor'],
  perdido:['🚨','Marcado como perdido'], reencontrado:['🏠','Reencontrado'], falecido:['🕊️','Marcado como falecido'], avistado:['👀','Alguém avistou o animal']
};
const dataBR = d => d ? new Date(d.length === 10 ? d + 'T12:00' : d).toLocaleDateString('pt-BR') : '—';
const formatarChip = n => String(n || '').replace(/\D/g, '').slice(0, 15).replace(/^(\d{3})(\d{1,3})?(\d{1,9})?$/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' '));
const situacao = st => `<span class="${SITUACAO[st][1]}">${SITUACAO[st][0]}</span>`;

async function telaMicrochip(){
  app.innerHTML = `
    <div class="wrap medio">
      <div class="painel">
        <h2>🔖 Consultar microchip</h2>
        <p class="meta" style="margin-top:0">Achou um animal? Leve a um veterinário, abrigo ou pet shop com leitor e digite aqui os 15 dígitos do microchip.</p>
        <form id="form-consulta" class="consulta">
          <input type="text" id="numero" inputmode="numeric" placeholder="Ex.: 981 020 000123456" maxlength="17" autocomplete="off" aria-label="Número do microchip">
          <button class="btn btn-mar" type="submit">Consultar</button>
        </form>
        ${api.modo === 'demo' ? '<p class="meta">Na demonstração, experimente <a href="#" id="exemplo">981 020 000123456</a> (animal perdido).</p>' : ''}
        <div id="resultado"></div>
      </div>
      <div class="painel" style="margin-top:24px">
        ${usuario ? `
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px">
            <h2 style="margin:0">Meus animais microchipados</h2>
            <a class="btn btn-coral btn-p" href="#microchip-novo" style="margin-left:auto">+ Cadastrar microchip</a>
          </div>
          <div id="meus-chips"><div class="carregando">Carregando…</div></div>`
        : `<h2>Cadastre o microchip do seu animal</h2>
           <p class="meta">Com o cadastro, quem encontrar seu bichinho consegue te avisar pelo site, e o microchip passa para o adotante quando a adoção é concluída.</p>
           <a class="btn btn-coral" href="#entrar">Entrar para cadastrar</a>`}
      </div>
    </div>`;

  const inp = $('#numero');
  inp.oninput = () => { inp.value = formatarChip(inp.value); };
  $('#exemplo')?.addEventListener('click', e => { e.preventDefault(); inp.value = formatarChip('981020000123456'); $('#form-consulta').requestSubmit(); });
  $('#form-consulta').onsubmit = async e => {
    e.preventDefault();
    const numero = inp.value.replace(/\D/g, ''), box = $('#resultado');
    if (numero.length !== 15){ box.innerHTML = '<div class="erro" style="margin-top:14px">O número do microchip tem 15 dígitos.</div>'; return; }
    box.innerHTML = '<div class="carregando">Consultando…</div>';
    try {
      const m = await api.consultarMicrochip(numero);
      if (!m){ box.innerHTML = `<div class="resultado"><b>Nenhum animal com esse microchip no Patinhas Caiçara.</b><p class="meta">O chip pode estar registrado em outra base. Peça ajuda à clínica que fez a leitura.</p></div>`; return; }
      box.innerHTML = `
        <div class="resultado ${m.situacao === 'perdido' ? 'perdido' : ''}">
          ${m.situacao === 'perdido' ? '<div class="faixa-perdido">🚨 Este animal está marcado como PERDIDO. O tutor procura por ele!</div>' : ''}
          <div style="display:flex;gap:14px;align-items:center">
            <div class="avatar" style="width:56px;height:56px;font-size:1.6rem;background:var(--areia-2)">${EMOJI[m.especie]}</div>
            <div><h3 style="margin:0">${esc(m.nome_animal)}</h3>
              <div class="meta">${ROTULO[m.especie]}${m.sexo ? ' · ' + ROTULO[m.sexo] : ''} · ${esc(m.cidade || 'litoral do PR')} · ${situacao(m.situacao)}</div></div>
          </div>
          ${m.pelagem ? `<p><b>Pelagem:</b> ${esc(m.pelagem)}</p>` : ''}
          <p class="meta">Tutor: ${esc(m.tutor_nome || '—')} · Implantado em ${dataBR(m.data_implante)}
            ${m.anuncio_id ? ` · <a href="#animal-${m.anuncio_id}">em doação no site</a>` : ''}</p>
          ${m.id ? `<a class="btn btn-mar" href="#microchip-${m.id}">Este animal é seu — abrir cadastro</a>`
          : m.situacao === 'falecido' ? '' : `
            <form id="form-aviso" style="display:grid;gap:10px;margin-top:10px">
              <label for="aviso" style="margin:0">Avise o tutor</label>
              <textarea id="aviso" rows="3" maxlength="1000" placeholder="Onde e quando você viu o animal? Deixe um telefone ou e-mail para contato." required></textarea>
              <button class="btn btn-coral" type="submit">${usuario ? 'Enviar aviso ao tutor' : 'Entrar para avisar o tutor'}</button>
            </form>`}
        </div>`;
      const fa = $('#form-aviso');
      if (fa) fa.onsubmit = async ev => {
        ev.preventDefault();
        if (!usuario){ destinoPosLogin = '#microchip'; location.hash = 'entrar'; return; }
        try { await api.avisarTutor(numero, $('#aviso').value); fa.outerHTML = '<p class="sucesso">✓ Aviso enviado! O tutor vai ver no histórico do microchip. Obrigado por ajudar 🧡</p>'; }
        catch (err) { aviso(err.message); }
      };
    } catch (err) { box.innerHTML = `<div class="erro">${esc(err.message)}</div>`; }
  };

  if (!usuario) return;
  const lista = await api.meusMicrochips();
  $('#meus-chips').innerHTML = lista.length ? lista.map(m => `
    <a class="linha-anuncio linha-link" href="#microchip-${m.id}">
      <div class="mini"><div class="foto ph ph-${m.especie}"><span>${EMOJI[m.especie]}</span></div></div>
      <div><b>${esc(m.nome_animal)}</b><div class="meta mono">${formatarChip(m.numero)}${m.anuncio ? ' · em doação: ' + esc(m.anuncio.nome) : ''}</div></div>
      <div style="margin-left:auto">${situacao(m.situacao)}</div>
    </a>`).join('')
    : '<p class="meta">Nenhum microchip no seu nome ainda.</p>';
}

async function telaMicrochipForm(id){
  const [m, anuncios] = await Promise.all([id ? api.obterMicrochip(id) : null, api.meusAnuncios()]);
  const v = k => esc(m?.[k] ?? '');
  const disponiveis = anuncios.filter(a => a.status !== 'adotado' || a.id === m?.anuncio_id);
  app.innerHTML = `
    <div class="wrap medio">
      <a class="voltar" href="${id ? '#microchip-' + id : '#microchip'}" style="margin:0 0 14px">← Voltar</a>
      <div class="painel">
        <h2>${id ? 'Editar microchip' : 'Cadastrar microchip'}</h2>
        <div id="erro-form"></div>
        <form id="form-chip" class="form-grid">
          <div class="full"><label for="c-numero">Número do microchip (15 dígitos)</label>
            <input type="text" id="c-numero" name="numero" inputmode="numeric" class="mono" maxlength="17" required
              value="${formatarChip(m?.numero)}" ${id ? 'readonly title="O número não pode ser alterado"' : ''} placeholder="Ex.: 981 020 000123456"></div>
          <div><label for="c-nome">Nome do animal</label><input type="text" id="c-nome" name="nome_animal" required maxlength="40" value="${v('nome_animal')}"></div>
          <div><label for="c-especie">Espécie</label><select id="c-especie" name="especie">${opcoes(['cachorro','gato','outro'], m?.especie)}</select></div>
          <div><label for="c-sexo">Sexo</label><select id="c-sexo" name="sexo">${opcoes(['macho','femea'], m?.sexo)}</select></div>
          <div><label for="c-nasc">Nascimento (aprox.)</label><input type="text" id="c-nasc" name="nascimento" maxlength="20" placeholder="Ex.: 03/2023" value="${v('nascimento')}"></div>
          <div class="full"><label for="c-pelagem">Pelagem e sinais</label><input type="text" id="c-pelagem" name="pelagem" maxlength="120" placeholder="Cor, manchas, cicatrizes, coleira…" value="${v('pelagem')}"></div>
          <div><label for="c-cidade">Cidade</label><select id="c-cidade" name="cidade">${opcoes(CIDADES, m?.cidade || usuario.cidade || 'Paranaguá')}</select></div>
          <div><label for="c-data">Data do implante</label><input type="date" id="c-data" name="data_implante" value="${v('data_implante')}"></div>
          <div class="full"><label for="c-local">Local do implante</label><input type="text" id="c-local" name="local_implante" maxlength="80" placeholder="Clínica, mutirão, ONG…" value="${v('local_implante')}"></div>
          <div><label for="c-vet">Veterinário(a)</label><input type="text" id="c-vet" name="veterinario" maxlength="60" value="${v('veterinario')}"></div>
          <div><label for="c-crmv">CRMV</label><input type="text" id="c-crmv" name="crmv" maxlength="20" placeholder="PR-00000" value="${v('crmv')}"></div>
          <div class="full"><label for="c-anuncio">Vincular a um anúncio de doação (opcional)</label>
            <select id="c-anuncio" name="anuncio_id"><option value="">Nenhum</option>${disponiveis.map(a => `<option value="${a.id}" ${a.id === m?.anuncio_id ? 'selected' : ''}>${esc(a.nome)} · ${ROTULO[a.status]}</option>`).join('')}</select>
            <p class="meta" style="margin:6px 0 0">Com o vínculo, o anúncio ganha o selo "Microchipado" e o chip passa para o adotante quando você concluir a adoção no chat.</p></div>
          <div class="full"><label for="c-obs">Observações</label><textarea id="c-obs" name="observacoes" rows="3" maxlength="1000">${v('observacoes')}</textarea></div>
          <div class="full" style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn-coral" type="submit">${id ? 'Salvar alterações' : 'Cadastrar microchip'}</button>
            ${id ? '<button class="btn btn-claro" type="button" id="btn-excluir">Excluir cadastro</button>' : ''}
          </div>
        </form>
      </div>
    </div>`;
  const num = $('#c-numero');
  if (!id) num.oninput = () => { num.value = formatarChip(num.value); };
  $('#form-chip').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target), btn = e.target.querySelector('button[type=submit]');
    const dados = {};
    ['nome_animal','especie','sexo','nascimento','pelagem','cidade','data_implante','local_implante','veterinario','crmv','anuncio_id','observacoes']
      .forEach(k => { const val = String(fd.get(k) ?? '').trim(); dados[k] = val || null; });
    if (!id){
      dados.numero = num.value.replace(/\D/g, '');
      if (dados.numero.length !== 15){ $('#erro-form').innerHTML = '<div class="erro">O número do microchip deve ter 15 dígitos.</div>'; return; }
    }
    btn.disabled = true;
    try { const r = await api.salvarMicrochip(dados, id); aviso(id ? 'Cadastro atualizado' : 'Microchip cadastrado 🔖'); location.hash = 'microchip-' + r.id; }
    catch (err) {
      const msg = /duplicate|unique/i.test(err.message) ? 'Este microchip já está cadastrado.' : err.message;
      $('#erro-form').innerHTML = `<div class="erro">${esc(msg)}</div>`; btn.disabled = false;
    }
  };
  const bx = $('#btn-excluir');
  if (bx) bx.onclick = async () => {
    if (bx.dataset.ok !== '1'){ bx.dataset.ok = '1'; bx.textContent = 'Clique de novo para confirmar'; return; }
    try { await api.excluirMicrochip(id); aviso('Cadastro excluído'); location.hash = 'microchip'; } catch (err) { aviso(err.message); }
  };
}

async function telaMicrochipDetalhe(id){
  const m = await api.obterMicrochip(id);
  const acoes = {
    ativo:   [['perdido','🚨 Marcar como perdido','btn-coral'], ['falecido','🕊️ Marcar como falecido','btn-claro']],
    perdido: [['ativo','🏠 Foi reencontrado!','btn-mar'], ['falecido','🕊️ Marcar como falecido','btn-claro']],
    falecido:[['ativo','Reativar cadastro','btn-claro']]
  }[m.situacao];
  app.innerHTML = `
    <div class="wrap medio">
      <a class="voltar" href="#microchip" style="margin:0 0 14px">← Meus microchips</a>
      <div class="painel">
        ${m.situacao === 'perdido' ? '<div class="faixa-perdido">🚨 Marcado como perdido. Quem consultar este microchip verá o alerta e poderá te avisar.</div>' : ''}
        <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
          <div class="avatar" style="width:64px;height:64px;font-size:2rem;background:var(--areia-2)">${EMOJI[m.especie]}</div>
          <div><h2 style="margin:0">${esc(m.nome_animal)}</h2>
            <div class="meta mono" style="font-size:1rem">${formatarChip(m.numero)}</div></div>
          <div style="margin-left:auto">${situacao(m.situacao)}</div>
        </div>
        <div class="ficha">
          <div><span>Espécie</span>${ROTULO[m.especie]}</div>
          <div><span>Sexo</span>${ROTULO[m.sexo] || '—'}</div>
          <div><span>Nascimento</span>${esc(m.nascimento || '—')}</div>
          <div><span>Cidade</span>${esc(m.cidade || '—')}</div>
          <div><span>Implante</span>${dataBR(m.data_implante)}</div>
          <div><span>Local</span>${esc(m.local_implante || '—')}</div>
          <div><span>Veterinário(a)</span>${esc(m.veterinario || '—')}</div>
          <div><span>CRMV</span>${esc(m.crmv || '—')}</div>
        </div>
        ${m.pelagem ? `<p><b>Pelagem e sinais:</b> ${esc(m.pelagem)}</p>` : ''}
        ${m.observacoes ? `<p><b>Observações:</b> ${esc(m.observacoes)}</p>` : ''}
        ${m.anuncio ? `<p>Vinculado ao anúncio <a href="#animal-${m.anuncio.id}">${esc(m.anuncio.nome)}</a>.</p>` : ''}
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${acoes.map(([st, txt, cls]) => `<button class="btn ${cls}" data-st="${st}">${txt}</button>`).join('')}
          <a class="btn btn-claro" href="#microchip-editar-${m.id}">✏️ Editar</a>
        </div>
      </div>
      <div class="painel" style="margin-top:24px">
        <h3>Histórico</h3>
        <ol class="timeline">
          ${m.eventos.map(e => `
            <li class="${e.tipo === 'avistado' ? 'destaque' : ''}">
              <span class="ic">${EVENTO[e.tipo][0]}</span>
              <div><b>${EVENTO[e.tipo][1]}</b> <span class="meta">· ${dataBR(e.created_at)} ${hora(e.created_at)}${e.autor?.nome ? ' · por ' + esc(e.autor.nome) : ''}</span>
                ${e.mensagem ? `<div class="recado">${esc(e.mensagem)}</div>` : ''}</div>
            </li>`).join('') || '<li class="meta">Sem eventos.</li>'}
        </ol>
      </div>
    </div>`;
  document.querySelectorAll('[data-st]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    try { await api.mudarSituacaoMicrochip(id, b.dataset.st); aviso(b.dataset.st === 'ativo' ? 'Que alívio! 🏠' : 'Situação atualizada'); rotear(); }
    catch (err) { aviso(err.message); b.disabled = false; }
  });
}

/* =====================================================================
   ROTEAMENTO (#inicio, #animal-<id>, #anunciar, #chat, #chat-<id>, #entrar, #perfil,
               #microchip, #microchip-novo, #microchip-editar-<id>, #microchip-<id>)
   ===================================================================== */
const PRIVADAS = ['anunciar', 'chat', 'perfil'];
async function rotear(){
  if (cancelarAssinatura){ cancelarAssinatura(); cancelarAssinatura = null; }
  const h = location.hash.slice(1) || 'inicio';
  const raiz = h.split('-')[0];
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('ativo', a.dataset.nav === raiz || (raiz === 'animal' && a.dataset.nav === 'inicio')));
  if ((PRIVADAS.includes(raiz) || (raiz === 'microchip' && h !== 'microchip')) && !usuario){ destinoPosLogin = '#' + h; location.hash = 'entrar'; return; }
  window.scrollTo(0, 0);
  try {
    if (raiz === 'animal')        await telaAnimal(h.slice(7));
    else if (raiz === 'anunciar') telaAnunciar();
    else if (raiz === 'chat')     await telaChat(h.slice(5) || null);
    else if (raiz === 'entrar')   usuario ? (location.hash = 'perfil') : telaEntrar();
    else if (raiz === 'perfil')   await telaPerfil();
    else if (raiz === 'microchip'){
      const sub = h.slice(10);
      if (!sub)                           await telaMicrochip();
      else if (sub === 'novo')            await telaMicrochipForm(null);
      else if (sub.startsWith('editar-')) await telaMicrochipForm(sub.slice(7));
      else                                await telaMicrochipDetalhe(sub);
    }
    else                          await telaInicio();
  } catch (e) {
    app.innerHTML = `<div class="wrap estreito"><div class="erro">${esc(e.message)}</div><a href="#inicio">← Voltar ao início</a></div>`;
  }
}

function atualizarTopo(){
  const b = $('#btn-conta');
  if (usuario){ b.textContent = '👤 ' + (usuario.nome?.split(' ')[0] || 'Perfil'); b.href = '#perfil'; }
  else { b.textContent = 'Entrar'; b.href = '#entrar'; }
}

api.aoMudarAuth(u => {
  const entrou = !usuario && u;
  usuario = u; atualizarTopo();
  if (entrou && location.hash === '#entrar'){ location.hash = destinoPosLogin || 'inicio'; destinoPosLogin = null; aviso('Olá, ' + (u.nome || '') + '! 🐾'); }
  else if (!u && (PRIVADAS.includes(location.hash.slice(1).split('-')[0]) || location.hash.startsWith('#microchip-'))) location.hash = 'inicio';
  else if (location.hash === '#microchip') rotear();   // atualiza a lista de microchips ao entrar/sair
});

window.addEventListener('hashchange', rotear);
(async () => { usuario = await api.usuario(); atualizarTopo(); rotear(); })();
