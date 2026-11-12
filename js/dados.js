/* =====================================================================
   Camada de dados — Supabase (Auth, Database, Storage, Realtime)
   ===================================================================== */
function criarApi(){
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth:{ flowType:'pkce', persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
  });
  const ok = ({ data, error }) => { if (error) throw new Error(traduzErro(error.message)); return data; };
  const sessao = async () => (await sb.auth.getSession()).data.session;
  const meuId = async () => { const s = await sessao(); if (!s) throw new Error('Entre na sua conta primeiro.'); return s.user.id; };
  const urlDoSite = () => location.origin + location.pathname;

  // colunas públicas do perfil (telefone e tema ficam só em meu_perfil)
  const MINI = 'id,nome,avatar_url,avatar_preset';
  const PUBLICO = 'id,nome,cidade,avatar_url,avatar_preset,bio,created_at';
  const COM_DOADOR = `*, doador:profiles(${PUBLICO})`;

  async function perfil(user){
    if (!user) return null;
    const { data } = await sb.rpc('meu_perfil');
    return { ...(data?.[0] || {}), id:user.id, email:user.email };
  }

  // caminho do arquivo a partir da URL pública do Storage
  const caminhoDe = (bucket, url) => {
    const marca = `/object/public/${bucket}/`, i = url?.indexOf(marca) ?? -1;
    return i >= 0 ? decodeURIComponent(url.slice(i + marca.length).split('?')[0]) : null;
  };
  async function enviarArquivo(bucket, blob, nome){
    const uid = await meuId(), caminho = `${uid}/${nome}`;
    ok(await sb.storage.from(bucket).upload(caminho, blob, { contentType:'image/jpeg', cacheControl:'31536000' }));
    return sb.storage.from(bucket).getPublicUrl(caminho).data.publicUrl;
  }
  async function apagarArquivos(bucket, urls){
    const caminhos = urls.map(u => caminhoDe(bucket, u)).filter(Boolean);
    if (caminhos.length) await sb.storage.from(bucket).remove(caminhos);
  }
  async function esvaziarPasta(bucket, uid){
    const { data } = await sb.storage.from(bucket).list(uid, { limit:1000 });
    if (data?.length) await sb.storage.from(bucket).remove(data.map(f => `${uid}/${f.name}`));
  }
  async function conferirSenha(senha){
    const s = await sessao();
    const r = await sb.auth.signInWithPassword({ email:s.user.email, password:senha });
    if (r.error) throw new Error('Senha atual incorreta.');
  }
  const contar = async q => { const r = await q; if (r.error) throw new Error(traduzErro(r.error.message)); return r.count || 0; };

  return {
    /* ---------- conta ---------- */
    async usuario(){ return perfil((await sessao())?.user); },
    aoMudarAuth(cb){
      // setTimeout: não chamar o Supabase de dentro do callback de autenticação
      sb.auth.onAuthStateChange((evento, s) => setTimeout(async () => cb(evento, await perfil(s?.user)), 0));
    },
    async cadastrar({ email, senha, nome, cidade }){
      const r = ok(await sb.auth.signUp({ email, password:senha, options:{ data:{ nome, cidade }, emailRedirectTo:urlDoSite() } }));
      if (r.session) return { confirmarEmail:false };
      // sem confirmação por e-mail no projeto: entra direto
      const e = await sb.auth.signInWithPassword({ email, password:senha });
      return { confirmarEmail: !!e.error };
    },
    async entrar(email, senha){ ok(await sb.auth.signInWithPassword({ email, password:senha })); },
    async sair(){ await sb.auth.signOut(); },
    async recuperarSenha(email){ ok(await sb.auth.resetPasswordForEmail(email, { redirectTo:urlDoSite() })); },
    async definirNovaSenha(nova){ ok(await sb.auth.updateUser({ password:nova })); },
    async alterarSenha(atual, nova){ await conferirSenha(atual); ok(await sb.auth.updateUser({ password:nova })); },
    async excluirConta(senha){
      await conferirSenha(senha);
      const uid = await meuId();
      await esvaziarPasta('avatares', uid);
      await esvaziarPasta('fotos-animais', uid);
      ok(await sb.rpc('excluir_minha_conta'));
      await sb.auth.signOut();
    },

    /* ---------- perfil ---------- */
    async atualizarPerfil(dados){
      ok(await sb.from('profiles').update(dados).eq('id', await meuId()));
      return this.usuario();
    },
    async enviarFotoPerfil(arquivo){
      const blob = await redimensionar(arquivo, 512, true);
      const antigo = (await this.usuario())?.avatar_url;
      const url = await enviarArquivo('avatares', blob, `foto-${Date.now()}.jpg`);
      ok(await sb.from('profiles').update({ avatar_url:url }).eq('id', await meuId()));
      if (antigo) await apagarArquivos('avatares', [antigo]);
      return this.usuario();
    },
    async removerFotoPerfil(){
      const antigo = (await this.usuario())?.avatar_url;
      ok(await sb.from('profiles').update({ avatar_url:null }).eq('id', await meuId()));
      if (antigo) await apagarArquivos('avatares', [antigo]);
      return this.usuario();
    },
    async perfilPublico(id){
      const p = ok(await sb.from('profiles').select(PUBLICO).eq('id', id).maybeSingle());
      if (!p) throw new Error('Perfil não encontrado.');
      p.anuncios = ok(await sb.from('anuncios').select('*').eq('doador_id', id).eq('status', 'disponivel').order('created_at', { ascending:false }));
      p.adotados = await contar(sb.from('anuncios').select('id', { count:'exact', head:true }).eq('doador_id', id).eq('status', 'adotado'));
      return p;
    },
    async estatisticas(){
      const uid = await meuId();
      const [anuncios, adotados, microchips] = await Promise.all([
        contar(sb.from('anuncios').select('id', { count:'exact', head:true }).eq('doador_id', uid)),
        contar(sb.from('anuncios').select('id', { count:'exact', head:true }).eq('doador_id', uid).eq('status', 'adotado')),
        contar(sb.from('microchips').select('id', { count:'exact', head:true }).eq('tutor_id', uid))
      ]);
      return { anuncios, adotados, microchips };
    },

    /* ---------- anúncios ---------- */
    async numerosVitrine(){
      const [disponiveis, adotados] = await Promise.all([
        contar(sb.from('anuncios').select('id', { count:'exact', head:true }).eq('status', 'disponivel')),
        contar(sb.from('anuncios').select('id', { count:'exact', head:true }).eq('status', 'adotado'))
      ]);
      return { disponiveis, adotados };
    },
    async listarAnuncios(f = {}){
      let q = sb.from('anuncios').select(COM_DOADOR).eq('status', 'disponivel').order('created_at', { ascending:false }).limit(60);
      if (f.especie) q = q.eq('especie', f.especie);
      if (f.cidade)  q = q.eq('cidade', f.cidade);
      if (f.porte)   q = q.eq('porte', f.porte);
      if (f.busca)   q = q.ilike('nome', `%${f.busca.replace(/[%_]/g, '')}%`);
      return ok(await q);
    },
    async obterAnuncio(id){
      const a = ok(await sb.from('anuncios').select(COM_DOADOR).eq('id', id).maybeSingle());
      if (!a) throw new Error('Anúncio não encontrado.');
      return a;
    },
    async meusAnuncios(){
      return ok(await sb.from('anuncios').select('*').eq('doador_id', await meuId()).order('created_at', { ascending:false }));
    },
    async criarAnuncio(dados, arquivos){
      const fotos = [];
      for (const [i, f] of [...arquivos].slice(0, 5).entries())
        fotos.push(await enviarArquivo('fotos-animais', await redimensionar(f, 1280), `${Date.now()}-${i}.jpg`));
      return ok(await sb.from('anuncios').insert({ ...dados, doador_id:await meuId(), fotos }).select().single());
    },
    async mudarStatus(id, status){ ok(await sb.from('anuncios').update({ status }).eq('id', id)); },
    async excluirAnuncio(a){
      ok(await sb.from('anuncios').delete().eq('id', a.id));
      await apagarArquivos('fotos-animais', a.fotos || []);
    },

    /* ---------- chat ---------- */
    async abrirConversa(anuncio){
      const uid = await meuId();
      const existe = ok(await sb.from('conversas').select('id').eq('anuncio_id', anuncio.id).eq('interessado_id', uid).maybeSingle());
      if (existe) return existe.id;
      return ok(await sb.from('conversas').insert({ anuncio_id:anuncio.id, doador_id:anuncio.doador_id, interessado_id:uid }).select('id').single()).id;
    },
    async listarConversas(){
      const linhas = ok(await sb.from('conversas')
        .select(`*, anuncio:anuncios(id,nome,especie,fotos,status,microchipado),
                 doador:profiles!conversas_doador_id_fkey(${MINI}),
                 interessado:profiles!conversas_interessado_id_fkey(${MINI}),
                 mensagens(texto,created_at,autor_id)`)
        .order('created_at', { referencedTable:'mensagens', ascending:false })
        .limit(1, { referencedTable:'mensagens' }));
      return linhas.map(c => ({ ...c, ultima:c.mensagens?.[0] || null }))
        .sort((a, b) => new Date(b.ultima?.created_at || b.created_at) - new Date(a.ultima?.created_at || a.created_at));
    },
    async listarMensagens(cid){ return ok(await sb.from('mensagens').select('*').eq('conversa_id', cid).order('created_at')); },
    async enviarMensagem(cid, texto){ ok(await sb.from('mensagens').insert({ conversa_id:cid, autor_id:await meuId(), texto })); },
    assinarMensagens(cid, cb){
      const canal = sb.channel('conversa-' + cid)
        .on('postgres_changes', { event:'INSERT', schema:'public', table:'mensagens', filter:'conversa_id=eq.' + cid }, p => cb(p.new))
        .subscribe();
      return () => sb.removeChannel(canal);
    },
    async concluirAdocao(cid){ return ok(await sb.rpc('concluir_adocao', { p_conversa:cid })); },

    /* ---------- microchipagem ---------- */
    async consultarMicrochip(numero){ return ok(await sb.rpc('consultar_microchip', { p_numero:numero }))?.[0] || null; },
    async meusMicrochips(){
      return ok(await sb.from('microchips').select('*, anuncio:anuncios(id,nome)').eq('tutor_id', await meuId()).order('created_at', { ascending:false }));
    },
    async obterMicrochip(id){
      const m = ok(await sb.from('microchips')
        .select(`*, anuncio:anuncios(id,nome), eventos:microchip_eventos(*, autor:profiles!microchip_eventos_autor_id_fkey(${MINI}))`)
        .eq('id', id).maybeSingle());
      if (!m) throw new Error('Microchip não encontrado ou não está no seu nome.');
      m.eventos = (m.eventos || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return m;
    },
    async salvarMicrochip(dados, id){
      if (id) return ok(await sb.from('microchips').update(dados).eq('id', id).select().single());
      return ok(await sb.from('microchips').insert({ ...dados, tutor_id:await meuId() }).select().single());
    },
    async mudarSituacaoMicrochip(id, situacao){ ok(await sb.from('microchips').update({ situacao }).eq('id', id)); },
    async excluirMicrochip(id){ ok(await sb.from('microchips').delete().eq('id', id)); },
    async avisarTutor(numero, mensagem){ ok(await sb.rpc('avisar_tutor', { p_numero:numero, p_mensagem:mensagem })); }
  };
}
