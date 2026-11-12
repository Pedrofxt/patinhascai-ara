/* =====================================================================
   MICROCHIPAGEM
   ===================================================================== */
const SITUACAO = { ativo:['Ativo','chip'], perdido:['Perdido','chip alerta'], falecido:['Falecido','chip cinza'] };
const EVENTO = {
  cadastro:['📝','Microchip cadastrado'], atualizacao:['✏️','Dados atualizados'], transferencia:['🤝','Transferido para novo tutor'],
  perdido:['🚨','Marcado como perdido'], reencontrado:['🏠','Reencontrado'], falecido:['🕊️','Marcado como falecido'], avistado:['👀','Alguém avistou o animal']
};
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
  $('#form-consulta').onsubmit = async e => {
    e.preventDefault();
    const numero = inp.value.replace(/\D/g, ''), box = $('#resultado');
    if (numero.length !== 15){ box.innerHTML = '<div class="erro" style="margin-top:14px">O número do microchip tem 15 dígitos.</div>'; return; }
    box.innerHTML = '<div class="carregando">Consultando…</div>';
    try {
      const m = await api.consultarMicrochip(numero);
      Som.tocar(m ? (m.situacao === 'perdido' ? 'erro' : 'sucesso') : 'pop');
      if (!m){ box.innerHTML = `<div class="resultado"><b>Nenhum animal com esse microchip no Patinhas Caiçara.</b><p class="meta">O chip pode estar registrado em outra base. Peça ajuda à clínica que fez a leitura.</p></div>`; return; }
      box.innerHTML = `
        <div class="resultado ${m.situacao === 'perdido' ? 'perdido' : ''}">
          ${m.situacao === 'perdido' ? '<div class="faixa-perdido">🚨 Este animal está marcado como PERDIDO. O tutor procura por ele!</div>' : ''}
          <div style="display:flex;gap:14px;align-items:center">
            <div class="bichinho">${EMOJI[m.especie]}</div>
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
        try { await api.avisarTutor(numero, $('#aviso').value); Som.tocar('sucesso'); Efeitos.confeteNo(fa, 16); fa.outerHTML = '<p class="sucesso">✓ Aviso enviado! O tutor vai ver no histórico do microchip. Obrigado por ajudar 🧡</p>'; }
        catch (err) { aviso(err.message, 'erro'); }
      };
    } catch (err) { box.innerHTML = `<div class="erro">${esc(err.message)}</div>`; }
  };

  if (!usuario) return;
  const lista = await api.meusMicrochips();
  $('#meus-chips').innerHTML = lista.length ? lista.map((m, i) => `
    <a class="linha-anuncio linha-link" href="#microchip-${m.id}" style="--i:${i}">
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
    try { const r = await api.salvarMicrochip(dados, id); aviso(id ? 'Cadastro atualizado' : 'Microchip cadastrado 🔖', 'sucesso'); if (!id) Efeitos.confeteNo(btn, 20); location.hash = 'microchip-' + r.id; }
    catch (err) {
      const msg = /duplicate|unique/i.test(err.message) ? 'Este microchip já está cadastrado.' : err.message;
      $('#erro-form').innerHTML = `<div class="erro">${esc(msg)}</div>`; Som.tocar('erro'); btn.disabled = false;
    }
  };
  const bx = $('#btn-excluir');
  if (bx) bx.onclick = async () => {
    if (bx.dataset.ok !== '1'){ bx.dataset.ok = '1'; bx.textContent = 'Clique de novo para confirmar'; return; }
    try { await api.excluirMicrochip(id); aviso('Cadastro excluído'); location.hash = 'microchip'; } catch (err) { aviso(err.message, 'erro'); }
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
          <div class="bichinho" style="width:64px;height:64px;font-size:2rem">${EMOJI[m.especie]}</div>
          <div><h2 style="margin:0">${esc(m.nome_animal)}</h2>
            <div class="meta mono" style="font-size:1rem">${formatarChip(m.numero)}</div></div>
          <div style="margin-left:auto">${situacao(m.situacao)}</div>
        </div>
        <div class="ficha">
          ${[['Espécie', ROTULO[m.especie]], ['Sexo', ROTULO[m.sexo] || '—'], ['Nascimento', esc(m.nascimento || '—')], ['Cidade', esc(m.cidade || '—')],
             ['Implante', dataBR(m.data_implante)], ['Local', esc(m.local_implante || '—')], ['Veterinário(a)', esc(m.veterinario || '—')], ['CRMV', esc(m.crmv || '—')]]
            .map(([k, v], i) => `<div style="--i:${i}"><span>${k}</span>${v}</div>`).join('')}
        </div>
        ${m.pelagem ? `<p><b>Pelagem e sinais:</b> ${esc(m.pelagem)}</p>` : ''}
        ${m.observacoes ? `<p><b>Observações:</b> ${esc(m.observacoes)}</p>` : ''}
        ${m.anuncio ? `<p>Vinculado ao anúncio <a href="#animal-${m.anuncio.id}">${esc(m.anuncio.nome)}</a>.</p>` : ''}
        <div class="acoes-linha">
          ${acoes.map(([st, txt, cls]) => `<button class="btn ${cls}" data-st="${st}">${txt}</button>`).join('')}
          <a class="btn btn-claro" href="#microchip-editar-${m.id}">✏️ Editar</a>
        </div>
      </div>
      <div class="painel" style="margin-top:24px">
        <h3>Histórico</h3>
        <ol class="timeline">
          ${m.eventos.map((e, i) => `
            <li class="${e.tipo === 'avistado' ? 'destaque' : ''}" style="--i:${i}">
              <span class="ic">${EVENTO[e.tipo][0]}</span>
              <div><b>${EVENTO[e.tipo][1]}</b> <span class="meta">· ${dataBR(e.created_at)} ${hora(e.created_at)}${e.autor?.nome ? ' · por ' + esc(e.autor.nome) : ''}</span>
                ${e.mensagem ? `<div class="recado">${esc(e.mensagem)}</div>` : ''}</div>
            </li>`).join('') || '<li class="meta">Sem eventos.</li>'}
        </ol>
      </div>
    </div>`;
  document.querySelectorAll('[data-st]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    try {
      await api.mudarSituacaoMicrochip(id, b.dataset.st);
      if (b.dataset.st === 'ativo' && m.situacao === 'perdido'){ Efeitos.confeteNo(b); Som.tocar('festa'); aviso('Que alívio! Bem-vindo de volta, ' + m.nome_animal + ' 🏠', 'sucesso'); await espera(700); }
      else aviso('Situação atualizada', 'sucesso');
      rotear();
    } catch (err) { aviso(err.message, 'erro'); b.disabled = false; }
  });
}
