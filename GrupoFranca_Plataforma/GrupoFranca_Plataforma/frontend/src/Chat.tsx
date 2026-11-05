import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowDown,
  Copy,
  MessageSquare,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Save,
  Send,
  ShieldBan,
} from "lucide-react";
import {can} from "./types";
import type { State, Lead, Action, Detail } from "./types";
import {
  Avatar,
  Button,
  Empty,
  Header,
  Loading,
  NewButton,
  Phase,
  SearchBox,
} from "./components";
import { date } from "./api";

type Confirm = (text: string, data: Record<string, unknown>) => void;
type InboxProps = {
  state: State;
  selected: number | null;
  detail: Detail | null;
  open: (id: number) => void;
  act: Action;
  busy: boolean;
  edit: (lead: Lead) => void;
  newContact: () => void;
  notify: (text: string, error?: boolean) => void;
  confirm: Confirm;
};

export function Inbox({
  state,
  selected,
  detail,
  open,
  act,
  busy,
  edit,
  newContact,
  notify,
  confirm,
}: InboxProps) {
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const [manual, setManual] = useState(false);
  const [awayFromBottom, setAwayFromBottom] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const followBottom = useRef(true);
  const forceBottom = useRef(false);
  const lastRender = useRef<{ contact: number | null; message: number | null }>(
    { contact: null, message: null },
  );
  const current = detail?.lead.id === selected ? detail : null;
  const lead = current?.lead;
  const realConversation = Boolean(
    lead &&
      (
        state as State & { commercial?: { real_lead_ids?: number[] } }
      ).commercial?.real_lead_ids?.includes(lead.id),
  );
  const qualification = (
    state as State & {
      commercial?: {
        profiles?: Record<string, { goal: string; timing: string }>;
      };
    }
  ).commercial?.profiles?.[lead?.id ?? 0];
  const lastMessage = current?.messages.at(-1)?.id ?? null;

  useEffect(() => {
    setText("");
    setManual(false);
    forceBottom.current = false;
  }, [selected]);

  useLayoutEffect(() => {
    const box = messagesRef.current;
    if (!box || !lead) return;
    const changedContact = lastRender.current.contact !== lead.id;
    const newMessage = lastRender.current.message !== lastMessage;
    if (
      changedContact ||
      (newMessage && (followBottom.current || forceBottom.current))
    ) {
      // Scroll only the message container. Never move the page or its ancestors.
      box.scrollTop = box.scrollHeight;
      followBottom.current = true;
      forceBottom.current = false;
      setAwayFromBottom(false);
    }
    lastRender.current = { contact: lead.id, message: lastMessage };
  }, [lead?.id, lastMessage]);

  function handleScroll() {
    const box = messagesRef.current;
    if (!box) return;
    const nearBottom = box.scrollHeight - box.clientHeight - box.scrollTop < 80;
    followBottom.current = nearBottom;
    setAwayFromBottom(!nearBottom);
  }

  function showLatest() {
    const box = messagesRef.current;
    if (!box) return;
    box.scrollTop = box.scrollHeight;
    followBottom.current = true;
    forceBottom.current = false;
    setAwayFromBottom(false);
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || busy || !lead || !can(state,"message")) return;
    forceBottom.current = true;
    const result = await act({
      action: "send",
      id: lead.id,
      text: text.trim(),
      manual,
    });
    if (result) setText("");
  }

  const rows = state.leads.filter((item) =>
    `${item.company} ${item.name}`.toLowerCase().includes(query.toLowerCase()),
  );
  const canSend = Boolean(
    lead && !realConversation && !lead.blocked && (!lead.paused || manual),
  );

  return (
    <>
      <Header
        title="Conversas"
        description="Uma conversa completa, com o contexto sempre ao lado."
      >
        {can(state,"create")&&<NewButton onClick={newContact} />}
      </Header>
      <div className="inbox-grid">
        <section className="conversation-list">
          <div className="list-heading">
            <b>Caixa de conversas</b>
            <span>{state.leads.length}</span>
          </div>
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Buscar conversa…"
          />
          <div className="conversation-contacts">
            {rows.map((item) => (
              <button
                type="button"
                disabled={busy}
                className={selected === item.id ? "selected" : ""}
                key={item.id}
                onClick={() => open(item.id)}
              >
                <Avatar name={item.company || item.name} />
                <span>
                  <b>{item.company || item.name}</b>
                  <small>
                    {item.blocked
                      ? "Não contatar"
                      : item.paused
                        ? "Pausado"
                        : state.phases[item.phase]}
                  </small>
                </span>
                <span
                  className={`contact-dot ${item.blocked ? "red" : item.paused ? "amber" : "green"}`}
                />
              </button>
            ))}
            {!rows.length && (
              <p className="list-empty">Nenhuma conversa encontrada.</p>
            )}
          </div>
        </section>
        <section className="conversation-pane">
          {selected && !current ? (
            <Loading />
          ) : lead && current ? (
            <>
              <div className="conversation-top">
                <div className="person">
                  <Avatar name={lead.company || lead.name} />
                  <div>
                    <b>{lead.company || lead.name}</b>
                    <small>
                      {lead.name} · {lead.target}
                    </small>
                  </div>
                </div>
                <div className="row-actions">
                  <Phase lead={lead} state={state} />
                  {!lead.blocked && can(state,"edit") && (
                    <Button
                      variant="icon"
                      disabled={busy}
                      title={lead.paused ? "Retomar SDR" : "Pausar SDR"}
                      onClick={() => {
                        void act({ action: "pause", id: lead.id });
                      }}
                    >
                      {lead.paused ? <Play size={16} /> : <Pause size={16} />}
                    </Button>
                  )}
                </div>
              </div>
              <div className="conversation-notice">
                <span className="tiny-dot blue" />
                {realConversation
                  ? "Conversa real · continue o atendimento na tela Integrações"
                  : "Histórico centralizado · o campo abaixo é um simulador"}
              </div>
              <div className="message-area">
                <div
                  className="messages"
                  ref={messagesRef}
                  onScroll={handleScroll}
                  aria-label="Histórico da conversa"
                  tabIndex={0}
                >
                  {current.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`message ${message.role === "user" ? "customer" : message.role === "error" ? "message-error" : message.role === "human" ? "human" : "assistant"}`}
                    >
                      <div className="message-author">
                        {(
                          {
                            user: "Contato",
                            assistant: "Assistente França",
                            human: "Atendimento manual",
                            error: "Sistema",
                          } as Record<string, string>
                        )[message.role] || message.role}
                        <span>
                          {new Date(message.created).toLocaleTimeString(
                            "pt-BR",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                      </div>
                      <p>{message.text}</p>
                      <small>{message.provider}</small>
                    </div>
                  ))}
                </div>
                {awayFromBottom && (
                  <Button variant="latest-messages" onClick={showLatest}>
                    <ArrowDown size={14} />
                    Últimas mensagens
                  </Button>
                )}
              </div>
              <form className="composer" onSubmit={send}>
                <div className="composer-mode">
                  <label>
                    <input
                      type="checkbox"
                      checked={manual}
                      disabled={busy || Boolean(lead.blocked) || !can(state,"message")}
                      onChange={(event) => setManual(event.target.checked)}
                    />
                    Anotação manual (interna)
                  </label>
                  <Button
                    variant="text"
                    disabled={
                      busy || !can(state,"message") ||
                      realConversation ||
                      Boolean(lead.paused || lead.blocked)
                    }
                    onClick={() => {
                      if(!can(state,"message"))return;
                      forceBottom.current = true;
                      void act({ action: "retry", id: lead.id });
                    }}
                  >
                    <RotateCcw size={13} />
                    Tentar resposta pendente
                  </Button>
                </div>
                <div className="composer-input">
                  <textarea
                    aria-label="Mensagem"
                    rows={2}
                    maxLength={4000}
                    value={text}
                    disabled={busy || !canSend || !can(state,"message")}
                    placeholder={
                      realConversation
                        ? "Use E-mails para responder a este contato."
                        : lead.blocked
                          ? "Contato bloqueado"
                          : lead.paused && !manual
                            ? "SDR pausada. Retome ou assuma o atendimento."
                            : manual
                              ? "Escreva sua mensagem manual…"
                              : "Responda como um possível cliente…"
                    }
                    onChange={(event) => setText(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault();
                        void send(event);
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    variant="primary icon"
                    title="Enviar mensagem"
                    disabled={busy || !canSend || !text.trim() || !can(state,"message")}
                  >
                    <Send size={18} />
                  </Button>
                </div>
                <small>
                  {busy
                    ? "Processando resposta…"
                    : manual
                      ? "Mensagens manuais pausam a SDR."
                      : "Simulador local · envios reais na tela Integrações · Enter para testar"}
                </small>
              </form>
            </>
          ) : (
            <Empty
              title="Oportunidades começam com diálogo"
              description="Selecione uma conversa ou cadastre um contato para testar sua assistente."
            >
              {can(state,"create")&&<NewButton onClick={newContact} />}
            </Empty>
          )}
        </section>
        <section className="contact-details">
          {lead && current ? (
            <>
              <div className="detail-heading">
                <h3>Contexto comercial</h3>
                <Button
                  variant="icon"
                  title="Editar cadastro"
                  onClick={() => edit(lead)}
                >
                  <Pencil size={15} />
                </Button>
              </div>
              <label>NECESSIDADE RELATADA</label>
              <p className="need-quote">
                {lead.need || "O relato do interessado aparecerá aqui."}
              </p>
              <label>CONTATO</label>
              <p>{lead.contact || "Não informado"}</p>
              <label>OBJETIVO RELATADO</label>
              <p>{qualification?.goal || "Ainda não informado"}</p>
              <label>PRAZO RELATADO</label>
              <p>{qualification?.timing || "Ainda não informado"}</p>
              <label>REUNIÃO LOCAL</label>
              <p>
                {current.meeting
                  ? date(current.meeting.start)
                  : "Sem reserva confirmada"}
              </p>
              <Button
                variant="secondary full-width"
                onClick={() => {
                  navigator.clipboard
                    .writeText(current.summary)
                    .then(() => notify("Resumo copiado."))
                    .catch(() =>
                      notify("Não foi possível copiar o resumo.", true),
                    );
                }}
              >
                <Copy size={14} />
                Copiar resumo
              </Button>
              <Notes
                key={lead.id}
                lead={lead}
                act={act}
                busy={busy||!can(state,"edit")}
                notify={notify}
              />
              {!lead.blocked && can(state,"edit") && (
                <Button
                  variant="danger-text full-width"
                  disabled={busy}
                  onClick={() =>
                    confirm(
                      "Incluir este contato em Não contatar? A SDR será bloqueada e sua cadência será encerrada.",
                      { action: "block", id: lead.id },
                    )
                  }
                >
                  <ShieldBan size={14} />
                  Não contatar
                </Button>
              )}
            </>
          ) : (
            <div className="detail-placeholder">
              <MessageSquare size={24} />
              <h3>Tudo em contexto</h3>
              <p>Relato, agenda e notas do contato em um só lugar.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Notes({
  lead,
  act,
  busy,
  notify,
}: {
  lead: Lead;
  act: Action;
  busy: boolean;
  notify: (text: string) => void;
}) {
  const [notes, setNotes] = useState(lead.notes);
  const [followup, setFollowup] = useState(lead.followup.slice(0, 16));
  const saved = useRef({
    notes: lead.notes,
    followup: lead.followup.slice(0, 16),
  });
  useEffect(() => {
    const previous = saved.current;
    setNotes((value) => (value === previous.notes ? lead.notes : value));
    setFollowup((value) =>
      value === previous.followup ? lead.followup.slice(0, 16) : value,
    );
    saved.current = { notes: lead.notes, followup: lead.followup.slice(0, 16) };
  }, [lead.notes, lead.followup]);
  const dirty = notes !== lead.notes || followup !== lead.followup.slice(0, 16);
  return (
    <form
      className="notes-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (await act({ action: "notes", id: lead.id, notes, followup }))
          notify("Ficha salva.");
      }}
    >
      <label htmlFor="notes">
        NOTAS INTERNAS{dirty && <span> · não salvas</span>}
      </label>
      <textarea
        id="notes"
        rows={3}
        maxLength={20000}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Pontos para aprofundar na reunião…"
      />
      <label htmlFor="followup">PRÓXIMO RETORNO</label>
      <input
        id="followup"
        type="datetime-local"
        disabled={Boolean(lead.blocked)}
        value={followup}
        onChange={(event) => setFollowup(event.target.value)}
      />
      <Button type="submit" variant="secondary full-width" disabled={busy}>
        <Save size={14} />
        Salvar ficha
      </Button>
      <small>
        Salve antes de trocar de contato. Retornos não geram envios automáticos.
      </small>
    </form>
  );
}
