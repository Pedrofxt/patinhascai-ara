/* =====================================================================
   Chat em tempo real e conclusão da adoção
   ===================================================================== */
async function telaChat(id){
  const conversas = await api.listarConversas();
  const atual = conversas.find(c => c.id === id);
  const outro = c => c.doador_id === usuario.id ? c.interessado : c.doador;
  app.innerHTML = `
    <div class="wrap">
      <div class="chat ${atual ? 'com-conversa' : ''}">
        <aside class="lista">
          <h2>Conversas</h2>
          ${conversas.length ? conversas.map((c, i) => `
            <a class="conv ${c.id === id ? 'sel' : ''}" href="#chat-${c.id}" style="--i:${i}">
              ${avatarHTML(outro(c), 46)}
              <div style="min-width:0"><b>${esc(outro(c)?.nome || 'Usuário')}</b>
                <small>${EMOJI[c.anuncio?.especie] || '🐾'} ${esc(c.anuncio?.nome || '')} · ${esc(c.ultima?.texto || 'Nenhuma mensagem ainda')}</small></div>
            </a>`).join('')
          : `<p class="meta" style="padding:0 18px">Você ainda não tem conversas. Encontre um animal na <a href="#inicio">vitrine</a> e fale com o doador.</p>`}
        </aside>
        <section class="thread">
          ${atual ? `
            <div class="thread-topo">
              <a class="vol" href="#chat" aria-label="Voltar">←</a>
              <a href="#usuario-${outro(atual)?.id}">${avatarHTML(outro(atual), 42)}</a>
              <div><b>${esc(outro(atual)?.nome || 'Usuário')}</b>
                <div class="meta">sobre <a href="#animal-${atual.anuncio_id}">${esc(atual.anuncio?.nome || 'o anúncio')}</a> ·
                ${atual.doador_id === usuario.id ? 'interessado em adotar' : 'doador'}</div></div>
              ${atual.doador_id === usuario.id && atual.anuncio?.status !== 'adotado'
                ? `<div class="concluir" id="concluir"><button class="btn btn-coral btn-p" id="btn-concluir">🎉 Concluir adoção</button></div>`
                : atual.anuncio?.status === 'adotado' ? '<span class="chip" style="margin-left:auto">Adotado 🧡</span>' : ''}
            </div>
            <div id="msgs" aria-live="polite"></div>
            <form class="enviar" id="form-msg">
              <input type="text" id="texto" placeholder="Escreva uma mensagem…" autocomplete="off" maxlength="2000" required aria-label="Mensagem">
              <button class="btn btn-mar" type="submit" aria-label="Enviar">Enviar ➤</button>
            </form>`
          : `<div class="thread-vazia"><div><span class="grande">💬</span>Escolha uma conversa ao lado.</div></div>`}
        </section>
      </div>
    </div>`;
  if (!atual) return;

  const caixa = $('#msgs'), vistas = new Set();
  let carregado = false;
  const adicionar = m => {
    if (vistas.has(m.id)) return;
    if (!vistas.size) caixa.innerHTML = '';
    vistas.add(m.id);
    const minha = m.autor_id === usuario.id;
    caixa.insertAdjacentHTML('beforeend', `<div class="bolha ${minha ? 'minha' : ''}">${esc(m.texto)}<time>${hora(m.created_at)}</time></div>`);
    caixa.scrollTo({ top:caixa.scrollHeight, behavior:carregado ? 'smooth' : 'auto' });
    if (carregado && !minha) Som.tocar('receber');
    if (carregado && /Adoção concluída/.test(m.texto)) Efeitos.confete();
    const prev = $('.conv.sel small');
    if (prev) prev.textContent = (atual.anuncio?.nome || '') + ' · ' + m.texto;
  };
  cancelarAssinatura = api.assinarMensagens(id, adicionar);  // tempo real primeiro…
  (await api.listarMensagens(id)).forEach(adicionar);         // …depois o histórico (repetidas são ignoradas)
  carregado = true;
  if (!vistas.size) caixa.innerHTML = `<p class="meta" style="text-align:center;margin:auto">Diga oi! 👋 Pergunte sobre temperamento, saúde e como combinar uma visita.</p>`;

  const bc = $('#btn-concluir');
  if (bc) bc.onclick = () => {
    $('#concluir').innerHTML = `<span class="meta">Marcar ${esc(atual.anuncio?.nome)} como adotado${atual.anuncio?.microchipado ? ' e transferir o microchip' : ''}?</span>
      <button class="btn btn-coral btn-p" id="sim">Confirmar</button><button class="btn btn-claro btn-p" id="nao">Cancelar</button>`;
    $('#nao').onclick = () => rotear();
    $('#sim').onclick = async ev => {
      ev.target.disabled = true;
      try {
        const n = await api.concluirAdocao(id);
        Efeitos.confete(); Som.tocar('festa');
        aviso(n ? 'Adoção concluída e microchip transferido 🧡' : 'Adoção concluída 🧡', 'sucesso');
        await espera(900); rotear();
      } catch (err) { aviso(err.message, 'erro'); ev.target.disabled = false; }
    };
  };

  $('#form-msg').onsubmit = async e => {
    e.preventDefault();
    const campo = $('#texto'), texto = campo.value.trim(); if (!texto) return;
    campo.value = ''; Som.tocar('enviar');
    try { await api.enviarMensagem(id, texto); } catch (err) { aviso(err.message, 'erro'); campo.value = texto; }
    campo.focus();
  };
}
