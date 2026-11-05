"""França IA: classificador local treinável e planejador comercial sem efeitos externos.

Não é um LLM treinado do zero. Os exemplos aprovados treinam um Naive Bayes;
regras de prioridade, citações literais e respostas aprovadas controlam o fluxo.
"""
import json
import math
import re
from collections import Counter, defaultdict
from datetime import datetime

from .core import INTENTS, Provider, fmt, norm, parse_date, substantial

SEEDS = {
    'yes': ['sim', 'pode ser', 'vamos conversar', 'tenho interesse', 'quero conhecer', 'pode explicar', 'confirmo', 'pode marcar'],
    'no': ['agora não', 'outro dia', 'hoje não posso', 'prefiro depois', 'não obrigado', 'deixa para outra hora'],
    'stop': ['remova meu contato', 'não envie mais mensagens', 'não tenho interesse', 'pare de enviar', 'me tire da lista', 'descadastrar'],
    'human': ['quero falar com uma pessoa', 'chame o Igor', 'quero atendimento humano', 'prefiro falar com Igor', 'preciso de um atendente'],
    'question': ['como funciona?', 'quais serviços vocês oferecem?', 'qual é o preço?', 'o que é o Grupo França?', 'vocês fazem marketing?', 'quanto custa?'],
    'statement': ['dependemos de indicações para vender', 'não temos processo de vendas', 'preciso organizar o comercial', 'nossos leads não convertem', 'queremos aumentar a aquisição de clientes', 'o marketing não gera oportunidades'],
    'unclear': ['entendi', 'hmm', 'talvez', 'não sei dizer', 'obrigado', 'oi'],
}
EVALUATION = [
    ('sim, tenho interesse em conversar', 'yes'),
    ('hoje não, prefiro outro dia', 'no'),
    ('não me envie mais nada', 'stop'),
    ('quero falar com um humano', 'human'),
    ('qual o valor do serviço?', 'question'),
    ('dependemos apenas de indicação para captar clientes', 'statement'),
    ('hmm', 'unclear'),
]


def words(text):
    return re.findall(r'[a-z0-9]+', norm(text))[:300]


def priority(text):
    t = norm(text)
    if t in ('pare', 'parar', 'sair', 'remover', 'descadastrar', 'unsubscribe'):
        return 'stop'
    if re.search(r'\b(descadast\w*|unsubscribe|remov\w* meu contato|sair da lista|tire da lista|nao tenho interesse|pare de enviar|nao me contate|nao (?:me )?envie mais|nao (?:me )?mande mais|nao quero (?:mais )?(?:mensagens|contato))\b', t) or re.search(r'^(?:estou |estamos )?sem interesse\b', t):
        return 'stop'
    if re.search(r'\b(igor|humano|humana|pessoa|atendente)\b', t) and re.search(r'\b(falar|quero|prefiro|chame|atendimento|preciso)\b', t):
        return 'human'
    # Cancellation of a meeting is different from opting out of all contact.
    if re.search(r'\b(cancelar|cancele|desmarcar)\b', t) and re.search(r'\b(reuniao|horario|reserva|agendamento)\b', t):
        return 'cancel'
    if re.search(r'\b(remarcar|reagendar|mudar o horario|alterar o horario)\b', t):
        return 'reschedule'
    if re.search(r'\b(quero marcar|quero agendar|prefiro falar na reuniao)\b', t):
        return 'schedule'
    return None


class IntentModel:
    def __init__(self, examples):
        self.counts = defaultdict(Counter)
        self.labels = Counter()
        self.vocab = set()
        for text, label in examples:
            if label not in INTENTS:
                continue
            tokens = words(text)
            self.counts[label].update(tokens)
            self.labels[label] += 1
            self.vocab.update(tokens)

    def predict(self, text):
        forced = priority(text)
        if forced:
            return {'intent': forced, 'score': 1.0, 'method': 'prioridade'}
        basic = Provider.rules(text, 'need')['intent']
        if basic in ('yes', 'no', 'question'):
            return {'intent': basic, 'score': 1.0, 'method': 'regra'}
        tokens = [t for t in words(text) if t in self.vocab]
        if not tokens:
            return {'intent': 'unclear', 'score': 0, 'method': 'abstenção'}
        scores = {}
        for label in INTENTS:
            counts = self.counts[label]
            scores[label] = math.log((self.labels[label] + 1) / (sum(self.labels.values()) + len(INTENTS)))
            scores[label] += sum(math.log((counts[t] + 1) / (sum(counts.values()) + max(1, len(self.vocab)))) for t in tokens)
        top = max(scores.values())
        probs = {k: math.exp(v - top) for k, v in scores.items()}
        label = max(probs, key=probs.get)
        score = probs[label] / sum(probs.values())
        if score < .52 or label in ('stop', 'human'):
            label = 'unclear'
        return {'intent': label, 'score': round(score, 3), 'method': 'Naive Bayes'}


def dataset(store):
    row = store.db.execute('SELECT examples FROM gf_models ORDER BY id DESC LIMIT 1').fetchone()
    return json.loads(row['examples']) if row else [(text, label) for label, texts in SEEDS.items() for text in texts]


def classify(store, text):
    return IntentModel(dataset(store)).predict(text)


def approved_answer(store, text):
    query = set(words(text)) - {'o', 'a', 'os', 'as', 'de', 'do', 'da', 'e', 'como', 'que', 'qual', 'vocês', 'voces'}
    ranked = []
    for row in store.db.execute('SELECT * FROM gf_knowledge WHERE active=1'):
        tokens = set(words(row['question']))
        overlap = len(query & tokens)
        if overlap:
            ranked.append((overlap / max(1, len(query | tokens)), dict(row)))
    if ranked:
        score, hit = max(ranked, key=lambda pair: pair[0])
        if score >= .18:
            return hit['answer'], hit['id']
    return 'Esse ponto precisa ser avaliado pelo Igor. Posso deixar a conversa para ele esclarecer?', None


def plan(store, lid, text):
    """Pure plan: no lead, reservation, message or external side effect is committed."""
    lead = store.lead(lid)
    if not lead:
        raise ValueError('Contato não encontrado.')
    info = store.profile(lid)
    cfg = store.config()
    prediction = classify(store, text)
    intent = prediction['intent']
    result = {'answer': '', 'changes': {}, 'profile': {}, 'intent': intent,
              'score': prediction['score'], 'method': prediction['method'],
              'reserve': '', 'cancel': False, 'qualified': False}
    t = norm(text)
    if lead['blocked']:
        raise ValueError('Contato bloqueado. A SDR não continuará a conversa.')
    if intent == 'stop':
        result.update(answer='Entendido. Não continuaremos o contato.', changes={'blocked': 1, 'paused': 1, 'phase': 'stopped', 'followup': ''})
    elif intent == 'human':
        result.update(answer='Claro. A conversa ficará disponível para o Igor continuar.', changes={'paused': 1})
    elif intent == 'cancel':
        result.update(answer='A reserva será cancelada. Obrigada por avisar.', cancel=True, changes={'phase': 'invite', 'proposed': '', 'offered': '[]'})
    elif lead['paused']:
        raise ValueError('A SDR está pausada. Retome ou continue manualmente.')
    elif intent == 'reschedule':
        slots = store.slots(cfg, lid)
        result.update(answer='Qual novo horário funciona melhor?\n' + '\n'.join(f'{i+1}. {fmt(s)}' for i, s in enumerate(slots)),
                      changes={'phase': 'schedule', 'offered': json.dumps(slots), 'proposed': ''})
    elif lead['phase'] in ('schedule', 'confirm'):
        if lead['phase'] == 'confirm' and intent == 'yes':
            store.validate_slot(datetime.fromisoformat(lead['proposed']), cfg, lid)
            result.update(answer=f"Reserva local confirmada para {fmt(lead['proposed'])}, por 30 minutos (Brasília). A sincronização e o convite externo têm status separado na plataforma.",
                          reserve=lead['proposed'], changes={'phase': 'booked', 'followup': ''})
        elif intent == 'no':
            result.update(answer='Tudo bem. Qual outro dia e horário funciona melhor?', changes={'phase': 'schedule', 'proposed': ''})
        else:
            dt = parse_date(text, json.loads(lead['offered']))
            store.validate_slot(dt, cfg, lid)
            result.update(answer=f'Você confirma {fmt(dt.isoformat())}, por 30 minutos, no horário de Brasília?',
                          changes={'phase': 'confirm', 'proposed': dt.isoformat()})
    elif lead['phase'] == 'booked':
        result['answer'] = 'Sua reserva está registrada. Você pode pedir para cancelar ou reagendar.'
    elif intent == 'schedule' or (lead['phase'] == 'invite' and intent == 'yes'):
        slots = store.slots(cfg, lid)
        if not slots:
            raise ValueError('Não há horários livres nos próximos 15 dias úteis da agenda. Ajuste a disponibilidade.')
        result.update(answer='Qual opção funciona melhor? Reuniões de 30 minutos, em Brasília.\n' + '\n'.join(f'{i+1}. {fmt(s)}' for i, s in enumerate(slots)) + '\nResponda 1, 2 ou 3, ou informe outra data e hora.',
                      changes={'phase': 'schedule', 'offered': json.dumps(slots)})
    elif intent == 'question':
        result['answer'], result['knowledge_id'] = approved_answer(store, text)
    elif intent == 'no':
        result.update(answer='Tudo bem. A conversa ficará pausada.', changes={'paused': 1, 'phase': 'paused'})
    elif lead['phase'] == 'opening' and intent == 'yes':
        result.update(answer=cfg['question'], changes={'phase': 'need'})
    elif lead['phase'] == 'goal':
        if substantial(text):
            result.update(answer='Em que prazo vocês gostariam de começar essa melhoria? Se preferir, podemos tratar disso na reunião.',
                          profile={'goal': text}, changes={'phase': 'timing'})
        else:
            result['answer'] = 'Qual resultado comercial vocês gostariam de alcançar?'
    elif lead['phase'] == 'timing':
        if len(t) >= 3 and t not in ('sim', 'ok', 'nao sei'):
            result.update(answer=cfg['invite'], profile={'timing': text}, changes={'phase': 'invite'}, qualified=bool(lead['need'] and info['goal'] and not re.search(r'nao sei|nao sabemos|sem prazo|ainda nao', t)))
        else:
            result['answer'] = 'Pode informar o prazo ou dizer que prefere conversar sobre isso na reunião?'
    elif lead['phase'] == 'invite':
        result['answer'] = 'Gostaria de conversar com o Igor sobre esse cenário?'
    elif substantial(text) and (intent == 'statement' or re.search(r'\b(dificuldade|problema|preciso|precisamos|dependemos|vendas|leads|clientes|marketing|comercial|captar|vender|indicacao)\b', t)):
        result.update(answer='Entendi. Qual resultado vocês querem alcançar ao melhorar esse cenário?',
                      changes={'need': text, 'phase': 'goal'})
    else:
        result['answer'] = cfg['question'] if lead['phase'] == 'need' else 'Faz sentido conversarmos sobre a operação comercial da sua empresa?'
    return result


def apply_plan(store, lid, result, source='test'):
    if result['cancel']:
        store.cancel_meetings(lid)
    if result['reserve']:
        store.reserve(lid, result['reserve'], store.config(), source=source)
    if result['changes']:
        store.update(lid, **result['changes'])
    if result['profile']:
        store.save_profile(lid, result['profile'])
    if result['qualified']:
        store.save_profile(lid, {'qualified': 1})
        store.event(lid, 'qualified', source)
    if result['intent'] == 'stop':
        store.stop_contact(lid)
