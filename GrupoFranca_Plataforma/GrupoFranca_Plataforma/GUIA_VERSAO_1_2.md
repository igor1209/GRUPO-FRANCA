# Grupo França Comercial — versão 1.2

Entrega em React + TypeScript, Python + FastAPI e SQLite. Inclui importação de leads, qualificação, França IA treinável, e-mail SMTP/IMAP, atendimento automático opcional, Google Calendar e indicadores reais.

## Atualizar no Windows

1. Pare o servidor com Ctrl+C.
2. Copie o conteúdo da pasta GrupoFranca_Plataforma do pacote para sua pasta GrupoFrancaSDR, substituindo os arquivos correspondentes.
3. O pacote inclui frontend/dist compilado. Execute iniciar.bat e atualize o navegador com Ctrl+F5.
4. Se estiver copiando os códigos escritos, crie TODOS os arquivos nos caminhos indicados. Na pasta principal, execute:

```powershell
npm.cmd --prefix frontend ci
npm.cmd --prefix frontend run build
.\iniciar.bat
```

Para uma instalação nova, execute configurar.bat e depois iniciar.bat. Requer Python 3.13; para editar o frontend, Node.js 22.12 ou superior. A plataforma abre em http://127.0.0.1:8780.

Os dados permanecem em `%LOCALAPPDATA%\GrupoFrancaSDR\sdr.sqlite3`. O ZIP não contém um banco de substituição. A inicialização faz backup antes de abrir o banco; as migrações adicionam tabelas sem apagar os contatos anteriores. GF_SDR_DATA_DIR permite escolher outro diretório.

## Leads e CSV

Contatos inclui nome, empresa, telefone, e-mail, segmento, fonte, origem, público, responsável, tags e resultado comercial.

- CSV UTF-8 de até 500 registros e 700 KB pela interface.
- Separadores: vírgula, ponto e vírgula ou tabulação.
- Prévia, mapeamento de colunas e motivo de cada linha inválida/duplicada.
- Ao mudar o mapeamento, reanalise antes de confirmar.
- Duplicados por e-mail ou telefone são ignorados. Telefones brasileiros são comparados com e sem prefixo 55.
- Sem telefone/e-mail, empresa e nome iguais também sinalizam repetição. Pessoas diferentes da mesma empresa não são mescladas.
- A confirmação revalida os duplicados. A importação é atômica; confirmar novamente o mesmo lote não duplica os registros.
- Exportação CSV com proteção contra interpretação de fórmulas.

Use os filtros de segmento, fonte, responsável, origem e etapa. O botão Resultado marca aberto, convertido ou perdido, com contexto.

## França IA própria

É um motor local composto por um classificador Naive Bayes treinável, regras comerciais, busca lexical em respostas aprovadas e um planejador de conversa. Não precisa de API paga para funcionar. Os exemplos adicionais, as versões e a base ficam no banco local.

Não é um LLM fundacional treinado do zero nem um equivalente ao ChatGPT. As respostas são controladas. A busca lexical pode não reconhecer sinônimos; sem correspondência suficiente na base, encaminha a dúvida ao Igor. Não aprende automaticamente com mensagens recebidas.

Fluxo: apresentação → relato literal → objetivo → prazo → convite → disponibilidade → confirmação de reserva de 30 minutos. Pedidos de humano pausam a SDR. Pedidos de não contato bloqueiam envios e encerram cadências. Não inventa orçamento ou autoridade de decisão; o indicador de qualificação significa que relato, objetivo e prazo foram registrados.

Na tela França IA, teste uma mensagem, selecione sua intenção correta, aprove o exemplo e clique em Treinar e publicar versão. Cadastre perguntas/palavras-chave e respostas aprovadas. É possível exportar exemplos e base em JSON.

O pequeno conjunto de verificações fixas não mede desempenho representativo em clientes reais. A pontuação de interpretação é relativa, não uma probabilidade calibrada de acerto. Os textos de abordagem ficam em Configurações; as respostas deste motor ficam na tela França IA. A base em Configurações continua disponível para os adaptadores OpenAI/Ollama.

## Simulação e operação real

Conversas mantém histórico, resumo e notas com rolagem independente. Simulações não entram nos indicadores de atividade real.

Antes de levar um contato já usado em testes para o atendimento real, selecione-o em Integrações e clique em Usar contato na operação real. A confirmação reinicia relato, objetivo, prazo e reservas de teste, preservando mensagens e notas. O simulador fica desativado para esse contato. Contatos com atividade real de e-mail também não podem ser alterados pelo simulador.

## E-mail real

Em Integrações > Configurar conexões, informe os dados fornecidos pelo seu serviço de e-mail:

| Campo | Uso |
| --- | --- |
| Servidor SMTP | Envio |
| Porta SMTP | 465 com SSL ou 587 com STARTTLS |
| Usuário | Conta autenticada |
| Remetente | E-mail utilizado no From |
| Senha de aplicativo | Credencial aceita pelo provedor |
| Servidor IMAP | Recebimento |
| Porta IMAP | Normalmente 993 com SSL |
| Pasta IMAP | Normalmente INBOX |

Aplique nesta sessão e teste SMTP/IMAP. O teste autentica a conexão, sem enviar e-mail de teste. Serviços que não aceitam SMTP/IMAP com senha de aplicativo precisam de outro adaptador de autenticação; OAuth de e-mail não está implementado.

Os segredos ficam na memória do servidor, não no SQLite nem no código entregue. Depois de reiniciar, informe novamente ou use variáveis de ambiente. Limpar a sessão não remove valores definidos no ambiente do sistema.

A primeira leitura marca o ponto inicial da caixa, sem importar o histórico antigo. As seguintes buscam até 50 mensagens novas, sem marcá-las como lidas. Mudanças de UIDVALIDITY reiniciam esse ponto com aviso, evitando reimportar a caixa inteira.

Por padrão, entram apenas remetentes cadastrados. A opção Cadastrar remetentes novos como leads inbound amplia esse recebimento. E-mails automáticos, anexos e mensagens acima de 2 MB são ignorados. Corpos são limitados a 16 mil caracteres. A remoção do histórico citado é heurística; confira e-mails com formatação incomum.

### Assistido

Selecione o contato, escreva manualmente ou prepare com França IA, revise destinatário/conteúdo e confirme o envio. Enviar manualmente pausa a SDR do contato. Mensagens novas invalidam rascunhos anteriores; mudança de endereço impede enviar ao destinatário antigo.

Aceito pelo SMTP não comprova entrega nem leitura. Falhas conhecidas permitem correção e nova tentativa. Envios incertos não são repetidos automaticamente: confira a mensagem na conta do remetente e reconcilie o resultado no painel. Bounces automáticos não são usados para inferir entrega.

### Automático opcional

Vem desligado e não permanece ativado após reiniciar o servidor. Teste SMTP e IMAP, escolha o limite diário de 1 a 500 tentativas e confirme a ativação.

- Consulta o IMAP aproximadamente a cada minuto.
- Responde somente mensagens recebidas, sem disparar listas importadas.
- Processa até dez respostas por ciclo, após concluir eventual fila de recebimentos.
- O limite inclui falhas e tentativas manuais do mesmo dia.
- Não responde novamente uma mensagem já atendida manualmente ou pela IA.
- Não envia para contatos pausados/bloqueados ou com rascunhos, falhas e envios incertos pendentes.
- Pausar interrompe novas respostas; um envio em andamento pode terminar.
- A sincronização automática da agenda é uma opção separada, que exige Google testado e pode enviar convites/cancelamentos.

O servidor iniciado por iniciar.bat precisa permanecer aberto e com internet. Fechar somente a aba não encerra o servidor; fechar o servidor encerra a automação. A interface atualiza os dados periodicamente enquanto o modo automático está ativo. As abordagens iniciais outbound permanecem assistidas.

## Google Calendar

1. No seu projeto Google Cloud, habilite a Calendar API.
2. Configure o consentimento OAuth e sua conta como usuário de teste, se o aplicativo estiver em teste.
3. Crie um cliente OAuth do tipo Aplicativo da Web.
4. Cadastre este retorno autorizado, exatamente:

```text
http://127.0.0.1:8780/oauth/google/callback
```

5. Na plataforma, informe Client ID e Client secret. Use primary para a agenda principal ou informe o ID da agenda comercial autorizada.
6. Aplique na sessão, prepare a autorização e abra Autorizar Google Calendar.
7. Autorize no Google, volte à plataforma, atualize os dados e teste a conexão GOOGLE.

O retorno usa state de uso único, válido por dez minutos. O refresh token fica na sessão ou pode ser fornecido pelo ambiente. O fluxo local não requer webhook público.

Em Agenda, consulte os horários, confirme a reserva local e use Sincronizar e enviar convites. Reagendamentos e cancelamentos possuem status separado. Ler alterações do Google reflete mudanças/cancelamentos dos eventos criados por esta instalação.

Reservas de teste não são sincronizadas. Falhas de consulta externa não são tratadas como horário livre. A agenda pode mudar entre a consulta e a sincronização; confira os status. A reconciliação aceita reuniões de 30 minutos dentro das regras comerciais e informa alterações externas incompatíveis.

Uma confirmação recebida pode registrar a reserva local antes do e-mail de confirmação. Se esse envio falhar, a reserva permanece visível para cancelamento ou sincronização pelo operador.

## Indicadores reais

Análise comercial usa eventos persistidos, sem o corte de 2.000 mensagens do histórico visual. Filtra datas inclusivas e a fonte registrada no momento de cada evento. Conta contatos com envio, recebimento, qualificação, reunião reservada e conversão, além do volume diário e falhas/incertezas pendentes.

Os cartões contam contatos únicos com cada atividade no período. A conversão usa contatos com envio real no período e eventos posteriores a esse envio, até a data final. Respostas anteriores ao envio não aumentam a conversão.

Os registros começam nesta versão. Testes antigos não são convertidos em resultados reais. Reserva não é reunião realizada; convertido é uma marcação operacional, não comprovação de receita. A Visão geral mantém um panorama combinado identificado como tal; Análise comercial contém os números exclusivamente reais.

## Variáveis de ambiente opcionais

```text
GF_SMTP_HOST
GF_SMTP_PORT
GF_MAIL_USER
GF_MAIL_PASSWORD
GF_MAIL_FROM
GF_IMAP_HOST
GF_IMAP_PORT
GF_IMAP_FOLDER
GF_MAIL_NEW_SENDERS
GF_GOOGLE_CLIENT_ID
GF_GOOGLE_CLIENT_SECRET
GF_GOOGLE_REFRESH_TOKEN
GF_GOOGLE_CALENDAR_ID
```

GF_MAIL_NEW_SENDERS=1 aceita remetentes novos. Não há credenciais reais preenchidas no pacote.

## Arquivos

CODIGOS_COMPLETOS_1_2.md contém os códigos completos, por caminho, incluindo testes. Imagens/fontes binárias e o lockfile de dependências estão no ZIP.

- backend/commercial.py: importação, migrações, operação real, agenda, indicadores e atendimento automático.
- backend/connectors.py: SMTP, IMAP, OAuth e Google Calendar.
- backend/franca_ai.py: modelo próprio, exemplos e planejador comercial.
- frontend/src/Platform.tsx: telas novas e ampliadas.
- frontend/src/Chat.tsx: histórico e simulador com rolagem independente.
- frontend/src/App.tsx: navegação e atualização de dados.

O tema escuro, a logo e o favicon permanecem. WhatsApp e telefonia não foram conectados: o canal real desta entrega é e-mail. A plataforma segue local e de operador único, sem login multiusuário.

## Validação

72 testes Python, 13 testes React, TypeScript e build Vite passaram. Cobrem compatibilidade do banco, backup, importação atômica, duplicados, treino/qualificação, bloqueio, envio incerto, OAuth, agenda, métricas e ativação/limite/pausa do modo automático.

Os conectores foram testados com respostas simuladas; a autenticação e a entregabilidade precisam ser verificadas nas suas contas. Nenhum e-mail ou evento real foi enviado/criado durante o desenvolvimento. Os arquivos BAT e o aspecto visual em navegador Windows precisam ser conferidos no computador de uso.

```powershell
.venv\Scripts\python.exe -m pip install httpx
.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run build
```

## Referências técnicas

- https://docs.python.org/3/library/smtplib.html
- https://docs.python.org/3/library/imaplib.html
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.google.com/workspace/calendar/api/v3/reference/events
- https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- https://developers.google.com/workspace/calendar/api/v3/reference/events/patch
- https://developers.google.com/workspace/calendar/api/v3/reference/events/delete
