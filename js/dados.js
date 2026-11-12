/* =====================================================================
   CAMADA DE DADOS — mesma interface para Supabase e para a demonstração
   ===================================================================== */
function criarSupabaseApi(){
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
  const meuId = async () => (await sb.auth.getSession()).data.session?.user.id;
  const perfil = async user => {
    if (!user) return null;
    const { data } = await sb.from('profiles').select('nome,cidade').eq('id', user.id).maybeSingle();
    return { id: user.id, email: user.email, ...(data || {}) };
  };
  const COM_DOADOR = '*, doador:profiles(nome,cidade)';
  return {
    modo: 'supabase',
    async usuario(){ return perfil((await sb.auth.getSession()).data.session?.user); },
    aoMudarAuth(cb){
      // setTimeout evita chamar o Supabase de dentro do callback de auth
      sb.auth.onAuthStateChange((_e, session) => setTimeout(async () => cb(await perfil(session?.user)), 0));
    },
    async cadastrar({ email, senha, nome, cidade }){
      const r = ok(await sb.auth.signUp({ email, password: senha, options: { data: { nome, cidade } } }));
      return { confirmarEmail: !r.session };
    },
    async entrar(email, senha){ ok(await sb.auth.signInWithPassword({ email, password: senha })); },
    async sair(){ await sb.auth.signOut(); },

    async listarAnuncios(f = {}){
      let q = sb.from('anuncios').select(COM_DOADOR).eq('status','disponivel').order('created_at', { ascending:false });
      if (f.especie) q = q.eq('especie', f.especie);
      if (f.cidade)  q = q.eq('cidade', f.cidade);
      if (f.porte)   q = q.eq('porte', f.porte);
      return ok(await q);
    },
    async obterAnuncio(id){ return ok(await sb.from('anuncios').select(COM_DOADOR).eq('id', id).single()); },
    async meusAnuncios(){
      return ok(await sb.from('anuncios').select('*').eq('doador_id', await meuId()).order('created_at', { ascending:false }));
    },
    async criarAnuncio(dados, arquivos){
      const uid = await meuId(); const fotos = [];
      for (const [i, f] of [...arquivos].slice(0, 5).entries()){
        const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
        const caminho = `${uid}/${Date.now()}-${i}.${ext}`;
        ok(await sb.storage.from('fotos-animais').upload(caminho, f, { contentType: f.type }));
        fotos.push(sb.storage.from('fotos-animais').getPublicUrl(caminho).data.publicUrl);
      }
      return ok(await sb.from('anuncios').insert({ ...dados, doador_id: uid, fotos }).select().single());
    },
    async mudarStatus(id, status){ ok(await sb.from('anuncios').update({ status }).eq('id', id)); },

    async abrirConversa(anuncio){
      const uid = await meuId();
      const existe = ok(await sb.from('conversas').select('id').eq('anuncio_id', anuncio.id).eq('interessado_id', uid).maybeSingle());
      if (existe) return existe.id;
      return ok(await sb.from('conversas')
        .insert({ anuncio_id: anuncio.id, doador_id: anuncio.doador_id, interessado_id: uid })
        .select('id').single()).id;
    },
    async listarConversas(){
      const linhas = ok(await sb.from('conversas')
        .select(`*, anuncio:anuncios(id,nome,especie,fotos,status,microchipado),
                 doador:profiles!conversas_doador_id_fkey(nome),
                 interessado:profiles!conversas_interessado_id_fkey(nome),
                 mensagens(texto,created_at)`)
        .order('created_at', { referencedTable:'mensagens', ascending:false })
        .limit(1, { referencedTable:'mensagens' }));
      return linhas.map(c => ({ ...c, ultima: c.mensagens?.[0] || null }))
        .sort((a, b) => new Date(b.ultima?.created_at || b.created_at) - new Date(a.ultima?.created_at || a.created_at));
    },
    async listarMensagens(cid){ return ok(await sb.from('mensagens').select('*').eq('conversa_id', cid).order('created_at')); },
    async enviarMensagem(cid, texto){ ok(await sb.from('mensagens').insert({ conversa_id: cid, autor_id: await meuId(), texto })); },
    assinarMensagens(cid, cb){
      const canal = sb.channel('conversa-' + cid)
        .on('postgres_changes', { event:'INSERT', schema:'public', table:'mensagens', filter:'conversa_id=eq.' + cid }, p => cb(p.new))
        .subscribe();
      return () => sb.removeChannel(canal);
    },
    async concluirAdocao(cid){ return ok(await sb.rpc('concluir_adocao', { p_conversa: cid })); },

    /* ----- Microchipagem ----- */
    async consultarMicrochip(numero){
      const r = ok(await sb.rpc('consultar_microchip', { p_numero: numero }));
      return r?.[0] || null;
    },
    async meusMicrochips(){
      return ok(await sb.from('microchips').select('*, anuncio:anuncios(id,nome)').eq('tutor_id', await meuId()).order('created_at', { ascending:false }));
    },
    async obterMicrochip(id){
      const m = ok(await sb.from('microchips')
        .select('*, anuncio:anuncios(id,nome), eventos:microchip_eventos(*, autor:profiles!microchip_eventos_autor_id_fkey(nome))')
        .eq('id', id).single());
      m.eventos = (m.eventos || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return m;
    },
    async salvarMicrochip(dados, id){
      if (id) return ok(await sb.from('microchips').update(dados).eq('id', id).select().single());
      return ok(await sb.from('microchips').insert({ ...dados, tutor_id: await meuId() }).select().single());
    },
    async mudarSituacaoMicrochip(id, situacao){ ok(await sb.from('microchips').update({ situacao }).eq('id', id)); },
    async excluirMicrochip(id){ ok(await sb.from('microchips').delete().eq('id', id)); },
    async avisarTutor(numero, mensagem){ ok(await sb.rpc('avisar_tutor', { p_numero: numero, p_mensagem: mensagem })); }
  };
}

function criarDemoApi(){
  const novoId = () => crypto.randomUUID ? crypto.randomUUID() : 'id' + Math.random().toString(36).slice(2);
  const atras = dias => new Date(Date.now() - dias * 864e5).toISOString();
  const s = { user:null, ouvintes:[], subs:{}, contas:{}, profiles:{}, conversas:[], mensagens:[] };
  const [marina, nilson, ong] = [
    { id:novoId(), nome:'Marina S.', cidade:'Paranaguá', demo:true },
    { id:novoId(), nome:'Nilson Pereira', cidade:'Guaratuba', demo:true },
    { id:novoId(), nome:'ONG Maré Animal', cidade:'Matinhos', demo:true }
  ];
  [marina, nilson, ong].forEach(p => s.profiles[p.id] = p);
  const base = (doador, a, dias) => ({ id:novoId(), doador_id:doador.id, fotos:[], status:'disponivel', created_at:atras(dias), ...a });
  s.anuncios = [
    base(marina, { nome:'Caramelo', especie:'cachorro', sexo:'macho', idade:'2 anos', porte:'medio', cidade:'Paranaguá', vacinado:true, castrado:true,
      descricao:'Apareceu perto do trapiche da Ilha dos Valadares. Super dócil, se dá bem com crianças e adora correr na areia.' }, 0.2),
    base(ong, { nome:'Maré', especie:'gato', sexo:'femea', idade:'8 meses', porte:'pequeno', cidade:'Matinhos', vacinado:true, castrado:false,
      descricao:'Brincalhona e curiosa. Já usa caixa de areia. A ONG ajuda com a castração depois da adoção.' }, 1),
    base(marina, { nome:'Pipoca', especie:'cachorro', sexo:'femea', idade:'4 meses', porte:'pequeno', cidade:'Pontal do Paraná', vacinado:false, castrado:false,
      descricao:'Filhote resgatada em Shangri-lá. Muito carinhosa, ainda está aprendendo a fazer as necessidades no lugar certo.' }, 2),
    base(nilson, { nome:'Tainha', especie:'gato', sexo:'macho', idade:'3 anos', porte:'pequeno', cidade:'Guaratuba', vacinado:true, castrado:true,
      descricao:'Gato calmo de pescador: dorme o dia todo e pede carinho à noite. Ideal para apartamento.' }, 3),
    base(ong, { nome:'Bento', especie:'cachorro', sexo:'macho', idade:'6 anos', porte:'grande', cidade:'Morretes', vacinado:true, castrado:true,
      descricao:'Grandão tranquilo, ótimo companheiro de caminhada. Precisa de quintal.' }, 5),
    base(nilson, { nome:'Nuvem', especie:'outro', sexo:'femea', idade:'1 ano', porte:'pequeno', cidade:'Antonina', vacinado:false, castrado:false,
      descricao:'Coelha branca, mansa, acostumada a ficar solta em casa. Vai com a gaiola e o comedouro.' }, 7)
  ];
  // Microchips de exemplo — experimente consultar 981020000123456 (animal perdido)
  const chip = (tutor, anuncio, m, dias) => ({ id:novoId(), tutor_id:tutor.id, anuncio_id:anuncio?.id || null, situacao:'ativo',
    created_at:atras(dias), updated_at:atras(dias), ...m });
  const [caramelo, , , tainha, bento] = s.anuncios;
  s.microchips = [
    chip(marina, caramelo, { numero:'981020000456123', nome_animal:'Caramelo', especie:'cachorro', sexo:'macho', pelagem:'Caramelo, peito branco',
      nascimento:'aprox. 2022', cidade:'Paranaguá', data_implante:'2024-09-14', local_implante:'Mutirão de castração — Paranaguá', veterinario:'Dra. Helena R.', crmv:'PR-00000' }, 30),
    chip(ong, bento, { numero:'900164000789456', nome_animal:'Bento', especie:'cachorro', sexo:'macho', pelagem:'Preto com manchas marrons',
      nascimento:'2019', cidade:'Morretes', data_implante:'2023-03-02', local_implante:'ONG Maré Animal' }, 60),
    chip(nilson, tainha, { numero:'076000000654321', nome_animal:'Tainha', especie:'gato', sexo:'macho', pelagem:'Cinza rajado',
      cidade:'Guaratuba', data_implante:'2025-01-20', local_implante:'Clínica do bairro' }, 90),
    chip(nilson, null, { numero:'981020000123456', nome_animal:'Farofa', especie:'cachorro', sexo:'femea', pelagem:'Bege, orelhas pretas, coleira azul',
      cidade:'Guaratuba', data_implante:'2023-11-05', local_implante:'Clínica do bairro', situacao:'perdido' }, 120)
  ];
  s.anuncios.forEach(a => a.microchipado = s.microchips.some(m => m.anuncio_id === a.id));
  s.eventos = s.microchips.flatMap(m => {
    const ev = [{ id:novoId(), microchip_id:m.id, tipo:'cadastro', autor_id:m.tutor_id, created_at:m.created_at }];
    if (m.situacao === 'perdido') ev.push({ id:novoId(), microchip_id:m.id, tipo:'perdido', autor_id:m.tutor_id, created_at:atras(2) });
    return ev;
  });
  const evento = (microchip_id, tipo, extra = {}) => s.eventos.push({ id:novoId(), microchip_id, tipo, autor_id:s.user?.id, created_at:new Date().toISOString(), ...extra });
  const selo = id => { const a = s.anuncios.find(a => a.id === id); if (a) a.microchipado = s.microchips.some(m => m.anuncio_id === id); };
  const limpaNumero = n => String(n || '').replace(/\D/g, '');

  const avisar = () => s.ouvintes.forEach(f => f(s.user));
  const precisa = () => { if (!s.user) throw new Error('Entre na sua conta primeiro.'); };
  const comDoador = a => ({ ...a, doador: s.profiles[a.doador_id] });
  const publicar = m => { s.mensagens.push(m); (s.subs[m.conversa_id] || []).forEach(f => f(m)); };

  return {
    modo: 'demo',
    async usuario(){ return s.user; },
    aoMudarAuth(cb){ s.ouvintes.push(cb); },
    async cadastrar({ email, senha, nome, cidade }){
      if (s.contas[email]) throw new Error('Este e-mail já tem conta.');
      const id = novoId(); s.contas[email] = { id, senha }; s.profiles[id] = { id, nome, cidade };
      s.user = { id, email, nome, cidade }; avisar(); return {};
    },
    async entrar(email, senha){
      const c = s.contas[email];
      if (!c || c.senha !== senha) throw new Error('E-mail ou senha incorretos. No modo demonstração, crie uma conta primeiro.');
      s.user = { email, ...s.profiles[c.id] }; avisar();
    },
    async sair(){ s.user = null; avisar(); },
    async listarAnuncios(f = {}){
      return s.anuncios.filter(a => a.status === 'disponivel'
        && (!f.especie || a.especie === f.especie) && (!f.cidade || a.cidade === f.cidade) && (!f.porte || a.porte === f.porte))
        .sort((a, b) => b.created_at.localeCompare(a.created_at)).map(comDoador);
    },
    async obterAnuncio(id){ const a = s.anuncios.find(a => a.id === id); if (!a) throw new Error('Anúncio não encontrado.'); return comDoador(a); },
    async meusAnuncios(){ precisa(); return s.anuncios.filter(a => a.doador_id === s.user.id).reverse(); },
    async criarAnuncio(dados, arquivos){
      precisa();
      const fotos = await Promise.all([...arquivos].slice(0, 5).map(lerArquivo));
      const a = { id:novoId(), doador_id:s.user.id, ...dados, fotos, status:'disponivel', created_at:new Date().toISOString() };
      s.anuncios.push(a);
      // Demonstração: um interessado fictício chama no chat depois de alguns segundos
      setTimeout(() => {
        const c = { id:novoId(), anuncio_id:a.id, doador_id:a.doador_id, interessado_id:marina.id, created_at:new Date().toISOString() };
        s.conversas.push(c);
        publicar({ id:novoId(), conversa_id:c.id, autor_id:marina.id, created_at:new Date().toISOString(),
          texto:`Olá! Vi o anúncio do(a) ${a.nome} e quero muito adotar. Moro em Paranaguá, tenho quintal murado.` });
        aviso('💬 Nova mensagem de Marina S. sobre ' + a.nome);
      }, 4000);
      return a;
    },
    async mudarStatus(id, status){ precisa(); const a = s.anuncios.find(a => a.id === id && a.doador_id === s.user.id); if (a) a.status = status; },
    async abrirConversa(anuncio){
      precisa();
      let c = s.conversas.find(c => c.anuncio_id === anuncio.id && c.interessado_id === s.user.id);
      if (!c){ c = { id:novoId(), anuncio_id:anuncio.id, doador_id:anuncio.doador_id, interessado_id:s.user.id, created_at:new Date().toISOString() }; s.conversas.push(c); }
      return c.id;
    },
    async listarConversas(){
      precisa();
      return s.conversas.filter(c => c.doador_id === s.user.id || c.interessado_id === s.user.id).map(c => {
        const ms = s.mensagens.filter(m => m.conversa_id === c.id);
        return { ...c, anuncio: s.anuncios.find(a => a.id === c.anuncio_id), doador: s.profiles[c.doador_id], interessado: s.profiles[c.interessado_id], ultima: ms.at(-1) || null };
      }).sort((a, b) => (b.ultima?.created_at || b.created_at).localeCompare(a.ultima?.created_at || a.created_at));
    },
    async listarMensagens(cid){ precisa(); return s.mensagens.filter(m => m.conversa_id === cid); },
    async enviarMensagem(cid, texto){
      precisa();
      publicar({ id:novoId(), conversa_id:cid, autor_id:s.user.id, texto, created_at:new Date().toISOString() });
      // Simula a resposta de um doador fictício, só para a demonstração ter vida
      const c = s.conversas.find(c => c.id === cid); const doador = s.profiles[c.doador_id];
      if (doador.demo && !s.mensagens.some(m => m.conversa_id === cid && m.autor_id === doador.id)){
        const a = s.anuncios.find(a => a.id === c.anuncio_id);
        setTimeout(() => publicar({ id:novoId(), conversa_id:cid, autor_id:doador.id, created_at:new Date().toISOString(),
          texto:`Oi! Que bom que você se interessou pelo(a) ${a.nome} 🐾 Você mora em qual cidade? Podemos marcar uma visita.` }), 1400);
      }
    },
    assinarMensagens(cid, cb){ (s.subs[cid] ||= []).push(cb); return () => { s.subs[cid] = s.subs[cid].filter(f => f !== cb); }; },
    async concluirAdocao(cid){
      precisa();
      const c = s.conversas.find(c => c.id === cid);
      if (!c || c.doador_id !== s.user.id) throw new Error('Só o doador pode concluir esta adoção.');
      s.anuncios.find(a => a.id === c.anuncio_id).status = 'adotado';
      const chips = s.microchips.filter(m => m.anuncio_id === c.anuncio_id && m.tutor_id === s.user.id);
      chips.forEach(m => { m.tutor_id = c.interessado_id; m.anuncio_id = null;
        evento(m.id, 'transferencia', { de_tutor:s.user.id, para_tutor:c.interessado_id, mensagem:'Adoção concluída pelo Patinhas Caiçara' }); });
      selo(c.anuncio_id);
      publicar({ id:novoId(), conversa_id:cid, autor_id:s.user.id, created_at:new Date().toISOString(),
        texto:'🎉 Adoção concluída!' + (chips.length ? ' O microchip agora está no seu nome — confira em "Microchip".' : '') });
      return chips.length;
    },

    /* ----- Microchipagem ----- */
    async consultarMicrochip(numero){
      const m = s.microchips.find(m => m.numero === limpaNumero(numero));
      if (!m) return null;
      return { nome_animal:m.nome_animal, especie:m.especie, sexo:m.sexo, pelagem:m.pelagem, cidade:m.cidade, situacao:m.situacao,
        tutor_nome:(s.profiles[m.tutor_id]?.nome || '').split(' ')[0], data_implante:m.data_implante, anuncio_id:m.anuncio_id,
        id: s.user && m.tutor_id === s.user.id ? m.id : null };
    },
    async meusMicrochips(){
      precisa();
      return s.microchips.filter(m => m.tutor_id === s.user.id)
        .map(m => ({ ...m, anuncio: s.anuncios.find(a => a.id === m.anuncio_id) || null }))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    async obterMicrochip(id){
      precisa();
      const m = s.microchips.find(m => m.id === id && m.tutor_id === s.user.id);
      if (!m) throw new Error('Microchip não encontrado ou não está no seu nome.');
      return { ...m, anuncio: s.anuncios.find(a => a.id === m.anuncio_id) || null,
        eventos: s.eventos.filter(e => e.microchip_id === id).map(e => ({ ...e, autor: s.profiles[e.autor_id] }))
          .sort((a, b) => b.created_at.localeCompare(a.created_at)) };
    },
    async salvarMicrochip(dados, id){
      precisa();
      if (dados.anuncio_id && !s.anuncios.some(a => a.id === dados.anuncio_id && a.doador_id === s.user.id)) throw new Error('Esse anúncio não é seu.');
      if (id){
        const m = s.microchips.find(m => m.id === id && m.tutor_id === s.user.id);
        const antigo = m.anuncio_id; Object.assign(m, dados, { updated_at:new Date().toISOString() });
        evento(id, 'atualizacao'); selo(antigo); selo(m.anuncio_id); return m;
      }
      if (!/^\d{15}$/.test(dados.numero)) throw new Error('O número do microchip deve ter 15 dígitos.');
      if (s.microchips.some(m => m.numero === dados.numero)) throw new Error('Este microchip já está cadastrado.');
      const m = { id:novoId(), situacao:'ativo', ...dados, tutor_id:s.user.id, created_at:new Date().toISOString(), updated_at:new Date().toISOString() };
      s.microchips.push(m); evento(m.id, 'cadastro', { para_tutor:s.user.id }); selo(m.anuncio_id); return m;
    },
    async mudarSituacaoMicrochip(id, situacao){
      precisa();
      const m = s.microchips.find(m => m.id === id && m.tutor_id === s.user.id);
      if (m && m.situacao !== situacao){ m.situacao = situacao; evento(id, situacao === 'ativo' ? 'reencontrado' : situacao); }
    },
    async excluirMicrochip(id){
      precisa();
      const m = s.microchips.find(m => m.id === id && m.tutor_id === s.user.id);
      s.microchips = s.microchips.filter(x => x !== m); if (m) selo(m.anuncio_id);
    },
    async avisarTutor(numero, mensagem){
      precisa();
      const m = s.microchips.find(m => m.numero === limpaNumero(numero));
      if (!m) throw new Error('Microchip não encontrado.');
      if (!mensagem.trim()) throw new Error('Escreva onde e quando você viu o animal.');
      evento(m.id, 'avistado', { mensagem: mensagem.trim().slice(0, 1000) });
    }
  };
}

