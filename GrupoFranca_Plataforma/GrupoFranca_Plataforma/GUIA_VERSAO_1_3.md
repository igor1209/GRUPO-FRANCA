# Grupo França Comercial — versão 1.3

## O que foi entregue

- Interface preta, logo vetorial branca com fundo preto, favicon preto e logo menor no menu.
- Ícones de traço fino da biblioteca Lucide; sem marcas ou arquivos da PitchYes.
- Remoção de “Workspace”, do banner de apresentação e de informações secundárias no dashboard.
- Menu operacional com visão geral, análise comercial, funil, contatos, conversas, e-mails, agenda e histórico.
- Igor França como único gerente; os demais usuários são funcionários com permissões individuais.
- Cadastro, desativação, redefinição de senha temporária, permissões e meta mensal dos funcionários.
- Troca obrigatória da senha temporária no primeiro acesso; alteração da própria senha pelo ícone da chave.
- Carteira individual: vendedor consulta e opera somente os leads atribuídos a ele.
- Painel gerencial com ranking, vendas registradas, contatos trabalhados, reuniões reais, retornos vencidos e atividades.
- Distribuição e transferência de leads pelo gerente.
- Funil com arrastar e soltar e seletor acessível de etapa em cada cartão.
- Agente comercial padrão do Grupo França, configurável somente pelo gerente.
- Recursos anteriores de CSV, e-mail, agenda, bloqueios, histórico e IA preservados.

## Instalar sem misturar com os arquivos antigos

1. Feche a janela do servidor antigo.
2. Extraia o ZIP em uma pasta nova. Abra a pasta **GrupoFranca_Plataforma** dentro do conteúdo extraído.
3. Nessa pasta devem existir `configurar.bat`, `iniciar.bat`, `backend` e `frontend`.
4. Abra um terminal nessa pasta e execute, um comando de cada vez:

```powershell
.\configurar.bat
.\iniciar.bat
```

A interface compilada já acompanha o pacote. Node.js não é necessário para somente abrir o app. Python 3.13 e acesso à internet são necessários para instalar as dependências do servidor na primeira configuração.

O navegador abre em **http://127.0.0.1:8780**. Mantenha a janela do servidor aberta.

Se o PowerShell não encontrar os arquivos, confira a pasta atual com `Get-ChildItem`. Não execute os comandos dentro de `frontend`.

## Primeiro acesso

1. Na primeira abertura, defina sua senha de gerente, com pelo menos 10 caracteres.
2. Seu usuário é **igor**. Não há uma senha padrão incluída no pacote.
3. O sistema mantém somente uma conta de gerente: Igor França.
4. Os contatos antigos são atribuídos inicialmente a você.
5. Em **Equipe → Usuários**, crie os funcionários e defina as permissões.
6. Entregue a senha temporária individualmente ao respectivo funcionário. Ele deverá substituí-la no primeiro acesso.
7. Em **Equipe → Distribuição**, atribua os leads a cada pessoa.

As sessões duram até 12 horas. Sair, trocar a senha ou redefinir o acesso revoga as sessões correspondentes. Alterar permissões ou desativar um usuário também o desconecta. Após várias tentativas incorretas, o login aguarda 15 minutos.

## Dados e atualização

O banco continua em `%LOCALAPPDATA%\GrupoFrancaSDR\sdr.sqlite3`, salvo se você já definiu `GF_SDR_DATA_DIR` para outro local. Não apague essa pasta. Extraindo o projeto em outra pasta no mesmo computador e no mesmo usuário do Windows, os dados anteriores continuam disponíveis.

Antes das migrações, a inicialização cria uma cópia em `%LOCALAPPDATA%\GrupoFrancaSDR\backups`. As novas tabelas de usuários, carteiras, etapas e auditoria são adicionadas ao banco existente.

Não copie `node_modules`, `.venv` ou a pasta `dist` antiga por cima desta versão.

## Funcionários e permissões

Todo funcionário visualiza apenas sua carteira. As permissões controlam as operações:

| Permissão | Operação |
| --- | --- |
| Cadastrar contatos | Criar leads na própria carteira |
| Editar contatos | Alterar cadastro, notas, retornos e incluir em Não contatar |
| Mover oportunidades | Mudar etapas e registrar ganhos ou perdas |
| Atender conversas e e-mails | Operar o simulador, assumir o atendimento e preparar/enviar e-mails |
| Agendar reuniões | Consultar horários e reservar/cancelar reuniões dos próprios contatos |
| Importar contatos | Importar CSV para a própria carteira |
| Executar cadências | Atribuir, concluir e cancelar etapas de fluxos criados pelo gerente |

Criar usuários, transferir leads, editar o agente, treinar a IA, cadastrar credenciais, ligar o atendimento automático e sincronizar convites da agenda são ações do gerente. As restrições são verificadas no servidor, incluindo acesso direto por ID e por identificadores de mensagens e importações.

Dados já visualizados por alguém não podem ser retirados de arquivos que essa pessoa tenha exportado anteriormente.

## Funil comercial

As etapas são **Novos → Contatados → Qualificados → Reunião → Proposta → Ganho / Perdido**.

- Arraste o cartão para outra coluna ou use o seletor abaixo dele. As mudanças persistem no banco e registram autor, data e etapas anterior/nova.
- A movimentação manual não envia mensagens, não cria reuniões e não altera o raciocínio da IA.
- Mover para Ganho registra uma venda informada pelo operador; não representa confirmação de pagamento ou contrato pelo sistema.
- Reabrir um ganho retira esse lead dos ganhos ativos considerados nos indicadores.
- Bloqueios de Não contatar impedem a movimentação e novos contatos. Mover uma oportunidade nunca remove esse bloqueio.
- Sem movimentação manual, a etapa pode refletir eventos reais de envio, qualificação e reserva. Rascunhos de abertura e mensagens do simulador não avançam o funil automaticamente.
- Depois de uma movimentação manual, a etapa escolhida tem prioridade. Revise-a conforme a negociação evoluir.
- A reserva com data e hora continua sendo realizada em **Agenda**. O rótulo Reunião no funil não substitui essa reserva.

## Indicadores gerenciais

Em **Equipe → Desempenho**, selecione o período. O ranking ordena vendas registradas e, em seguida, contatos trabalhados. Não há monitoramento do computador ou medição de horas trabalhadas.

- **Vendas:** ganhos manuais ainda ativos, na carteira atual de quem os registrou, com registro no período. Transferências de carteira podem alterar a atribuição exibida. Ganhos antigos sem auditoria desta versão continuam na visão geral, mas não recebem autoria histórica inventada no ranking.
- **Trabalhados:** contatos distintos com atividade manual registrada pela pessoa no período. Testes do simulador e transferências de carteira são excluídos deste número.
- **Reuniões reais:** eventos de reserva operacional no período, vinculados à carteira atual. Reservas de teste e a simples mudança de coluna não entram.
- **Carteira e retornos vencidos:** situação atual, independentemente do filtro histórico.
- **Meta mensal:** referência cadastrada por você; compare com um mês completo. Não é um cálculo de metas proporcional a qualquer intervalo escolhido.
- **Atividades:** até 100 registros recentes no período, com identificação de testes e ações administrativas. Mensagens completas continuam no histórico do contato.

Esses indicadores descrevem registros da plataforma; não substituem a análise do trabalho realizado fora dela. Reuniões reservadas não equivalem a comparecimento. Vendas informadas não equivalem a receita recebida.

## Agente padrão

Em **Configurações → Agente comercial**, você ajusta a apresentação, recepção, pergunta sobre a necessidade, convite e horário de atendimento. O motor selecionado na operação é **França IA**, igual para todos.

Fluxo: apresentar o Grupo França → compreender a necessidade → registrar objetivo e prazo → qualificar o interesse → propor reunião com Igor → confirmar disponibilidade → reservar → registrar resumo. Pedidos de encerramento e atendimento humano têm prioridade.

A base e os exemplos aprovados ficam em **Base de conhecimento e ajustes avançados**. O vendedor não altera o agente. O modelo próprio existente é um classificador local de intenções com respostas aprovadas e regras de negócio; não é um modelo de linguagem generativo treinado do zero.

## Canais e agenda

A versão mantém o envio/recebimento real por **e-mail**, mediante configuração SMTP/IMAP, e a integração com **Google Calendar**, mediante credenciais e autorização. Veja `GUIA_VERSAO_1_2.md` para os detalhes dos adaptadores já existentes; onde ele mencionar menus antigos, use agora **Configurações → Conexões**. Os vendedores trabalham em **E-mails** e em **Agenda**.

O atendimento automático continua desligado a cada reinicialização e depende de autenticação/testes das conexões pelo gerente. Credenciais externas continuam somente na memória do servidor. A agenda compartilhada é a agenda comercial autorizada por Igor.

**WhatsApp e ligações não foram conectados nesta versão.** Os prints da PitchYes serviram de referência visual e operacional. Nenhuma tela desta entrega apresenta uma conexão fictícia com esses serviços.

A tela Conversas preserva o simulador e o histórico; os avisos distinguem testes de mensagens enviadas. Para responder por e-mail, use E-mails. Reservas reais devem ser feitas em Agenda.

## Uso em vários computadores

O pacote continua iniciando em **localhost**. Os perfis e as restrições já estão implementados, mas os outros computadores ainda não acessarão este servidor por esse endereço.

Para uso simultâneo da equipe, será necessário implantar uma única instância do servidor em rede ou hospedagem, com HTTPS, endereço próprio, configuração de origens/hosts, rotina de backup e acesso ao mesmo banco. Essa implantação não foi realizada nesta entrega. Não compartilhe o SQLite pelo OneDrive para simular um servidor. SQLite é adequado para o piloto local; o crescimento da operação pode exigir PostgreSQL.

## Editar o código

Para editar e recompilar a interface, instale Node.js 22.12 ou superior. Na pasta principal:

```powershell
npm.cmd --prefix frontend ci
npm.cmd --prefix frontend run build
.\iniciar.bat
```

Também é possível executar `reconstruir_interface.bat`. Os arquivos ficam em `frontend/src`; a API e as regras ficam em `backend`.

Arquivos centrais desta versão: `backend/team.py`, `backend/main.py`, `frontend/src/Access.tsx`, `frontend/src/Workplace.tsx`, `frontend/src/App.tsx` e `frontend/src/workplace.css`.

O arquivo `CODIGOS_COMPLETOS_1_3.md` reúne o código completo por escrito, organizado por caminho.

## Verificações realizadas

- Suíte Python com 84 testes: API, migração, IA, importação, e-mail, agenda e acessos.
- Depois dos últimos ajustes de funil e métricas, reexecução de 13 testes de equipe e indicadores.
- 18 testes da interface: navegação, login inicial, confirmação de senhas, importação, envio revisado, agenda, notas/rolagem do chat, permissões e movimentação do funil por seletor e arrastar.
- Compilação TypeScript e Vite.
- Inspeção visual no navegador das telas principais, usando dados fictícios isolados. Essa prévia visual não substitui os testes da API autenticada, executados separadamente.

Não foram enviados e-mails a pessoas, criados eventos em contas reais nem executados os arquivos BAT em Windows neste ambiente.

Referências técnicas: documentação oficial de `hashlib` do Python e recomendações da OWASP sobre autorização em cada requisição.
