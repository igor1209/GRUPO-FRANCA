# Grupo França · Integração WhatsApp por QR Code · 1.4

## Atualizar sua instalação

1. Encerre a plataforma no terminal com Ctrl+C.
2. Extraia o ZIP e copie o conteúdo da pasta GrupoFranca_Plataforma para a pasta de mesmo nome que você já utiliza, substituindo os arquivos de código.
3. Abra um NOVO PowerShell depois de instalar/atualizar o Node.js, se necessário. O conector exige Node.js 22.12 ou superior. O Python e sua instalação anterior continuam sendo utilizados.
4. Execute:

```powershell
cd "C:\Users\igorl\OneDrive\Desktop\GrupoFrancaSDR\GrupoFranca_Plataforma"
.\configurar_whatsapp.bat
.\iniciar.bat
```

O primeiro comando instala as dependências e baixa o Chromium. O ZIP já inclui a interface React compilada: não é necessário recompilar para usar esta versão.

Não apague a pasta de dados. Contas, senhas, contatos e oportunidades continuam em %LOCALAPPDATA%\GrupoFrancaSDR, salvo se você configurou GF_SDR_DATA_DIR. A aplicação faz um backup do SQLite ao iniciar. As sessões de WhatsApp ficam em whatsapp_sessions dentro da mesma pasta de dados; elas são privadas e não devem ser compartilhadas.

Para uma instalação nova, execute configurar.bat antes de configurar_whatsapp.bat.

## Conectar um número

Entre como gerente → WhatsApp → Adicionar conexão. Informe um nome, como Comercial · Recife, e selecione o responsável. Clique em Conectar / gerar QR Code.

No celular: WhatsApp → Configurações → Dispositivos conectados → Conectar dispositivo. Escaneie o QR Code exibido. Aguarde o status Conectado e confira o número mostrado.

Cada conexão tem sessão própria. Não existe um número fixo no código. O gerente pode adicionar até 10 conexões locais e alterar o responsável. Um mesmo número não pode ficar conectado simultaneamente em dois registros deste conector.

O QR é atualizado pelo serviço. Se a sessão falhar, desconecte e conecte novamente. Durante a inicialização ou autenticação, aguarde o carregamento. Caso necessário, também é possível encerrar o vínculo pelo menu Dispositivos conectados no próprio celular.

Fechar a plataforma preserva a sessão para a próxima inicialização; Desconectar encerra o vínculo. O computador que executa a plataforma precisa permanecer ligado, com internet e com o aplicativo aberto para manter o conector ativo.

## Permissões

- O gerente cria, conecta, desconecta, atribui conexões e edita os quatro modelos.
- Cada vendedor vê somente as conexões vinculadas a ele e os contatos da sua carteira.
- O vendedor precisa da permissão Enviar mensagens de WhatsApp para enviar.
- Uma conexão vinculada a um vendedor só pode enviar para a carteira desse vendedor, inclusive quando o gerente opera a conexão.
- Somente o gerente acessa o QR Code e altera os textos padrão.
- Os controles de acesso são aplicados no backend, além dos botões da interface.

A aplicação continua local, em http://127.0.0.1:8780. Esta versão não publica a plataforma na internet nem habilita acesso de outros computadores.

## Configurar e testar os quatro modelos

Na conexão, abra Mensagens e escolha Confirmação, Agendamento, Qualificação ou Retorno.

Variáveis disponíveis:

| Variável | Valor utilizado |
| --- | --- |
| {{nome_contato}} | Nome do contato cadastrado |
| {{empresa_contato}} | Empresa do contato cadastrado |
| {{empresa}} | Grupo França |
| {{agente}} | França IA |

Clique nos botões de variável para inserir o código correto. Salve a mensagem. Se um dado obrigatório estiver vazio, o envio é bloqueado para evitar nomes vazios.

Cadastre o contato de teste em Contatos, com nome e telefone. Para números brasileiros, informe DDD e número; para outros países, informe +DDI e número. O destino precisa ser diferente do número conectado. Selecione o contato na conexão, escolha Teste, clique em Revisar envio, confira o destinatário e o texto e então confirme o envio.

O teste envia uma mensagem real, mas não registra abordagem comercial nem contato trabalhado nas métricas. A opção Atendimento registra a abordagem após a confirmação do conector. Não há disparo em massa.

O painel registra o status dos envios e, quando o WhatsApp fornece essa informação, a confirmação de servidor, entrega ou leitura. Uma mensagem enviada não significa automaticamente entregue ou lida. Em caso de timeout, o status fica Sem confirmação: confira no WhatsApp antes de fazer um novo envio. O mesmo identificador não é enviado de novo automaticamente.

## O que esta versão faz

- Conecta números reais por QR Code com sessões separadas e persistentes.
- Mostra o estado real da conexão e o número autenticado.
- Salva os quatro modelos por conexão e substitui variáveis usando o cadastro do contato.
- Envia textos após revisão e confirmação, com registro do resultado e proteção contra duplicidade do mesmo pedido.
- Registra metadados de respostas recentes de contatos conhecidos da carteira, sem copiar o texto das conversas para o painel. Grupos, status e contatos desconhecidos são ignorados.
- Mantém as conversas no aplicativo WhatsApp, sem criar uma caixa de conversa interna.

## Limites desta entrega

A integração da IA com respostas automáticas e os gatilhos após ligações ainda não estão ativados. A aba Assistente informa isso expressamente. Os modelos são enviados pela ação de revisão e confirmação. O sistema não simula ligações nem confirma agendamentos inexistentes.

O agente padrão e seu conhecimento continuam na plataforma. A conexão do canal não transforma o agente em um modelo treinado do zero.

O conector usa whatsapp-web.js, uma biblioteca não oficial baseada no WhatsApp Web. Pode haver mudanças de compatibilidade, desconexões ou bloqueio do número. Esta implementação não utiliza a API oficial da Meta.

Não houve autenticação de uma conta real nem envio para um telefone real neste ambiente. A instalação do Chromium e o pareamento precisam ser validados no seu Windows. A comunicação Python/Node foi executada com o conector instalado, sem iniciar uma sessão de WhatsApp.

## Validação técnica

- 96 testes backend passaram na verificação completa; após o ajuste final das métricas de teste, os 25 testes de equipe e WhatsApp passaram, incluindo o novo teste de autenticação HTTP.
- 20 testes da interface passaram.
- 9 testes do ciclo de vida do conector passaram, cobrindo separação de sessões, QR, cancelamento, conta duplicada, metadados e falhas de envio.
- TypeScript e build de produção passaram.
- O teste de transporte utilizou o processo Node e as dependências instaladas; os testes de WhatsApp usam adaptadores controlados, sem conta conectada.

## Alterar o código depois

O código completo da atualização está em CODIGO_WHATSAPP_QR_1_4.md, com os caminhos dos arquivos. O package-lock.json do conector está incluído no ZIP. Para recompilar alterações no React:

```powershell
.\reconstruir_interface.bat
.\iniciar.bat
```

Os documentos de versões 1.2 e 1.3 são históricos. Para a integração WhatsApp, utilize este guia de versão 1.4.
