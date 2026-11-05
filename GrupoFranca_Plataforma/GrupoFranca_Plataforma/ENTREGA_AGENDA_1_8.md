# Grupo França — Calendário visual 1.8

A Agenda agora tem a organização visual do Google Agenda, adaptada ao tema preto do Grupo França. A visualização inicial é semanal. Também há dia e mês, mini calendário, Hoje, navegação entre períodos, grade de 24 horas e indicador do horário atual (Brasília).

## Usar

- Clique em um horário da grade ou em Criar reunião para abrir o painel lateral. Selecione o lead, horário e e-mail opcional do convidado, revise e confirme.
- Com Google conectado, Salvar e sincronizar grava a reserva e envia ao Google as operações pendentes somente daquele lead, incluindo o cancelamento do horário antigo no reagendamento. Outros convites pendentes não são enviados por essa ação.
- Sem conexão Google, a confirmação informa que a reserva será apenas interna.
- Clique em uma reunião para consultar detalhes, reagendar, cancelar ou abrir a ficha do contato.
- Cancelar também pede confirmação antes de sincronizar. Uma falha no Google mantém o status pendente/erro, com aviso, sem repetir automaticamente o envio.
- Sincronizar pendências é uma ação separada e confirmada: envia todas as operações pendentes da própria agenda.
- Atualizar agenda lê as alterações do Google nas reservas sincronizadas e recarrega o período exibido. A navegação entre datas apenas consulta informações; não envia convites. Não há atualização em tempo real por webhook nesta versão.
- Conexão com Google fica no ícone de ajustes no topo. A autorização individual e as credenciais criptografadas da versão 1.7 são preservadas; não é necessário preencher chaves novamente se elas já estavam salvas.

## Privacidade e regras

Compromissos externos aparecem somente como Ocupado. A consulta ao Google solicita apenas identificadores, status, transparência e horários; nomes, descrições e convidados pessoais não são devolvidos à interface. Esses blocos são somente de leitura. Reuniões do CRM só aparecem com detalhes quando pertencem à própria agenda e à carteira permitida. O calendário do gerente também mostra sua própria agenda; não abre agendas pessoais de vendedores.

Reuniões do sistema continuam com 30 minutos, de segunda a sexta, dentro do expediente configurado e respeitando o intervalo. O servidor verifica conflitos locais e externos ao salvar. Se a consulta de horários externos falhar, a tela avisa e desabilita novas reservas até atualizar ou reconectar. Dias com eventos de dia inteiro e eventos recorrentes são considerados; eventos livres/transparentes e cancelados não bloqueiam horários. A tela mostra a agenda principal conectada na versão 1.7, sem seletor de múltiplas agendas Google secundárias.

No celular, a grade tem rolagem horizontal para preservar a leitura dos horários. No computador, o mini calendário lateral aparece quando há largura suficiente. Reagendamento é feito pelo formulário lateral; arrastar reuniões na grade não foi implementado.

## Aplicar na pasta atual

Requer a plataforma com a atualização 1.7 aplicada. Feche o servidor com Ctrl+C, salve ATUALIZAR_CALENDARIO_1_8.ps1 na pasta GrupoFrancaSDR e execute:

```powershell
cd "C:\Users\igorl\OneDrive\Desktop\GrupoFrancaSDR"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\ATUALIZAR_CALENDARIO_1_8.ps1" -PastaProjeto ".\GrupoFranca_Plataforma"
if ($LASTEXITCODE -eq 0) { .\GrupoFranca_Plataforma\iniciar.bat }
```

O pacote contém a interface compilada e o código. Não exige apagar ou extrair pastas. Verifica integridade, mantém backup dos arquivos substituídos e usa a .venv existente para conferir as dependências. Pode precisar de internet para essa conferência. Não inclui banco de dados, chaves privadas ou sessões WhatsApp e não troca o conector WhatsApp.

## Validação e limites

Testes de backend: privacidade da projeção, paginação Google, fuso, eventos de dia inteiro, remoção de duplicidades de eventos sincronizados, isolamento entre carteiras/agendas, falha de rede, período limitado, permissão e propriedade nas rotas de criação/cancelamento, sincronização restrita ao lead escolhido e visibilidade dos cancelamentos pendentes. Os demais testes existentes foram executados.

Testes da interface: navegação de dia/semana/mês, fevereiro bissexto, sobreposição legível, criação somente após revisão, cancelamento confirmado, blocos pessoais somente de leitura, falha na consulta e reserva interna sem Google. Build React/TypeScript aprovado. Prévia semanal, mensal e painel lateral conferidos no navegador com dados fictícios.

Os testes Google usam respostas controladas. A validação de criação/reagendamento/cancelamento com sua conta Google real e a execução do atualizador no Windows devem ser feitas no seu computador. Esta entrega não migra para PostgreSQL, não publica o servidor e não implementa o SDR de voz.
