# Grupo França · Próxima etapa: SDR de IA de voz

Este documento define o comportamento combinado. O motor de voz e a telefonia ainda não estão implementados ou conectados; não há ligações reais nesta entrega.

## Fluxo comercial

O vendedor cadastra ou importa os leads da sua carteira e seleciona quais entram na discagem. A IA liga com o roteiro padrão do Grupo França, identifica a necessidade e propõe uma conversa comercial quando houver interesse e adequação.

A conversa deve começar com uma apresentação clara do assistente virtual do Grupo França e uma pergunta sobre a disponibilidade para falar. Se a pessoa pedir retorno, o assistente registra a data e o horário combinados, no fuso de Brasília. Se pedir para não receber contato, registra o bloqueio e interrompe novas abordagens.

Durante a conversa, o assistente busca entender o desafio de aquisição de clientes, como a empresa atende esse desafio hoje, o papel da pessoa na decisão e o prazo para avaliar uma solução. As perguntas devem acompanhar o contexto, uma de cada vez, sem transformar a conversa em um questionário rígido.

## Resultado e próxima ação

| Resultado | Ação prevista |
| --- | --- |
| Não atendeu | Reprogramar tentativa em outro horário, dentro dos limites definidos. |
| Ocupado | Reprogramar após o intervalo configurado. |
| Pediu retorno | Usar o dia e horário combinados. |
| Número inválido | Suspender a discagem e encaminhar para correção pelo vendedor. |
| Interesse e necessidade compatíveis | Registrar evidências e sugerir qualificação ao vendedor. |
| Caso indefinido | Encaminhar para revisão humana. |
| Não contatar | Bloquear novas abordagens. |

O resultado técnico da chamada precisa vir da operadora/provedor. A ausência de resposta não pode ser inferida de uma transcrição vazia. Em caso de resultado incerto de uma solicitação de chamada, é necessário consultar o provedor antes de repetir, para evitar discagem duplicada.

A qualificação comercial segue critérios definidos pelo Grupo França. Uma autorização para enviar informações por WhatsApp não representa, sozinha, um lead qualificado. O resumo deve registrar necessidade, contexto, interesse, papel na decisão, prazo, próxima ação e pontos que ficaram sem confirmação.

## Funil e controle do vendedor

Na primeira versão de voz, o assistente sugere a classificação e o vendedor confirma a movimentação no funil. Após validarmos as avaliações, mudanças com critérios claros poderão ser automatizadas. Ganho dependerá da confirmação do vendedor.

O vendedor acompanha, pausa e cancela a fila da própria carteira. A reatribuição de um lead exige reavaliar a fila, para evitar uma chamada pelo vendedor anterior. Limites de tentativas e horários serão controlados pelo gerente. Uma resposta, cancelamento ou bloqueio deve invalidar tentativas que deixaram de fazer sentido.

O WhatsApp permanece como apoio ao contato. A agenda continua sendo a fonte para disponibilidade e registro de reservas. O assistente não deve prometer horários sem consulta e confirmação.

## Recurso que precisamos definir antes das ligações

Precisamos de uma operadora ou provedor que permita fazer e acompanhar chamadas por API ou SIP, com número de origem autorizado. Também precisaremos integrar os componentes que reconhecem a fala, conduzem a conversa e produzem a voz.

Ainda não foram escolhidos ou contratados esses serviços. Credenciais não devem ser enviadas pelo chat. Custos, cobertura, números e limites precisam ser verificados na escolha da telefonia. O teste inicial de chamada será para um número controlado e após uma ação explícita do operador, antes de liberar listas comerciais.
