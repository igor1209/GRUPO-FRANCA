# Grupo França — Google Agenda por usuário, versão 1.7

## Resultado

O login da plataforma continua com usuário e senha. Na Agenda, o usuário com permissão de agendamento clica em **Conectar Google Agenda**, escolhe a conta no Google e concede somente as permissões de leitura de agenda e gerenciamento de eventos. Não há solicitação de Gmail, Drive, perfil ou login OpenID. O acesso é à agenda principal da conta escolhida.

A integração do aplicativo é configurada uma vez pelo gerente, em uma seção recolhida. Nenhum vendedor precisa de Client ID, segredo ou acesso ao Google Cloud. Os vendedores não recebem esses dados pela API.

## Aplicar no projeto existente

1. Feche o servidor com Ctrl+C no terminal.
2. Salve ATUALIZAR_AGENDA_1_7.ps1 em GrupoFrancaSDR.
3. Execute:

```powershell
cd "C:\Users\igorl\OneDrive\Desktop\GrupoFrancaSDR"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\ATUALIZAR_AGENDA_1_7.ps1" -PastaProjeto ".\GrupoFranca_Plataforma"
if ($LASTEXITCODE -eq 0) { .\GrupoFranca_Plataforma\iniciar.bat }
```

O atualizador valida os arquivos, instala as dependências Python no ambiente .venv existente, cria backup dos arquivos alterados e aplica o código e a interface já compilada. A instalação das dependências exige internet. Não substitui contas, contatos, banco, conector ou sessões do WhatsApp. Não é necessário npm build no Windows para aplicar este pacote. O primeiro início cria as tabelas e o campo de titular da agenda de forma aditiva, após o backup do banco feito pelo servidor.

## Configuração inicial, somente pelo gerente

Na Agenda, abra **Integração do aplicativo · administrador**. Informe uma vez o Client ID e o Client secret já criados e salve. O segredo da versão 1.6 ficava na memória e não pode ser recuperado depois de reiniciar; por isso esta primeira gravação é necessária. Não envie segredos em prints ou mensagens.

Depois, cada pessoa usa apenas **Conectar Google Agenda**. Também o gerente precisa conectar a própria agenda neste novo fluxo. Use a conta anterior para preservar as reservas já sincronizadas. Se existirem eventos antigos sincronizados, o servidor verifica que pertencem à instalação e à conta escolhida antes de migrar a referência antiga `primary` para o ID real da agenda.

Mantenha o retorno OAuth cadastrado no Google:

```text
http://127.0.0.1:8780/oauth/google/callback
```

Enquanto o projeto Google estiver em testes, inclua cada conta autorizada como usuário de teste. A persistência local não impede expiração ou revogação pelo Google; quando necessário, use Reconectar Google Agenda. A aplicação continua local: esta atualização não publica o sistema nem cria um servidor central. Para produção será necessário configurar endereço HTTPS, consentimento Google e hospedagem adequados.

## Reuniões e isolamento

- Reservas novas ficam vinculadas ao usuário que as criou. Sincronizar e Ler alterações operam somente nas reservas da agenda desse usuário, inclusive para o gerente.
- Vendedores precisam da permissão `book` e continuam sujeitos à carteira de contatos.
- Agendas distintas podem ter reuniões no mesmo horário. A mesma agenda não aceita sobreposição local ou externa.
- Uma reserva vinculada a outra pessoa não pode ser reagendada ou cancelada com a autorização errada. Após transferir um lead, as reservas anteriores conservam o titular original. Reorganize essas reservas com o responsável original antes de transferir; a leitura/sincronização da conta original continua disponível para refletir cancelamentos feitos no Google.
- Trocar a conta Google com reservas vinculadas a outra agenda é recusado. Reconecte a conta original.
- Criar reserva, sincronizar convites e cancelar continuam sendo ações explícitas. Não há envio automático em lote ou ligação de voz nesta atualização.
- Desconectar remove a autorização local do usuário, sem apagar eventos ou reservas. Para revogar a permissão também no Google, remova o aplicativo nas conexões da sua Conta Google.

## Persistência e backup

Credenciais do aplicativo e refresh tokens individuais são criptografados com Fernet no banco. O token de acesso permanece na memória da requisição. A chave fica em `private/google.key`, junto da pasta de dados (por padrão `%LOCALAPPDATA%\GrupoFrancaSDR`). No Windows, essa chave é protegida por DPAPI para a conta Windows que executa o servidor. Em Linux, a chave usa arquivo de acesso restrito ao usuário do processo. A chave não vai no pacote de atualização.

Os backups de início do servidor copiam o banco e, quando existente, a chave ao lado do arquivo do backup, com extensão `.google.key`. Para restauração, restaure o banco e a chave correspondente como `private/google.key`. No Windows, a abertura depende da conta Windows/máquina que protegeu a chave. Migração de servidor exige planejamento ou nova autorização; não copie apenas o SQLite e suponha que as agendas continuarão conectadas. Proteja o diretório de dados e os backups. Não compartilhe banco, chave, senhas ou sessões do WhatsApp.

## Validação

Testes automatizados cobrem escopos de agenda, PKCE, estado de uso único, sessão ativa, logout, expiração, permissões, concessão parcial, criptografia, recuperação após reabrir o banco, desconexão individual, ausência de segredos na API, calendário errado e sincronização isolada. O caminho HTTP também é testado com respostas Google simuladas. Build React/TypeScript validado. Windows/DPAPI e um novo consentimento Google real devem ser conferidos no seu computador; não foram executados neste ambiente Linux.

Teste prático: conectar, criar reunião de teste, sincronizar, reagendar, sincronizar, cancelar e sincronizar. Reinicie o servidor e confira que a agenda permanece autorizada. Use um destinatário controlado para os convites de teste.
