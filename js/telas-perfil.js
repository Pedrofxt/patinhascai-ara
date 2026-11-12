/* =====================================================================
   Área de perfil: dados, aparência (foto, avatar, tema, sons),
   segurança (senha, sair, excluir conta) e meus anúncios
   ===================================================================== */
const ABAS_PERFIL = [['dados', '👤 Meus dados'], ['aparencia', '🎨 Aparência'], ['seguranca', '🔒 Segurança'], ['anuncios', '🐾 Meus anúncios']];

async function telaPerfil(aba = 'dados'){
  if (!ABAS_PERFIL.some(([k]) => k === aba)) aba = 'dados';
  const est = await api.estatisticas().catch(() => ({ anuncios:0, adotados:0, microchips:0 }));
  app.innerHTML = `
    <div class="wrap" style="max-width:900px">
      <div class="perfil-capa">
        <div class="linha">
          <div class="avatar-grande" id="avatar-capa">
            ${avatarHTML(usuario, 112)}
            <button class="camera" id="btn-camera" aria-label="Trocar foto de perfil" title="Trocar foto">📷</button>
            <input type="file" id="arquivo-foto" accept="image/jpeg,image/png,image/webp" hidden>
          </div>
          <div>
            <h1>${esc(usuario.nome || 'Meu perfil')}</h1>
            <div class="meta">📍 ${esc(usuario.cidade || 'Cidade não informada')} · desde ${usuario.created_at ? mesAno(usuario.created_at) : 'hoje'}</div>
            <a href="#usuario-${usuario.id}" style="color:#fff;font-size:.88rem">Ver meu perfil público →</a>
          </div>
          <div class="estat">
            <div><b data-contar="${est.anuncios}">0</b><span>anúncios</span></div>
            <div><b data-contar="${est.adotados}">0</b><span>adoções</span></div>
            <div><b data-contar="${est.microchips}">0</b><span>microchips</span></div>
          </div>
        </div>
      </div>
      <nav class="perfil-abas" aria-label="Seções do perfil">
        ${ABAS_PERFIL.map(([k, t]) => `<a href="#perfil${k === 'dados' ? '' : '-' + k}" class="${k === aba ? 'ativo' : ''}">${t}</a>`).join('')}
      </nav>
      <div class="painel" id="aba-perfil" style="margin-bottom:70px"></div>
    </div>`;
  Efeitos.contar();
  ligarFotoPerfil();
  await ({ dados:abaDados, aparencia:abaAparencia, seguranca:abaSeguranca, anuncios:abaAnuncios })[aba]($('#aba-perfil'));
}

function ligarFotoPerfil(){
  const inp = $('#arquivo-foto');
  $('#btn-camera').onclick = () => inp.click();
  inp.onchange = async () => {
    const f = inp.files[0]; inp.value = ''; if (!f) return;
    if (f.size > 10 * 1024 * 1024){ aviso('Escolha uma imagem de até 10 MB.', 'erro'); return; }
    const capa = $('#avatar-capa .av');
    capa.style.opacity = '.4';
    try {
      usuario = await api.enviarFotoPerfil(f);
      atualizarTopo(); aviso('Foto de perfil atualizada!', 'sucesso');
      Efeitos.confeteNo($('#avatar-capa'), 18);
      rotear();
    } catch (e) { aviso(e.message, 'erro'); capa.style.opacity = '1'; }
  };
}

/* ---------- Meus dados ---------- */
function abaDados(el){
  el.innerHTML = `
    <h2>Meus dados</h2>
    <p class="meta" style="margin-top:0">Nome, cidade e bio aparecem no seu perfil público. O telefone fica visível só para você.</p>
    <div id="msg-dados"></div>
    <form id="form-dados" class="form-grid">
      <div><label for="p-nome">Nome</label><input type="text" id="p-nome" name="nome" required maxlength="60" value="${esc(usuario.nome)}" autocomplete="name"></div>
      <div><label for="p-cidade">Cidade</label><select id="p-cidade" name="cidade">${opcoes(CIDADES, usuario.cidade, 'Selecione')}</select></div>
      <div><label for="p-tel">Telefone / WhatsApp <small class="meta">(privado)</small></label>
        <input type="tel" id="p-tel" name="telefone" maxlength="20" placeholder="(41) 99999-9999" value="${esc(usuario.telefone)}" autocomplete="tel"></div>
      <div><label for="p-email">E-mail</label><input type="email" id="p-email" value="${esc(usuario.email)}" readonly title="O e-mail é usado para entrar e não pode ser alterado aqui"></div>
      <div class="full"><label for="p-bio">Sobre você</label>
        <textarea id="p-bio" name="bio" rows="3" maxlength="300" placeholder="Ex.: Protetora independente em Matinhos, resgato gatinhos desde 2019.">${esc(usuario.bio)}</textarea>
        <small class="meta"><span id="bio-n">${(usuario.bio || '').length}</span>/300</small></div>
      <div class="full"><button class="btn btn-coral" type="submit">Salvar alterações</button></div>
    </form>`;
  $('#p-bio').oninput = e => $('#bio-n').textContent = e.target.value.length;
  $('#p-tel').oninput = e => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 11);
    e.target.value = d.length > 10 ? d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3') : d.length > 6 ? d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3') : d.length > 2 ? d.replace(/(\d{2})(\d{0,5})/, '($1) $2') : d;
  };
  $('#form-dados').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target), btn = e.target.querySelector('button');
    btn.disabled = true; btn.innerHTML = '<span class="girando"></span> Salvando…';
    try {
      usuario = await api.atualizarPerfil({ nome:fd.get('nome').trim(), cidade:fd.get('cidade') || null, telefone:fd.get('telefone').trim() || null, bio:fd.get('bio').trim() || null });
      atualizarTopo(); aviso('Perfil atualizado!', 'sucesso'); Efeitos.confeteNo(btn, 14);
      $('.perfil-capa h1').textContent = usuario.nome;
    } catch (err) { $('#msg-dados').innerHTML = `<div class="erro">${esc(err.message)}</div>`; Som.tocar('erro'); }
    btn.disabled = false; btn.textContent = 'Salvar alterações';
  };
}

/* ---------- Aparência ---------- */
function abaAparencia(el){
  const tema = document.documentElement.dataset.tema;
  el.innerHTML = `
    <div class="secao">
      <h3>Foto de perfil</h3>
      <p class="meta" style="margin-top:0">JPG, PNG ou WEBP. A foto é recortada em quadrado e reduzida automaticamente.</p>
      <div class="acoes-linha" style="align-items:center">
        ${avatarHTML(usuario, 72)}
        <button class="btn btn-mar" id="ap-enviar">📷 ${usuario.avatar_url ? 'Trocar foto' : 'Enviar foto'}</button>
        ${usuario.avatar_url ? '<button class="btn btn-claro" id="ap-remover">Remover foto</button>' : ''}
      </div>
    </div>
    <div class="secao">
      <h3>Avatar</h3>
      <p class="meta" style="margin-top:0">${usuario.avatar_url ? 'Escolher um avatar remove a foto de perfil.' : 'Aparece no lugar da foto em todo o site.'}</p>
      <div class="grade-avatares">
        ${Object.entries(AVATARES).map(([k, a]) => `
          <button class="op-avatar ${!usuario.avatar_url && usuario.avatar_preset === k ? 'sel' : ''}" data-av="${k}" aria-label="Avatar ${a.nome}" title="${a.nome}">
            <span class="av">${a.svg}</span></button>`).join('')}
      </div>
    </div>
    <div class="secao">
      <h3>Tema</h3>
      <div class="temas">
        <button class="op-tema ${tema === 'claro' ? 'sel' : ''}" data-tema="claro">
          <div class="mini-tela" style="background:#f6efe4"><i style="left:10px;top:10px;right:10px;height:14px;background:#fffdf9"></i><i style="left:10px;top:32px;width:40%;height:32px;background:#d8ecec"></i><i style="right:10px;top:32px;width:40%;height:32px;background:#fde3dc"></i></div>
          <b>☀️ Claro</b><div class="meta">Areia e mar de dia</div></button>
        <button class="op-tema ${tema === 'escuro' ? 'sel' : ''}" data-tema="escuro">
          <div class="mini-tela" style="background:#0c181b"><i style="left:10px;top:10px;right:10px;height:14px;background:#13252a"></i><i style="left:10px;top:32px;width:40%;height:32px;background:#173b40"></i><i style="right:10px;top:32px;width:40%;height:32px;background:#3a2420"></i></div>
          <b>🌙 Escuro</b><div class="meta">Lua sobre a baía</div></button>
      </div>
    </div>
    <div class="secao">
      <div class="linha-opcao">
        <div><h3>Efeitos sonoros</h3><p class="meta" style="margin:0">Sons de clique, mensagens, conquistas e troca de tema.</p></div>
        <button class="interruptor" id="ap-som" role="switch" aria-checked="${Som.ligado}" aria-label="Efeitos sonoros"></button>
      </div>
    </div>`;
  $('#ap-enviar').onclick = () => $('#arquivo-foto').click();
  const rem = $('#ap-remover');
  if (rem) rem.onclick = async () => {
    rem.disabled = true;
    try { usuario = await api.removerFotoPerfil(); atualizarTopo(); aviso('Foto removida. Agora seu avatar aparece no lugar.', 'sucesso'); rotear(); }
    catch (e) { aviso(e.message, 'erro'); rem.disabled = false; }
  };
  $$('.op-avatar').forEach(b => b.onclick = async () => {
    $$('.op-avatar').forEach(x => x.classList.remove('sel')); b.classList.add('sel');
    Som.tocar(b.dataset.av === 'gato' ? 'miau' : b.dataset.av === 'cachorro' ? 'latido' : 'pop');
    try {
      if (usuario.avatar_url) await api.removerFotoPerfil();
      usuario = await api.atualizarPerfil({ avatar_preset:b.dataset.av });
      atualizarTopo();
      $('#avatar-capa .av').outerHTML = avatarHTML(usuario, 112);
      aviso(`Avatar ${AVATARES[b.dataset.av].nome} escolhido!`, 'sucesso');
      if ($('#ap-remover')) rotear();
    } catch (e) { aviso(e.message, 'erro'); }
  });
  $$('.op-tema').forEach(b => b.onclick = async ev => {
    $$('.op-tema').forEach(x => x.classList.remove('sel')); b.classList.add('sel');
    await definirTema(b.dataset.tema, ev);
  });
  $('#ap-som').onclick = e => { const v = Som.definir(!Som.ligado); e.currentTarget.setAttribute('aria-checked', v); atualizarBotaoSom(); };
}

/* ---------- Segurança ---------- */
function abaSeguranca(el){
  el.innerHTML = `
    <div class="secao">
      <h3>Alterar senha</h3>
      <div id="msg-senha"></div>
      <form id="form-senha" class="form-grid">
        <div class="full">${campoSenha('s-atual', 'Senha atual', 'current-password')}</div>
        <div>${campoSenha('s-nova', 'Nova senha', 'new-password')}<div class="forca"><i id="forca-s"></i></div><small class="meta" id="forca-s-txt"></small></div>
        <div>${campoSenha('s-conf', 'Repita a nova senha', 'new-password')}</div>
        <div class="full"><button class="btn btn-mar" type="submit">Alterar senha</button></div>
      </form>
    </div>
    <div class="secao">
      <div class="linha-opcao"><div><h3>Sair da conta</h3><p class="meta" style="margin:0">Encerra a sessão neste aparelho.</p></div>
        <button class="btn btn-claro" id="btn-sair">Sair</button></div>
    </div>
    <div class="secao">
      <div class="perigo">
        <h3>Excluir minha conta</h3>
        <p class="meta" style="margin-top:0">Apaga para sempre seu perfil, fotos, anúncios, conversas e os microchips no seu nome. Não dá para desfazer.</p>
        <button class="btn btn-perigo" id="btn-excluir">Excluir conta…</button>
      </div>
    </div>`;
  ligarForca($('#s-nova'), $('#forca-s'), $('#forca-s-txt'));
  $('#form-senha').onsubmit = async e => {
    e.preventDefault();
    const msg = (t, ok) => { $('#msg-senha').innerHTML = `<div class="${ok ? 'sucesso' : 'erro'}">${esc(t)}</div>`; if (!ok) Som.tocar('erro'); };
    const atual = $('#s-atual').value, nova = $('#s-nova').value;
    if (nova !== $('#s-conf').value) return msg('As novas senhas não são iguais.');
    if (nova === atual) return msg('A nova senha precisa ser diferente da atual.');
    const btn = e.target.querySelector('button'); btn.disabled = true;
    try { await api.alterarSenha(atual, nova); e.target.reset(); $('#forca-s').style.width = 0; msg('Senha alterada com sucesso! 🔐', true); Som.tocar('sucesso'); }
    catch (err) { msg(err.message); }
    btn.disabled = false;
  };
  $('#btn-sair').onclick = async () => { await api.sair(); aviso('Até logo! 🐾'); location.hash = 'inicio'; };
  $('#btn-excluir').onclick = abrirExcluirConta;
}

function abrirExcluirConta(){
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="t-excluir">
      <h2 id="t-excluir">Excluir conta? 😢</h2>
      <p class="meta">Vamos sentir falta! Para confirmar, digite <b>EXCLUIR</b> e sua senha.</p>
      <div id="msg-exc"></div>
      <form id="form-exc" style="display:grid;gap:12px">
        <div><label for="x-conf">Digite EXCLUIR</label><input type="text" id="x-conf" autocomplete="off" required></div>
        ${campoSenha('x-senha', 'Sua senha', 'current-password')}
        <div class="acoes-linha"><button class="btn btn-perigo" type="submit" disabled id="x-ok">Excluir para sempre</button>
          <button class="btn btn-claro" type="button" id="x-cancelar">Cancelar</button></div>
      </form>
    </div>`;
  document.body.appendChild(fundo);
  const fechar = () => { fundo.remove(); document.removeEventListener('keydown', esc_); };
  const esc_ = e => { if (e.key === 'Escape') fechar(); };
  document.addEventListener('keydown', esc_);
  fundo.onclick = e => { if (e.target === fundo) fechar(); };
  $('#x-cancelar').onclick = fechar;
  $('#x-conf').focus();
  $('#x-conf').oninput = e => { $('#x-ok').disabled = e.target.value.trim().toUpperCase() !== 'EXCLUIR'; };
  $('#form-exc').onsubmit = async e => {
    e.preventDefault();
    const b = $('#x-ok'); b.disabled = true; b.innerHTML = '<span class="girando"></span> Excluindo…';
    try { await api.excluirConta($('#x-senha').value); fechar(); aviso('Sua conta foi excluída. Obrigado por ter feito parte! 🧡'); location.hash = 'inicio'; }
    catch (err) { $('#msg-exc').innerHTML = `<div class="erro">${esc(err.message)}</div>`; Som.tocar('erro'); b.disabled = false; b.textContent = 'Excluir para sempre'; }
  };
}

/* ---------- Meus anúncios ---------- */
async function abaAnuncios(el){
  const meus = await api.meusAnuncios();
  el.innerHTML = `
    <div class="linha-opcao" style="margin-bottom:8px"><h2 style="margin:0">Meus anúncios</h2>
      <div class="acoes-linha"><a class="btn btn-claro btn-p" href="#microchip">🔖 Microchips</a><a class="btn btn-coral btn-p" href="#anunciar">+ Novo anúncio</a></div></div>
    ${meus.length ? meus.map((a, i) => `
      <div class="linha-anuncio" style="--i:${i}" data-id="${a.id}">
        <div class="mini">${foto(a)}</div>
        <div style="min-width:0"><a href="#animal-${a.id}"><b>${esc(a.nome)}</b></a><div class="meta">${esc(a.cidade)} · ${quando(a.created_at)}${a.microchipado ? ' · 🔖' : ''}</div></div>
        <select aria-label="Situação de ${esc(a.nome)}">${opcoes(['disponivel','reservado','adotado'], a.status)}</select>
        <button class="icone-btn" data-apagar aria-label="Excluir anúncio de ${esc(a.nome)}" title="Excluir">🗑️</button>
      </div>`).join('')
    : `<div class="vazio"><span class="grande">🐾</span>Você ainda não anunciou nenhum animal.<br><a href="#anunciar">Anunciar agora</a></div>`}`;
  $$('.linha-anuncio', el).forEach(linha => {
    const a = meus.find(x => x.id === linha.dataset.id);
    $('select', linha).onchange = async ev => {
      try {
        await api.mudarStatus(a.id, ev.target.value);
        if (ev.target.value === 'adotado'){ Efeitos.confeteNo(ev.target); Som.tocar('festa'); aviso('Que alegria! Mais uma patinha com lar 🧡', 'sucesso'); }
        else aviso('Situação atualizada', 'sucesso');
      } catch (e) { aviso(e.message, 'erro'); }
    };
    const lixo = $('[data-apagar]', linha);
    lixo.onclick = async () => {
      if (lixo.dataset.ok !== '1'){ lixo.dataset.ok = '1'; lixo.textContent = '❓'; lixo.title = 'Clique de novo para confirmar'; aviso('Clique de novo na lixeira para excluir ' + a.nome); setTimeout(() => { lixo.dataset.ok = ''; lixo.textContent = '🗑️'; }, 3500); return; }
      try {
        await api.excluirAnuncio(a);
        linha.style.transition = 'opacity .35s, transform .35s'; linha.style.opacity = 0; linha.style.transform = 'translateX(40px)';
        Som.tocar('pop'); await espera(350); linha.remove(); aviso('Anúncio excluído');
      } catch (e) { aviso(e.message, 'erro'); }
    };
  });
}
