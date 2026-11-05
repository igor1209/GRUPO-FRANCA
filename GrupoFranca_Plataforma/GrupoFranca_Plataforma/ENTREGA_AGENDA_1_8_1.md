# Grupo França — Correção de informações da reunião 1.8.1

As reuniões do CRM agora mostram no painel lateral o nome do contato, empresa, telefone/contato, e-mail cadastrado, destinatário do convite, necessidade relatada e objetivo comercial, conforme os campos preenchidos no cadastro. Data, horário, status e acesso à ficha do contato continuam disponíveis.

## Correção da identificação

A versão 1.8 considerava apenas reservas ativas que ainda estivessem no período local consultado. Um evento que permanecesse no Google depois de uma alteração/cancelamento local ou tivesse mudado de horário podia aparecer somente como Ocupado. Além disso, uma sincronização pendente podia criar dois blocos para a mesma reunião.

A identificação passa a consultar os vínculos da própria conta e carteira, incluindo o histórico local. Eventos com o identificador conhecido são exibidos como reuniões comerciais, com os horários atuais do Google e sem duplicar o bloco local. Reuniões sincronizadas removidas do Google deixam de aparecer como cópias locais no calendário conectado; Atualizar agenda também reconcilia os registros internos.

Eventos antigos cujo identificador mudou podem ser reconhecidos pela identificação privada da instalação e pela referência exata de uma reunião local existente e permitida. Nesses casos, os dados do contato aparecem, mas o painel informa que o vínculo precisa ser conferido e não habilita alterações sobre um evento diferente. Não há associação por nome, telefone ou coincidência de horário. Novas sincronizações incluem identificadores privados da reunião e do lead, além do identificador da instalação.

Uma reserva já cancelada localmente não é reativada automaticamente: o painel mostra Cancelamento pendente no Google ou Evento no Google · reserva local encerrada, conforme o caso. Use Sincronizar pendências para enviar os cancelamentos pendentes. Reservas ativas corretamente vinculadas mantêm Reagendar e Cancelar reserva. Os demais compromissos pessoais do Google permanecem como Ocupado, sem dados pessoais na interface.

## Aplicar

Feche o servidor com Ctrl+C. Salve ATUALIZAR_CALENDARIO_1_8_1.ps1 em GrupoFrancaSDR e execute:

```powershell
cd "C:\Users\igorl\OneDrive\Desktop\GrupoFrancaSDR"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\ATUALIZAR_CALENDARIO_1_8_1.ps1" -PastaProjeto ".\GrupoFranca_Plataforma"
if ($LASTEXITCODE -eq 0) { .\GrupoFranca_Plataforma\iniciar.bat }
```

Abra a Agenda e clique no ícone Atualizar agenda. Depois, abra a reunião de Eduardo. O pacote preserva banco, contatos, credenciais Google e sessões/conector WhatsApp, inclui a interface compilada e cria backup dos arquivos substituídos. Não exige excluir ou extrair pastas. A instalação das dependências pode usar internet.

## Testes

Cobertura adicionada para reunião antiga em erro/pendente, evento ainda ativo no Google após cancelamento local, alteração externa de horário para outro período, identificação antiga com referência privada, tentativa de atribuição de evento de outra instalação/usuário e exibição dos dados do contato no painel. Os demais testes de backend e interface e a compilação foram executados. As respostas Google dos testes são simuladas; esta entrega não acessa o banco nem a conta Google do seu computador. A validação da reunião real e da execução no Windows deve ser feita após aplicar.
