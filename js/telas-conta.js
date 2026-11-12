/* =====================================================================
   Entrar, criar conta, recuperar e definir nova senha
   ===================================================================== */
function forcaSenha(s){
  let p = 0;
  if (s.length >= 6) p++; if (s.length >= 10) p++;
  if (/[A-Z]/.test(s) && /[a-z]/.test(s)) p++; if (/\d/.test(s)) p++; if (/[^A-Za-z0-9]/.test(s)) p++;
  return [['', '#c0392b'], ['Fraca', '#c0392b'], ['Razoável', '#e67e22'], ['Boa', '#d4ac0d'], ['Forte', '#27ae60'], ['Excelente', '#1e8449']][p];
}
function ligarForca(input, barra, rotulo){
  input.addEventListener('input', () => {
    const [txt, cor] = forcaSenha(input.value), n = ['Fraca','Razoável','Boa','Forte','Excelente'].indexOf(txt) + 1;
    barra.style.width = (input.value ? n * 20 : 0) + '%'; barra.style.background = cor;
    if (rotulo) rotulo.textContent = input.value ? txt : '';
  });
}
const campoSenha = (id, rotulo, auto, extra = '') => `
  <div><label for="${id}">${rotulo}</label><input type="password" id="${id}" name="${id}" required minlength="6" autocomplete="${auto}" ${extra}></div>`;

function telaEntrar(){
  let modo = 'entrar';
  const desenhar = () => {
    app.innerHTML = `
      <div class="wrap estreito">
        <div class="painel">
          ${modo === 'esqueci' ? '' : `
          <div class="abas" id="abas"><span class="pilula"></span>
            <button data-m="entrar" class="${modo === 'entrar' ? 'ativo' : ''}">Entrar</button>
            <button data-m="cadastrar" class="${modo === 'cadastrar' ? 'ativo' : ''}">Criar conta</button>
          </div>`}
          <h2>${{ entrar:'Bem-vindo de volta 🐾', cadastrar:'Faça parte da maré do bem 🌊', esqueci:'Recuperar senha 🔑' }[modo]}</h2>
          ${modo === 'esqueci' ? '<p class="meta" style="margin-top:0">Digite seu e-mail e enviaremos um link para criar uma nova senha.</p>' : ''}
          <div id="msg-auth"></div>
          <form id="form-auth" style="display:grid;gap:12px">
            ${modo === 'cadastrar' ? `
              <div><label for="a-nome">Seu nome</label><input type="text" id="a-nome" name="nome" required maxlength="60" autocomplete="name"></div>
              <div><label for="a-cidade">Cidade</label><select id="a-cidade" name="cidade">${opcoes(CIDADES, 'Paranaguá')}</select></div>` : ''}
            <div><label for="a-email">E-mail</label><input type="email" id="a-email" name="email" required autocomplete="email"></div>
            ${modo !== 'esqueci' ? `
              <div><label for="a-senha">Senha</label><input type="password" id="a-senha" name="senha" required minlength="6"
                autocomplete="${modo === 'entrar' ? 'current-password' : 'new-password'}">
                ${modo === 'cadastrar' ? '<div class="forca"><i id="forca"></i></div><small class="meta" id="forca-txt"></small>' : ''}</div>` : ''}
            <button class="btn btn-coral" type="submit">${{ entrar:'Entrar', cadastrar:'Criar conta', esqueci:'Enviar link' }[modo]}</button>
          </form>
          <p class="meta" style="text-align:center;margin-bottom:0">
            ${modo === 'entrar' ? '<a href="#" data-ir="esqueci">Esqueci minha senha</a>' : modo === 'esqueci' ? '<a href="#" data-ir="entrar">← Voltar para o login</a>' : 'Ao criar a conta você concorda em doar e adotar com responsabilidade 🧡'}
          </p>
        </div>
      </div>`;
    const abas = $('#abas');
    if (abas){ requestAnimationFrame(() => Efeitos.pilula(abas)); $$('button', abas).forEach(b => b.onclick = () => { modo = b.dataset.m; desenhar(); }); }
    $$('[data-ir]').forEach(a => a.onclick = e => { e.preventDefault(); modo = a.dataset.ir; desenhar(); });
    if (modo === 'cadastrar') ligarForca($('#a-senha'), $('#forca'), $('#forca-txt'));
    $('#form-auth').onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(e.target), btn = e.target.querySelector('button[type=submit]'), texto = btn.textContent;
      const msg = (html, ok) => { $('#msg-auth').innerHTML = `<div class="${ok ? 'sucesso' : 'erro'}">${html}</div>`; if (!ok) Som.tocar('erro'); };
      btn.disabled = true; btn.innerHTML = '<span class="girando"></span>';
      try {
        const email = fd.get('email').trim();
        if (modo === 'entrar') await api.entrar(email, fd.get('senha'));
        else if (modo === 'esqueci'){ await api.recuperarSenha(email); msg('Pronto! Se existir uma conta com esse e-mail, o link chega em instantes. Confira também o spam.', true); Som.tocar('sucesso'); }
        else {
          const r = await api.cadastrar({ email, senha:fd.get('senha'), nome:fd.get('nome').trim(), cidade:fd.get('cidade') });
          if (r.confirmarEmail){ msg('Conta criada! Enviamos um link de confirmação para o seu e-mail. Depois é só entrar. 📬', true); Som.tocar('sucesso'); }
        }
      } catch (err) { msg(esc(err.message)); }
      btn.disabled = false; btn.textContent = texto;
    };
  };
  desenhar();
}

function telaNovaSenha(){
  app.innerHTML = `
    <div class="wrap estreito">
      <div class="painel">
        <h2>Criar nova senha 🔐</h2>
        <div id="msg-ns"></div>
        <form id="form-ns" style="display:grid;gap:12px">
          ${campoSenha('ns-1', 'Nova senha', 'new-password')}
          <div class="forca"><i id="forca-ns"></i></div>
          ${campoSenha('ns-2', 'Repita a nova senha', 'new-password')}
          <button class="btn btn-coral" type="submit">Salvar nova senha</button>
        </form>
      </div>
    </div>`;
  ligarForca($('#ns-1'), $('#forca-ns'));
  $('#form-ns').onsubmit = async e => {
    e.preventDefault();
    const a = $('#ns-1').value, b = $('#ns-2').value;
    if (a !== b){ $('#msg-ns').innerHTML = '<div class="erro">As senhas não são iguais.</div>'; Som.tocar('erro'); return; }
    try { await api.definirNovaSenha(a); aviso('Senha alterada com sucesso!', 'sucesso'); location.hash = 'perfil'; }
    catch (err) { $('#msg-ns').innerHTML = `<div class="erro">${esc(err.message)}</div>`; Som.tocar('erro'); }
  };
}
