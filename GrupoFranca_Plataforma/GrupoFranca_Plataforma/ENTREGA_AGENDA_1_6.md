# Grupo França · Vendedores e agenda · 1.6

Esta entrega dá continuidade aos passos restantes: validação dos vendedores, agenda integrada e, depois, SDR de IA de voz. A migração ao PostgreSQL e a hospedagem continuam como uma etapa separada. A versão atual ainda utiliza SQLite.

## Aplicar a atualização

Coloque ATUALIZAR_AGENDA_1_6.ps1 em C:\Users\igorl\OneDrive\Desktop\GrupoFrancaSDR, na mesma pasta do atualizador anterior. Feche a plataforma com Ctrl+C e execute:

```powershell
cd "C:\Users\igorl\OneDrive\Desktop\GrupoFrancaSDR"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\ATUALIZAR_AGENDA_1_6.ps1" -PastaProjeto "C:\Users\igorl\OneDrive\Desktop\GrupoFrancaSDR\GrupoFranca_Plataforma"
if ($LASTEXITCODE -eq 0) { .\GrupoFranca_Plataforma\iniciar.bat }
```

O pacote contém a interface compilada. Não é necessário executar npm, extrair pastas ou reinstalar o WhatsApp. Contas, contatos, configurações salvas e sessões de WhatsApp não são substituídos. O código anterior é guardado em backup_atualizacoes. O atualizador tenta restaurar os arquivos anteriores se a cópia falhar. A leitura dos arquivos embarcados e seus hashes foi verificada aqui; o script PowerShell não foi executado no seu Windows.

## 1. Validar o acesso do vendedor

Os testes automatizados verificam criação de contas, mudança de senha inicial, permissões, isolamento das carteiras, importação e distribuição. Esta entrega amplia os testes para reservas e cancelamentos: o vendedor não pode agendar ou cancelar para leads de outro vendedor e precisa da permissão Agendar reuniões. Somente o gerente configura e sincroniza o Google.

Para conferir sua instalação:

1. Como gerente, abra Equipe → Usuários e crie uma conta de vendedor com senha temporária.
2. Em Equipe → Distribuição, atribua um contato interno de teste a essa conta. Não registre uma venda fictícia como Ganho.
3. Abra uma janela privativa, acesse http://127.0.0.1:8780 e entre com a conta do vendedor. Defina a nova senha quando solicitado.
4. Confira que o contato atribuído aparece e que usuários e configurações do gerente não ficam disponíveis.
5. Volte ao gerente, transfira o contato para outro responsável e atualize os dados do vendedor. O contato deve sair da carteira dele.
6. Para testar a agenda, atribua o contato ao vendedor novamente e confira a permissão Agendar reuniões. Reagendamento e cancelamento ficam desabilitados quando essa permissão não estiver presente; o backend também bloqueia solicitações diretas.

Incluímos um verificador somente de leitura. Ele não acessa serviços externos nem exibe nomes, telefones ou senhas. Na pasta principal do projeto, execute:

```powershell
.\.venv\Scripts\python.exe .\verificar_plataforma.py
```

Ele confere a integridade do SQLite, referências entre registros, gerente ativo, vendedores cadastrados, atribuições de carteira, permissões, etapas do funil e sobreposição de reservas. Avisos de ausência de vendedores ou carteira vinculada a usuário inativo são informativos. Falhas de integridade, atribuição ou conflito de reservas precisam ser corrigidas. Esse teste interno não substitui o teste de login e uso pelos funcionários.

## 2. Conectar o Google Calendar

A Agenda agora oferece ao gerente um painel próprio de configuração do Google, sem abrir a antiga tela de e-mail. O estado indica Não autorizado, Autorizado · teste o acesso ou Acesso testado.

A conexão depende de um projeto Google com a Calendar API ativada e credenciais OAuth. O gerente informa esses dados diretamente na plataforma, sem enviá-los pelo chat:

1. No Google Cloud, crie ou selecione o projeto e ative a Google Calendar API.
2. Configure a tela de consentimento. Para uso externo à organização em modo de teste, inclua a conta autorizadora na lista de usuários de teste. Regras de publicação e validação podem variar conforme o tipo de conta e o uso.
3. Crie um cliente OAuth do tipo Aplicativo da Web.
4. Cadastre exatamente o URI de redirecionamento autorizado:

```text
http://127.0.0.1:8780/oauth/google/callback
```

5. Entre como gerente no app e abra Agenda → Google Calendar → Configurar conexão Google.
6. Informe Client ID e Client secret. Para a agenda principal, mantenha primary no campo ID da agenda. Uma agenda comercial dedicada também pode ser utilizada, com seu ID e acesso concedido à conta autorizadora.
7. Clique em Salvar e preparar autorização e depois em Autorizar minha agenda Google.
8. Conclua a autorização na página do Google, volte ao app e atualize os dados.
9. Clique em Testar acesso à agenda.

As credenciais preenchidas por essa tela ficam na memória desta sessão do servidor; precisam ser informadas e autorizadas novamente após reiniciar. O backend também aceita GF_GOOGLE_CLIENT_ID, GF_GOOGLE_CLIENT_SECRET, GF_GOOGLE_REFRESH_TOKEN e GF_GOOGLE_CALENDAR_ID por variáveis de ambiente. O armazenamento persistente de segredos no servidor será definido na etapa de hospedagem. O app não grava esses segredos no SQLite nem os devolve aos vendedores.

Trocar o cliente exige o Client secret correspondente e invalida a autorização antiga em memória. Limpar dados desta sessão remove apenas os dados Google, preservando os outros canais e as reservas. Essa ação não revoga a permissão na conta Google nem apaga eventos já criados. A autorização também pode ser revogada nas configurações da própria conta Google.

## Reservar, reagendar e cancelar

As reuniões têm 30 minutos, em dias e horários permitidos pela configuração do agente, no fuso de Brasília. Os campos estão bloqueados para quem não possui a permissão de agendamento.

- Reservar: selecione o contato, consulte horários ou informe data e hora, revise e confirme a reserva local.
- Com Google autorizado: o backend consulta conflitos externos e locais antes de reservar. Se a consulta externa falhar, a reserva não é confirmada como se estivesse livre.
- Sem Google autorizado: a tela indica Agenda interna e verifica apenas os conflitos locais. Não há confirmação ou convite externo.
- Sincronizar: o gerente usa Sincronizar e enviar convites para aplicar as operações pendentes no Google. Um e-mail de convidado é opcional. Esse botão pode enviar convites ou cancelamentos reais para os e-mails cadastrados, por isso confira as reservas antes de executar.
- Reagendar: use o botão da reserva, selecione o novo horário, revise e confirme. A sincronização aplica o cancelamento do evento anterior e a nova reserva.
- Cancelar: confirme o cancelamento no app e sincronize para atualizar o Google e os convidados.
- Alteração no Google: o gerente usa Ler alterações do Google para reconciliar horários e cancelamentos. Alterações incompatíveis são informadas como erro para revisão.

O teste de acesso verifica a leitura da agenda. A permissão de escrita e a criação real do evento precisam ser confirmadas no primeiro agendamento de teste. O app não declara um evento sincronizado antes da confirmação da API; um convite aceito pelo Google não comprova leitura pelo convidado.

Novos convites pendentes não são enviados para um contato bloqueado. Uma reserva de teste do simulador não é sincronizada como evento real. Mover um card para Reunião no funil não cria compromisso na agenda.

## O que está validado e o que depende da sua conta

Passaram 115 testes do backend, executados em lotes, e 29 testes da interface. Também passou o build de produção. As verificações abrangem o controle de acesso dos vendedores, isolamento das credenciais Google, autorização de uso único, reservas e cancelamentos por carteira, bloqueio de convites para contatos bloqueados e leitura do verificador sem alteração do banco.

Não foi conectada uma conta Google real neste ambiente. A autorização, o primeiro evento e a confirmação de cancelamento/reagendamento com sua conta ainda precisam ser validados na sua instalação. A conexão e os envios de WhatsApp de texto foram validados anteriormente por você.

## 3. Próxima etapa: SDR de IA de voz

O roteiro e as regras combinadas estão em PLANO_SDR_VOZ.md. A telefonia e o motor de voz ainda não foram implementados ou conectados. Para continuar, precisamos definir se você já possui uma operadora/provedor com API ou SIP ou se começaremos essa parte do zero.
