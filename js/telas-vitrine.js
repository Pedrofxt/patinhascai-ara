/* =====================================================================
   Vitrine, página do animal, anunciar e perfil público
   ===================================================================== */
const filtros = { especie:'', cidade:'', porte:'', busca:'' };

const palavras = txt => txt.split(' ').map((p, i) => `<span class="palavra" style="--i:${i}">${p}</span>`).join(' ');

function cardAnimal(a, i = 0){
  return `
    <a class="card" href="#animal-${a.id}" style="--i:${i}">
      <div class="moldura">${foto(a)}<div class="brilho"></div>${ehNovo(a.created_at) ? '<span class="selo-novo">Novo</span>' : ''}</div>
      <div class="corpo">
        <h3>${esc(a.nome)}</h3>
        <div class="meta">${ROTULO[a.especie]} · ${esc(a.idade || 'idade ?')} · ${ROTULO[a.porte]}</div>
        <div class="meta">📍 ${esc(a.cidade)} · ${quando(a.created_at)}</div>
        <div class="chips">
          ${a.vacinado ? '<span class="chip">Vacinado</span>' : ''}
          ${a.castrado ? '<span class="chip">Castrado</span>' : ''}
          ${a.microchipado ? '<span class="chip">🔖 Chip</span>' : ''}
          <span class="chip coral">${ROTULO[a.sexo]}</span>
        </div>
      </div>
    </a>`;
}
const esqueletos = n => Array.from({ length:n }, () => '<div class="esqueleto"><i></i><i></i><i></i></div>').join('');

async function telaInicio(){
  app.innerHTML = `
    <div>
      <section class="hero">
        ${Efeitos.patinhas(10)}
        <svg class="astro" viewBox="0 0 200 200" aria-hidden="true">
          <g class="raios"><circle cx="100" cy="100" r="88" fill="none" stroke="#ffd27a" stroke-width="7" stroke-dasharray="3 19" stroke-linecap="round"/></g>
          <circle class="disco" cx="100" cy="100" r="62"/>
          <circle class="cratera" cx="80" cy="86" r="11" fill="#9fb3c8"/><circle class="cratera" cx="118" cy="118" r="8" fill="#9fb3c8"/><circle class="cratera" cx="120" cy="80" r="5" fill="#9fb3c8"/>
          <g fill="#fff"><circle class="estrela" style="--i:0" cx="20" cy="30" r="2.5"/><circle class="estrela" style="--i:1" cx="180" cy="40" r="2"/>
          <circle class="estrela" style="--i:2" cx="30" cy="170" r="2"/><circle class="estrela" style="--i:3" cx="175" cy="165" r="2.6"/><circle class="estrela" style="--i:4" cx="100" cy="12" r="1.8"/></g>
        </svg>
        <div class="wrap">
          <h1>${palavras('Um lar na beira do mar pra quem tem')} <em class="palavra" style="--i:9">quatro patas</em></h1>
          <p>Encontre cães, gatos e outros bichinhos esperando adoção em Paranaguá, Matinhos, Guaratuba e em todo o litoral do Paraná. Sem venda, só amor.</p>
          <div class="acoes">
            <a class="btn btn-coral" href="#vitrine" id="ir-vitrine">🐾 Quero adotar</a>
            <a class="btn btn-claro" href="#anunciar">Tenho um animal para doar</a>
          </div>
          <div class="numeros">
            <div><b data-contar="0" id="n-disp">0</b><span>esperando um lar</span></div>
            <div><b data-contar="0" id="n-adot">0</b><span>já adotados</span></div>
            <div><b>7</b><span>cidades do litoral</span></div>
          </div>
        </div>
        <div class="ondas" aria-hidden="true">
          ${[1, 2, 3].map(n => `<svg class="o${n}" viewBox="0 0 2880 110" preserveAspectRatio="none"><path d="M0 50 C240 ${10 + n * 6} 480 ${10 + n * 6} 720 50 S1200 ${90 - n * 4} 1440 50 S1920 ${10 + n * 6} 2160 50 S2640 ${90 - n * 4} 2880 50 V110 H0Z"/></svg>`).join('')}
        </div>
      </section>
      <div class="wrap" id="vitrine">
        <div class="filtros">
          <label class="busca"><span class="sr">Buscar pelo nome</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input type="text" id="f-busca" placeholder="Buscar pelo nome…" value="${esc(filtros.busca)}" autocomplete="off"></label>
          <select id="f-especie" aria-label="Espécie">${opcoes(['cachorro','gato','outro'], filtros.especie, 'Todas as espécies')}</select>
          <select id="f-cidade" aria-label="Cidade">${opcoes(CIDADES, filtros.cidade, 'Todo o litoral')}</select>
          <select id="f-porte" aria-label="Porte">${opcoes(['pequeno','medio','grande'], filtros.porte, 'Qualquer porte')}</select>
        </div>
        <div class="titulo-secao revelar"><h2>Esperando por você</h2><span class="meta" id="qtd"></span></div>
        <div class="grade" id="grade">${esqueletos(8)}</div>
        <div class="titulo-secao revelar"><h2>Como funciona</h2></div>
        <div class="passos">
          <div class="passo revelar" style="--i:0"><div class="n">🔎</div><h3>Encontre</h3><p class="meta">Filtre por espécie, porte e cidade do litoral e conheça cada bichinho.</p></div>
          <div class="passo revelar" style="--i:1"><div class="n">💬</div><h3>Converse</h3><p class="meta">Fale direto com quem está doando pelo chat e combine uma visita.</p></div>
          <div class="passo revelar" style="--i:2"><div class="n">🏡</div><h3>Adote</h3><p class="meta">Adoção concluída! Se o animal tem microchip, ele passa para o seu nome.</p></div>
        </div>
      </div>
    </div>`;
  $('#ir-vitrine').onclick = e => { e.preventDefault(); $('#vitrine').scrollIntoView({ behavior:'smooth' }); };
  ['especie','cidade','porte'].forEach(k => $('#f-' + k).onchange = e => { filtros[k] = e.target.value; Som.tocar('pop'); carregarGrade(); });
  let t; $('#f-busca').oninput = e => { clearTimeout(t); t = setTimeout(() => { filtros.busca = e.target.value.trim(); carregarGrade(); }, 300); };
  Efeitos.revelar();
  api.numerosVitrine().then(n => { $('#n-disp').dataset.contar = n.disponiveis; $('#n-adot').dataset.contar = n.adotados; Efeitos.contar(); }).catch(() => {});
  carregarGrade();
}

async function carregarGrade(){
  const grade = $('#grade'); if (!grade) return;
  grade.innerHTML = esqueletos(4);
  try {
    const lista = await api.listarAnuncios(filtros);
    if (!$('#grade')) return;
    $('#qtd').textContent = lista.length ? `${lista.length} ${lista.length === 1 ? 'animal' : 'animais'}` : '';
    grade.innerHTML = lista.length ? lista.map(cardAnimal).join('')
      : `<div class="vazio"><span class="grande">🌊</span>Nenhum animal com esses filtros por enquanto.<br>Tente outra cidade ou espécie.</div>`;
  } catch (e) { grade.innerHTML = `<div class="vazio erro">${esc(e.message)}</div>`; }
}

async function telaAnimal(id){
  const a = await api.obterAnuncio(id);
  const meu = usuario && usuario.id === a.doador_id;
  const ficha = [['Espécie', ROTULO[a.especie]], ['Sexo', ROTULO[a.sexo]], ['Idade', esc(a.idade || 'Não informada')], ['Porte', ROTULO[a.porte]],
    ['Vacinado', a.vacinado ? 'Sim ✓' : 'Não'], ['Castrado', a.castrado ? 'Sim ✓' : 'Não'], ['Microchip', a.microchipado ? 'Sim ✓' : 'Não'], ['Cidade', esc(a.cidade)]];
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
          <div class="meta">Anunciado ${quando(a.created_at)}${a.status !== 'disponivel' ? ` · <span class="chip coral">${ROTULO[a.status]}</span>` : ''}</div>
          <div class="ficha">${ficha.map(([k, v], i) => `<div style="--i:${i}"><span>${k}</span>${v}</div>`).join('')}</div>
          <p>${esc(a.descricao || 'Sem descrição.')}</p>
          <a class="pessoa" href="#usuario-${a.doador_id}">
            ${avatarHTML(a.doador, 48)}
            <div><b>${esc(a.doador?.nome || 'Doador')}</b><div class="meta">Doador · ${esc(a.doador?.cidade || a.cidade)} · ver perfil →</div></div>
          </a>
          <div class="acoes-linha">
            ${meu ? `<a class="btn btn-mar" href="#perfil-anuncios">Este anúncio é seu: gerenciar</a>
                     ${a.microchipado ? '' : '<a class="btn btn-claro" href="#microchip-novo">🔖 Cadastrar microchip</a>'}`
                  : a.status === 'adotado' ? '<span class="chip">Já encontrou um lar 🧡</span>'
                  : `<button class="btn btn-coral" id="btn-conversar">💬 Conversar com o doador</button>`}
            <button class="btn btn-claro" id="btn-copiar">🔗 Copiar link</button>
          </div>
        </div>
      </div>
    </div>`;
  $$('.miniaturas img').forEach(img => img.onclick = () => {
    $$('.miniaturas img').forEach(i => i.classList.remove('sel')); img.classList.add('sel');
    $('#foto-grande').innerHTML = foto({ ...a, fotos:[a.fotos[img.dataset.i]] });
  });
  $('#btn-copiar').onclick = async () => {
    try { await navigator.clipboard.writeText(location.href); aviso('Link copiado! Compartilhe com quem pode adotar', 'sucesso'); }
    catch { aviso('Não consegui copiar. O link está na barra do navegador.', 'erro'); }
  };
  const b = $('#btn-conversar');
  if (b) b.onclick = async () => {
    Som.tocar(a.especie === 'gato' ? 'miau' : 'latido');
    if (!usuario){ destinoPosLogin = location.hash; location.hash = 'entrar'; aviso('Entre para conversar com o doador'); return; }
    b.disabled = true;
    try { location.hash = 'chat-' + await api.abrirConversa(a); }
    catch (e) { aviso(e.message, 'erro'); b.disabled = false; }
  };
}

function telaAnunciar(){
  let arquivos = [];
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
          <div class="full">
            <label>Fotos (até 5)</label>
            <div class="zona-fotos" id="zona" tabindex="0" role="button" aria-label="Escolher fotos"><span class="grande">📸</span>Arraste as fotos aqui ou <b>clique para escolher</b></div>
            <input type="file" id="fotos" accept="image/*" multiple hidden>
            <div class="previas" id="previas"></div>
          </div>
          <div class="full"><button class="btn btn-coral" type="submit">Publicar anúncio</button></div>
        </form>
      </div>
    </div>`;
  const inp = $('#fotos'), zona = $('#zona');
  const desenhar = async () => {
    const urls = await Promise.all(arquivos.map(lerArquivo));
    $('#previas').innerHTML = urls.map((u, i) => `<div class="p" style="animation-delay:${i * 60}ms"><img src="${u}" alt=""><button type="button" data-i="${i}" aria-label="Remover foto">✕</button></div>`).join('');
    $$('#previas button').forEach(b => b.onclick = () => { arquivos.splice(+b.dataset.i, 1); Som.tocar('pop'); desenhar(); });
  };
  const adicionar = lista => {
    const novas = [...lista].filter(f => f.type.startsWith('image/'));
    arquivos = [...arquivos, ...novas].slice(0, 5);
    if (novas.length) Som.tocar('pop');
    desenhar();
  };
  zona.onclick = () => inp.click();
  zona.onkeydown = e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); inp.click(); } };
  inp.onchange = () => { adicionar(inp.files); inp.value = ''; };
  zona.ondragover = e => { e.preventDefault(); zona.classList.add('arrastando'); };
  zona.ondragleave = () => zona.classList.remove('arrastando');
  zona.ondrop = e => { e.preventDefault(); zona.classList.remove('arrastando'); adicionar(e.dataTransfer.files); };

  $('#form-anuncio').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target), btn = e.target.querySelector('button[type=submit]');
    const dados = {
      nome:fd.get('nome').trim(), especie:fd.get('especie'), sexo:fd.get('sexo'), idade:fd.get('idade').trim(),
      porte:fd.get('porte'), cidade:fd.get('cidade'), descricao:fd.get('descricao').trim(),
      vacinado:!!fd.get('vacinado'), castrado:!!fd.get('castrado')
    };
    btn.disabled = true; btn.innerHTML = '<span class="girando"></span> Publicando…';
    try {
      const a = await api.criarAnuncio(dados, arquivos);
      Efeitos.confeteNo(btn); Som.tocar('festa'); aviso('Anúncio publicado! Boa sorte para ' + a.nome, 'sucesso');
      await espera(600); location.hash = 'animal-' + a.id;
    } catch (err) {
      $('#erro-form').innerHTML = `<div class="erro">${esc(err.message)}</div>`; Som.tocar('erro');
      btn.disabled = false; btn.textContent = 'Publicar anúncio';
    }
  };
}

async function telaUsuario(id){
  const p = await api.perfilPublico(id);
  const souEu = usuario?.id === id;
  app.innerHTML = `
    <div class="wrap">
      <div class="perfil-capa">
        <div class="linha">
          <div class="avatar-grande">${avatarHTML(p, 112)}</div>
          <div>
            <h1>${esc(p.nome)}</h1>
            <div class="meta">📍 ${esc(p.cidade || 'Litoral do PR')} · no Patinhas desde ${mesAno(p.created_at)}</div>
            ${p.bio ? `<p style="margin:.6em 0 0;max-width:52ch">${esc(p.bio)}</p>` : ''}
          </div>
          <div class="estat">
            <div><b data-contar="${p.anuncios.length}">0</b><span>para adoção</span></div>
            <div><b data-contar="${p.adotados}">0</b><span>já adotados</span></div>
          </div>
        </div>
      </div>
      ${souEu ? '<p><a class="btn btn-claro btn-p" href="#perfil">✏️ Editar meu perfil</a></p>' : ''}
      <div class="titulo-secao"><h2>Animais de ${esc(primeiroNome(p.nome))}</h2></div>
      <div class="grade">${p.anuncios.length ? p.anuncios.map(cardAnimal).join('') : '<div class="vazio"><span class="grande">🏖️</span>Nenhum animal disponível agora.</div>'}</div>
    </div>`;
  Efeitos.contar();
}
