# Patinhas Caiçara 🐾

Site de doação de animais para o litoral do Paraná (Antonina, Guaraqueçaba, Guaratuba, Matinhos, Morretes, Paranaguá e Pontal do Paraná), com cadastro de microchipagem.

## Estrutura da pasta
```
patinhas-caicara/
├── index.html                  página principal (abre direto no navegador)
├── css/
│   └── estilo.css              visual do site
├── js/
│   ├── config.js               ← coloque aqui a URL e a chave do Supabase
│   ├── util.js                 cidades, rótulos e funções auxiliares
│   ├── dados.js                acesso ao Supabase + modo demonstração
│   └── app.js                  telas e rotas
├── supabase/
│   ├── 01_base.sql             perfis, anúncios, chat, fotos
│   └── 02_microchipagem.sql    microchips, histórico, consulta e transferência
└── README.md
```

## Telas
| Endereço | Tela |
|---|---|
| `#inicio` | Vitrine com filtros (espécie, cidade, porte) e selo "Microchipado" |
| `#animal-<id>` | Página do animal e botão para conversar com o doador |
| `#entrar` | Login e cadastro |
| `#anunciar` | Formulário de doação com até 5 fotos |
| `#chat` | Conversas em tempo real; o doador tem o botão **Concluir adoção** |
| `#perfil` | Meus anúncios (disponível / reservado / adotado) |
| `#microchip` | **Consulta pública** pelo número do chip + meus animais microchipados |
| `#microchip-novo` | Cadastro de microchip (pode vincular a um anúncio) |
| `#microchip-<id>` | Ficha, situação (ativo / perdido / falecido) e histórico |

## Como ligar ao Supabase
1. Crie um projeto em supabase.com.
2. No **SQL Editor**, rode `supabase/01_base.sql` e depois `supabase/02_microchipagem.sql`.
3. Em **Project Settings → API**, copie a *Project URL* e a chave *anon/publishable* para `js/config.js`.
4. (Opcional, para testar rápido) Em **Authentication → Providers → Email**, desligue "Confirm email".
5. Publique a pasta inteira em uma hospedagem estática (Vercel, Netlify, GitHub Pages) ou rode localmente com `npx serve`.

Sem as chaves, o site roda em **modo demonstração**: animais e microchips de exemplo, dados só na memória da aba. Experimente consultar o microchip `981020000123456` (animal perdido).

## Banco de dados
| Tabela | Para quê |
|---|---|
| `profiles` | Nome e cidade de cada usuário (criado automaticamente no cadastro) |
| `anuncios` | Animal em doação: espécie, sexo, idade, porte, cidade, vacinado/castrado, fotos, status, `microchipado` |
| `conversas` | Uma por anúncio e interessado; só os dois participantes enxergam |
| `mensagens` | Mensagens do chat (Realtime ligado) |
| `microchips` | Número (15 dígitos, único), tutor atual, dados do animal, implante (data, local, veterinário, CRMV), situação |
| `microchip_eventos` | Histórico: cadastro, atualização, perdido, reencontrado, falecido, avistado, transferência |

### Regras da microchipagem
- **Consulta pública** (`consultar_microchip`): qualquer pessoa, mesmo sem login, digita o número e vê só o necessário para devolver o animal: nome, espécie, pelagem, cidade, situação e o primeiro nome do tutor. Nada de e-mail ou telefone.
- **Avisar o tutor** (`avisar_tutor`): quem encontrou o animal, logado, deixa um recado que aparece no histórico do chip.
- **Só o tutor atual** vê e edita o cadastro completo. O número do chip não pode ser alterado depois de cadastrado.
- **Transferência só na adoção** (`concluir_adocao`): no chat, o doador clica em *Concluir adoção*. O anúncio vira "adotado", os microchips vinculados passam para o adotante e a transferência fica registrada no histórico. Não dá para transferir o chip por edição direta.
- O selo "Microchipado" do anúncio é atualizado sozinho por gatilho.

Os dois SQLs foram testados num Postgres local com as políticas de segurança: transferência direta bloqueada, número imutável e consulta pública restrita.

## Próximos passos sugeridos
- Notificar o tutor por e-mail quando alguém avisar que viu o animal perdido
- Papel de "clínica parceira" para cadastrar chips implantados em mutirões
- Página pública de animais perdidos do litoral
- Termo de adoção responsável antes de concluir a adoção
- Contador de mensagens não lidas (a coluna `lida` já existe)
