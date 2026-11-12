# Patinhas Caiçara 🐾

Site de doação de animais para o litoral do Paraná (Antonina, Guaraqueçaba, Guaratuba, Matinhos, Morretes, Paranaguá e Pontal do Paraná), com chat, cadastro de microchipagem e área de perfil. Tudo guardado no Supabase.

## Estrutura da pasta
```
├── index.html                   página principal
├── css/estilo.css               visual, tema claro/escuro e animações
├── js/
│   ├── config.js                ← URL e chave do Supabase
│   ├── util.js                  rótulos, avatares ilustrados, imagens, tradução de erros
│   ├── sons.js                  efeitos sonoros (Web Audio, sem arquivos)
│   ├── efeitos.js               animações: confete, revelar ao rolar, inclinação 3D, troca de tema
│   ├── dados.js                 acesso ao Supabase (Auth, banco, Storage, Realtime)
│   ├── telas-vitrine.js         início, página do animal, anunciar, perfil público
│   ├── telas-conta.js           entrar, criar conta, recuperar e definir nova senha
│   ├── telas-chat.js            chat em tempo real e conclusão da adoção
│   ├── telas-perfil.js          área de perfil
│   ├── telas-microchip.js       consulta e cadastro de microchip
│   └── app.js                   rotas e inicialização
├── supabase/
│   ├── 01_base.sql              perfis, anúncios, chat, fotos dos animais
│   ├── 02_microchipagem.sql     microchips, histórico, consulta e transferência
│   └── 03_perfil.sql            campos do perfil, privacidade, fotos de perfil, excluir conta
└── .github/workflows/pages.yml  publica o site no GitHub Pages a cada push
```

## Como ligar ao Supabase
1. Crie um projeto em supabase.com.
2. No **SQL Editor**, rode na ordem `01_base.sql`, `02_microchipagem.sql` e `03_perfil.sql`.
3. Em **Project Settings → API**, copie a *Project URL* e a chave *anon/publishable* para `js/config.js`. Essa chave é pública por natureza; quem protege os dados são as regras de segurança (RLS) dos SQLs.
4. Em **Authentication → URL Configuration**, coloque o endereço do site em *Site URL* e em *Redirect URLs*. Sem isso, os links de confirmação de e-mail e de recuperação de senha não voltam para o site.
5. Abra o site por um endereço `http(s)://` (GitHub Pages, Vercel, Netlify ou `npx serve`).

Sem as chaves, o site mostra uma tela explicando esses passos.

## Telas
| Endereço | Tela |
|---|---|
| `#inicio` | Vitrine com busca por nome, filtros, contadores e "como funciona" |
| `#animal-<id>` | Página do animal, doador e botão de conversa |
| `#entrar` | Entrar, criar conta (com medidor de força da senha) e "esqueci minha senha" |
| `#nova-senha` | Definir nova senha pelo link do e-mail |
| `#anunciar` | Anúncio com fotos (arrastar e soltar, até 5, reduzidas automaticamente) |
| `#chat` | Conversas em tempo real; o doador conclui a adoção |
| `#perfil` | Meus dados: nome, cidade, telefone (privado), bio |
| `#perfil-aparencia` | Foto de perfil, avatar ilustrado, tema claro/escuro, sons |
| `#perfil-seguranca` | Alterar senha, sair, excluir conta |
| `#perfil-anuncios` | Mudar situação e excluir anúncios |
| `#usuario-<id>` | Perfil público de quem doa |
| `#microchip` | Consulta pública e meus microchips |

## Área de perfil
- **Foto de perfil**: o site recorta em quadrado e reduz para 512 px antes de enviar ao bucket `avatares`. A foto antiga é apagada.
- **Avatar**: 6 ilustrações do litoral (cachorro, gato, papagaio, tartaruga, caranguejo, peixe), usadas quando não há foto.
- **Tema claro/escuro**: fica salvo no aparelho e no perfil. O tema escuro troca o sol por uma lua com estrelas.
- **Telefone**: só o dono vê. As permissões de coluna do `03_perfil.sql` impedem outros usuários de lerem o telefone, mesmo pela API.
- **Alterar senha**: confere a senha atual antes de trocar.
- **Excluir conta**: pede para digitar EXCLUIR e a senha. Apaga as fotos do Storage e depois chama `excluir_minha_conta()`, que remove o usuário do Auth. Em cascata somem perfil, anúncios, conversas, mensagens e microchips.

## Sons e animações
- Sons gerados no navegador: clique, envio e recebimento de mensagem, sucesso, erro, troca de tema (com "chuá" de onda), festa na adoção, latido e miado. Dá para desligar no topo ou no perfil.
- Animações: título que entra palavra por palavra, ondas do mar em movimento, patinhas subindo no topo, cards com inclinação 3D e brilho, carregamento com esqueleto, confete de patinhas e corações, troca de tema com círculo que se expande, bolhas de chat que "estouram", números contando.
- Quem ativa "reduzir movimento" no sistema recebe a versão sem animações.

## Publicação automática no GitHub Pages
O workflow `.github/workflows/pages.yml` publica o site a cada push na `main`. Para ativar: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Testes
Os três SQLs foram testados num Postgres local: telefone protegido, transferência de microchip só pela adoção e exclusão de conta em cascata. O site foi testado de ponta a ponta num navegador automatizado com um Supabase simulado: cadastro, perfil, foto, avatar, tema, senha, anúncio com fotos, chat, microchip, celular e exclusão de conta.
