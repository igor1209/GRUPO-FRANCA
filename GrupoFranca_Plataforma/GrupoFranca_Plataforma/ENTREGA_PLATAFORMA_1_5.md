# Grupo França · Entrega consolidada da plataforma · 1.5

O WhatsApp de texto já foi conectado e os envios de teste foram validados por você. Esta entrega concentra contatos, importação, funil, acessos e acompanhamento da equipe. A IA de voz, a discagem, a qualificação por voz e as tentativas automáticas ficam para a etapa final.

## Aplicar sem excluir ou extrair pastas

Baixe ATUALIZAR_PLATAFORMA_1_5.ps1 e coloque dentro de GrupoFranca_Plataforma. Feche a plataforma com Ctrl+C no terminal e execute:

```powershell
cd "C:\Users\igorl\OneDrive\Desktop\GrupoFrancaSDR\GrupoFranca_Plataforma"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\ATUALIZAR_PLATAFORMA_1_5.ps1" -PastaProjeto "C:\Users\igorl\OneDrive\Desktop\GrupoFrancaSDR\GrupoFranca_Plataforma"
if ($LASTEXITCODE -eq 0) { .\iniciar.bat }
```

O atualizador verifica os arquivos do pacote, faz backup do código que será substituído e aplica apenas as diferenças. Se houver falha durante a cópia, tenta restaurar os arquivos anteriores e informa qualquer restauração que precise ser feita manualmente. Ele inclui a interface compilada; não é necessário recompilar nem reinstalar o conector de WhatsApp.

A pasta backup_atualizacoes será criada no projeto. O atualizador não substitui o banco de dados, credenciais, contas, contatos, modelos salvos ou sessões de WhatsApp. Na primeira inicialização, o backend executa uma migração aditiva para preservar as etapas atuais do funil e passar a controlá-las manualmente. O backup padrão do SQLite continua sendo criado antes da inicialização.

Pré-requisito: a versão 1.4 do conector precisa estar instalada, como no ambiente em que você validou as mensagens. Se você executou o sistema usando uma pasta de dados personalizada, mantenha GF_SDR_DATA_DIR com o mesmo valor.

O script não foi executado no Windows neste ambiente. A integridade do conteúdo embarcado e a interface compilada foram verificadas; os testes do código foram executados aqui. O pareamento e os envios de texto reais foram validados por você na versão 1.4.

## Contatos e importação

Em Contatos, cadastre nome, empresa, telefone, e-mail, segmento, fonte, origem e etiquetas. O gerente pode escolher o responsável já no cadastro de um novo contato. Para transferir um contato existente, use Equipe → Distribuição.

Cada vendedor cadastra em sua própria carteira. Ele precisa da permissão Cadastrar contatos. A permissão Importar contatos permite importar novos contatos para a própria carteira, independentemente da permissão de cadastro individual.

Importação CSV:

1. Abra Contatos → Importar CSV.
2. Como gerente, escolha o responsável pelos novos contatos.
3. Selecione um CSV UTF-8, com até 700 KB e 500 linhas de dados.
4. Confira o mapeamento das colunas e a prévia de novos, duplicados e inválidos.
5. Se alterar o mapeamento, reanalise o arquivo.
6. Confirme a importação.

O responsável é definido pelo seletor, e não por um nome livre dentro do CSV. Isso mantém a carteira vinculada a uma conta real de usuário. Importações feitas pelo vendedor ficam na carteira dele.

Duplicados por telefone ou e-mail são ignorados sem sobrescrever o cadastro existente. A deduplicação também é conferida na confirmação. Repetir a confirmação do mesmo lote não cria novos contatos nem troca seus responsáveis. Se ocorrer uma falha no processamento, os novos contatos e suas atribuições são revertidos juntos.

O modelo CSV disponibilizado pela tela já tem o cabeçalho Telefone / contato reconhecido automaticamente. Filtros e exportação usam as mesmas etapas comerciais do funil. Segmento, fonte, origem e responsável continuam disponíveis nos filtros.

## Funil comercial

As etapas são Novos, Contatados, Qualificados, Reunião, Proposta, Ganho e Perdido.

O vendedor move os cards por arrastar e soltar ou pelo seletor de etapa de cada contato. O backend exige a permissão Mover oportunidades e verifica se o lead pertence à carteira do vendedor.

A movimentação permanece manual nesta etapa. Enviar ou receber mensagens de WhatsApp não muda o card de coluna. Os registros anteriores já exibidos no funil são preservados na atualização. Contatos bloqueados continuam com o pedido de não contato ativo e não podem ser movidos para contornar esse bloqueio.

Mover um card para Reunião não cria um compromisso na agenda nem envia uma mensagem. A reserva precisa ser registrada na Agenda. Ganho é um registro manual de venda, não uma confirmação automática de recebimento financeiro.

Salvar um motivo com o resultado Em aberto mantém a etapa atual. Reabrir um ganho ou uma perda retorna o contato para Contatados. As mudanças de etapa ficam no registro de atividades.

## Vendedores e permissões

Você continua sendo o único gerente. Em Equipe → Usuários, crie os funcionários, informe o nome, o usuário e uma senha temporária. No primeiro acesso, o funcionário precisa definir uma nova senha.

Para testar o painel de vendedor sem encerrar sua sessão de gerente, abra uma janela privativa do navegador, acesse http://127.0.0.1:8780 e entre com a conta do funcionário.

Permissões disponíveis:

- Cadastrar contatos.
- Editar contatos e acompanhamentos.
- Mover oportunidades no funil.
- Enviar mensagens de WhatsApp.
- Agendar reuniões.
- Importar contatos.
- Executar cadências existentes.

O vendedor acessa os contatos, notas, reuniões e dados comerciais da própria carteira. Ele não administra usuários, não distribui leads e não altera o agente ou as conexões. Alterar permissões, redefinir senha ou desativar uma conta invalida as sessões anteriores.

## Distribuição de leads

Em Equipe → Distribuição, você pode transferir um contato por vez ou selecionar um lote:

1. Use a busca para localizar os contatos.
2. Marque os contatos desejados, até 500 por lote.
3. Escolha o responsável do lote.
4. Clique em Atribuir selecionados.

O seletor do cabeçalho marca os primeiros 500 resultados do filtro, respeitando o limite total. Seleções já feitas podem permanecer ao mudar a busca; confira o contador antes de atribuir. Somente usuários ativos aparecem como destinos.

A operação valida todos os contatos antes de gravar. Se algum item for inválido, nada é transferido. A carteira de acesso é atualizada no backend. Cada transferência é registrada nas atividades do gerente. Repetir a mesma atribuição não duplica o registro de transferência.

## Painel do gerente e indicadores

Equipe → Desempenho apresenta ranking por vendas registradas e contatos trabalhados, carteira atual, reuniões reais, retornos vencidos e meta mensal. Os filtros De e Até definem o período das atividades, vendas e reuniões. Carteira e retornos mostram a situação atual.

Vendas são ganhos manuais ainda ativos na carteira atual da pessoa que os registrou; uma reabertura exclui o ganho dos números. Reuniões são reservas reais registradas, sem confundir uma mudança de coluna com um agendamento. A meta é mensal e deve ser comparada com o mês correspondente. O ranking é um acompanhamento de registros comerciais; não mede tempo de trabalho ou atividades fora da plataforma.

Os dados anteriores deixam de ser exportáveis enquanto um novo período está sendo carregado. Se a consulta falhar, a tela informa o erro e não exporta um relatório antigo como se fosse atual.

Em Análise comercial, acompanhe envios reais, respostas, qualificações registradas, reservas e oportunidades convertidas, com filtros por período e fonte. A qualificação manual do funil passa a contar nos indicadores. Testes de envio não contam como abordagens nem como contatos trabalhados. Falhas e envios sem confirmação de WhatsApp operacionais também entram no total de falhas; os testes ficam excluídos.

As taxas depois da abordagem usam somente os contatos cujo envio foi registrado no período selecionado e os eventos posteriores a esse envio no mesmo período. Uma qualificação sem envio no período pode aparecer no total de qualificados sem entrar nessa taxa. Eventos históricos começam quando o sistema os registrou; a atualização não inventa abordagens ou reuniões passadas.

## Como conferir após atualizar

- Entre como gerente e crie uma conta de vendedor.
- Cadastre um contato atribuído a esse vendedor ou importe um pequeno CSV para a carteira dele.
- Entre como vendedor na janela privativa e confira a carteira.
- Mova o contato no funil e confira a mesma etapa em Contatos.
- Volte ao gerente, transfira o contato para outro responsável e confirme que ele deixa de aparecer para o vendedor anterior após atualizar os dados.
- Confira os filtros e as atividades em Equipe. Testes de WhatsApp não devem aparecer como abordagens.

A aplicação continua local. Acesso por outros computadores e publicação na internet exigem uma etapa de infraestrutura própria.

## Validação desta entrega

105 testes do backend e 25 testes da interface passaram. O build de produção de React/TypeScript passou. Os testes incluem isolamento de carteiras, proibição de atribuição por vendedores, distribuição em lote, rollback da importação e das atribuições, repetição de importação, preservação das etapas anteriores, funil manual, qualificação manual nos indicadores, falhas operacionais do WhatsApp e prevenção de exportação de dados antigos durante a troca de período.

A IA de voz, a discagem e as novas tentativas automáticas permanecem para a etapa final. Não há chamadas simuladas apresentadas como reais.
