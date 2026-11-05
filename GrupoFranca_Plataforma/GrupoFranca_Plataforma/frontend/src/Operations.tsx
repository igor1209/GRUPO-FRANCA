import { useState, type FormEvent } from "react";
import {
  Plus,
  Trash2,
  ArrowDown,
  Check,
  Clock3,
  MessageSquare,
  ClipboardList,
  Workflow,
  ArrowUpRight,
  Plug,
  Phone,
  CalendarDays,
  Sparkles,
  Save,
  ShieldCheck,
} from "lucide-react";
import type { State, Action, Step, Config } from "./types";
import { Avatar, Button, Empty, Header, Modal, Phase } from "./components";
import { date } from "./api";
const kinds = {
  task: "Tarefa manual",
  message: "Mensagem manual",
  wait: "Tempo de espera",
};
export function Cadences({
  state,
  act,
  busy,
  open,
  confirm,
}: {
  state: State;
  act: Action;
  busy: boolean;
  open: (id: number) => void;
  confirm: (s: string, data: Record<string, unknown>) => void;
}) {
  const [editor, setEditor] = useState(false),
    [name, setName] = useState(""),
    [steps, setSteps] = useState<Step[]>([
      {
        kind: "task",
        hours: 0,
        text: "Pesquisar a empresa e preparar a abordagem",
      },
      { kind: "wait", hours: 24, text: "" },
      {
        kind: "message",
        hours: 0,
        text: "Preparar retorno com base na conversa anterior",
      },
    ]),
    [assign, setAssign] = useState<number | null>(null),
    [leadId, setLeadId] = useState("");
  const runs = state.workspace.runs.filter((r) => r.status === "active");
  const available = state.leads.filter(
    (l) => !l.blocked && !l.paused && !runs.some((r) => r.lead_id === l.id),
  );
  function stepChange(i: number, patch: Partial<Step>) {
    setSteps((s) => s.map((v, n) => (n === i ? { ...v, ...patch } : v)));
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (await act({ action: "cadence_save", name, steps })) {
      setEditor(false);
      setName("");
    }
  }
  return (
    <>
      <Header
        title="Cadências"
        description="Dê ritmo ao acompanhamento, sem perder o contexto."
      >
        <Button variant="primary" disabled={Boolean(state.user&&state.user.role!=="manager")} onClick={() => setEditor(true)}>
          <Plus size={16} />
          Criar cadência
        </Button>
      </Header>
      <div className="info-banner">
        <Workflow size={19} />
        <span>
          Execução assistida: organize tarefas e esperas. A conclusão é manual e
          não envia mensagens para canais externos.
        </span>
      </div>
      <div className="two-col cadences-grid">
        <section>
          <div className="section-title">
            <h2>Seus fluxos de acompanhamento</h2>
            <span>{state.workspace.cadences.length} fluxos</span>
          </div>
          {state.workspace.cadences.length ? (
            state.workspace.cadences.map((c) => {
              const list: Step[] = JSON.parse(c.steps);
              return (
                <article className="card cadence-card" key={c.id}>
                  <div className="card-heading">
                    <div className="person">
                      <div className="cadence-symbol">
                        <Workflow size={21} />
                      </div>
                      <div>
                        <h2>{c.name}</h2>
                        <p>
                          {list.length} etapas ·{" "}
                          {runs.filter((r) => r.cadence_id === c.id).length} em
                          andamento
                        </p>
                      </div>
                    </div>
                  </div>
                  <ol className="cadence-steps">
                    {list.map((s, i) => (
                      <li key={i}>
                        <span
                          className={
                            "step-icon " +
                            (s.kind === "wait"
                              ? "amber"
                              : s.kind === "message"
                                ? "green"
                                : "blue")
                          }
                        >
                          {s.kind === "wait" ? (
                            <Clock3 size={15} />
                          ) : s.kind === "message" ? (
                            <MessageSquare size={15} />
                          ) : (
                            <ClipboardList size={15} />
                          )}
                        </span>
                        <div>
                          <b>{kinds[s.kind]}</b>
                          <p>{s.text || "Aguardar o prazo definido"}</p>
                        </div>
                        <small>
                          {s.hours > 0 ? s.hours + "h" : "Imediato"}
                        </small>
                      </li>
                    ))}
                  </ol>
                  <div className="cadence-footer">
                    <span className="label-tag">Acompanhamento manual</span>
                    <Button
                      disabled={busy || !available.length}
                      onClick={() => {
                        setLeadId(String(available[0]?.id || ""));
                        setAssign(c.id);
                      }}
                    >
                      <Plus size={15} />
                      Adicionar contato
                    </Button>
                  </div>
                </article>
              );
            })
          ) : (
            <section className="card">
              <Empty
                title="Um fluxo para cada estratégia"
                description="Crie uma sequência de ações, mensagens manuais e esperas."
              >
                <Button variant="primary" disabled={Boolean(state.user&&state.user.role!=="manager")} onClick={() => setEditor(true)}>
                  <Plus size={16} />
                  Criar primeiro fluxo
                </Button>
              </Empty>
            </section>
          )}
        </section>
        <section>
          <div className="section-title">
            <h2>Em andamento</h2>
            <span>{runs.length} contatos</span>
          </div>
          {runs.length ? (
            runs.map((r) => {
              const l = state.leads.find((l) => l.id === r.lead_id)!,
                c = state.workspace.cadences.find(
                  (c) => c.id === r.cadence_id,
                )!,
                list: Step[] = JSON.parse(c.steps),
                s = list[r.step];
              return (
                <article className="card run-card" key={r.id}>
                  <div className="person">
                    <Avatar name={l.company || l.name} />
                    <div>
                      <h3>{l.company || l.name}</h3>
                      <small>{c.name}</small>
                    </div>
                    <Phase lead={l} state={state} />
                  </div>
                  <div className="run-progress">
                    <span>
                      Etapa {r.step + 1} de {list.length}
                    </span>
                    <div className="progress-track">
                      <div
                        style={{ width: `${(r.step / list.length) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="run-task">
                    <b>{kinds[s.kind]}</b>
                    <p>{s.text || "Aguardar o prazo definido"}</p>
                    <small>
                      <Clock3 size={13} />
                      {date(r.due)}
                      {r.due <= state.now ? " · Disponível" : ""}
                    </small>
                  </div>
                  <div className="row-actions wrap">
                    <Button
                      variant="primary"
                      disabled={
                        busy ||
                        Boolean(l.paused || l.blocked) ||
                        (s.kind === "wait" && r.due > state.now)
                      }
                      onClick={() => act({ action: "cadence_next", id: l.id })}
                    >
                      <Check size={15} />
                      Concluir etapa
                    </Button>
                    <Button onClick={() => open(l.id)}>
                      Conversa
                      <ArrowUpRight size={14} />
                    </Button>
                    <Button
                      variant="text"
                      disabled={busy}
                      onClick={() =>
                        confirm("Encerrar este acompanhamento manual?", {
                          action: "cadence_cancel",
                          id: l.id,
                        })
                      }
                    >
                      Encerrar
                    </Button>
                  </div>
                </article>
              );
            })
          ) : (
            <section className="card">
              <Empty
                title="Pronto para começar"
                description="Adicione um contato disponível a uma cadência para acompanhar as etapas."
              />
            </section>
          )}
        </section>
      </div>
      {editor && (
        <Modal
          title="Criar cadência"
          description="Os prazos começam a contar ao entrar em cada etapa, em horas corridas."
          busy={busy}
          close={() => setEditor(false)}
        >
          <form onSubmit={save}>
            <label className="field">
              Nome do fluxo
              <input
                autoFocus
                required
                value={name}
                maxLength={120}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Prospecção inicial B2B"
              />
            </label>
            <div className="step-editor-list">
              {steps.map((s, i) => (
                <div key={i} className="step-editor">
                  <div className="step-editor-heading">
                    <span>ETAPA {String(i + 1).padStart(2, "0")}</span>
                    <Button
                      variant="icon"
                      title={"Remover etapa " + (i + 1)}
                      disabled={steps.length === 1}
                      onClick={() =>
                        setSteps((old) => old.filter((_, n) => n !== i))
                      }
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                  <div className="form-grid">
                    <label>
                      Tipo
                      <select
                        value={s.kind}
                        onChange={(e) =>
                          stepChange(i, {
                            kind: e.target.value as Step["kind"],
                          })
                        }
                      >
                        {Object.entries(kinds).map(([v, t]) => (
                          <option key={v} value={v}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Prazo em horas
                      <input
                        type="number"
                        min={0}
                        max={720}
                        step={1}
                        required
                        value={s.hours}
                        onChange={(e) =>
                          stepChange(i, { hours: Number(e.target.value) })
                        }
                      />
                    </label>
                    {s.kind !== "wait" && (
                      <label className="full">
                        {s.kind === "message"
                          ? "Mensagem para preparar"
                          : "Descrição da tarefa"}
                        <textarea
                          rows={2}
                          required
                          maxLength={4000}
                          value={s.text}
                          onChange={(e) =>
                            stepChange(i, { text: e.target.value })
                          }
                        />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button
              disabled={steps.length >= 20}
              onClick={() =>
                setSteps((old) => [
                  ...old,
                  { kind: "task", hours: 0, text: "" },
                ])
              }
            >
              <Plus size={15} />
              Adicionar etapa
            </Button>
            <div className="modal-actions">
              <Button disabled={busy} onClick={() => setEditor(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={busy} variant="primary">
                <Save size={15} />
                Salvar fluxo
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {assign !== null && (
        <Modal
          title="Iniciar acompanhamento"
          description="O contato poderá participar de uma cadência por vez."
          busy={busy}
          close={() => setAssign(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await act({
                  action: "cadence_assign",
                  cadence: assign,
                  id: Number(leadId),
                })
              )
                setAssign(null);
            }}
          >
            <label className="field">
              Contato disponível
              <select
                required
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
              >
                {available.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.company || l.name} · {l.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="modal-actions">
              <Button disabled={busy} onClick={() => setAssign(null)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={busy || !leadId}
              >
                Iniciar acompanhamento
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
export function SettingsPage({
  state,
  act,
  busy,
  notify,
}: {
  state: State;
  act: Action;
  busy: boolean;
  notify: (s: string) => void;
}) {
  const [cfg, setCfg] = useState<Config>(state.config),
    [key, setKey] = useState("");
  const [tab, setTab] = useState<"intelligence" | "approach" | "schedule">(
    "intelligence",
  );
  function patch(k: keyof Config, v: string | number) {
    setCfg((c) => ({ ...c, [k]: v }));
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (await act({ action: "config", ...cfg, key })) {
      setKey("");
      notify("Configurações salvas.");
    }
  }
  return (
    <>
      <Header
        title="Configurações"
        description="Ajuste a inteligência, a abordagem e a disponibilidade da operação."
      />
      <div className="settings-layout">
        <div className="settings-tabs">
          {[
            ["intelligence", "Inteligência da SDR", Sparkles],
            ["approach", "Abordagem e base", MessageSquare],
            ["schedule", "Agenda e limites", CalendarDays],
          ].map(([v, t, Icon]) => {
            const I = Icon as typeof Sparkles;
            return (
              <button
                type="button"
                key={String(v)}
                className={tab === v ? "active" : ""}
                onClick={() => setTab(v as typeof tab)}
              >
                <I size={18} />
                {String(t)}
              </button>
            );
          })}
        </div>
        <form className="card settings-form" onSubmit={save}>
          {tab === "intelligence" && (
            <>
              <div className="card-heading">
                <div>
                  <h2>Inteligência da SDR</h2>
                  <p>Troque o motor sem alterar seus contatos e históricos.</p>
                </div>
                <Sparkles size={20} className="muted" />
              </div>
              <div className="form-grid">
                <label>
                  Motor de conversa
                  <select
                    value={cfg.provider}
                    onChange={(e) => patch("provider", e.target.value)}
                  >
                    <option>França IA</option>
                    <option>Regras (teste)</option>
                    <option>OpenAI</option>
                    <option>Ollama local</option>
                  </select>
                </label>
                <label>
                  Modelo OpenAI
                  <input
                    required
                    value={cfg.openai_model}
                    onChange={(e) => patch("openai_model", e.target.value)}
                  />
                </label>
                <label className="full">
                  Chave OpenAI
                  <input
                    type="password"
                    autoComplete="off"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder={
                      state.key_ready
                        ? "Chave disponível · deixe vazio para manter"
                        : "Informe a chave apenas nesta sessão"
                    }
                  />
                  <small>
                    A chave não é salva no banco. Ao reiniciar, informe
                    novamente ou use OPENAI_API_KEY.
                  </small>
                </label>
                <label>
                  Modelo instalado no Ollama
                  <input
                    value={cfg.local_model}
                    placeholder="Nome exato do modelo"
                    onChange={(e) => patch("local_model", e.target.value)}
                  />
                </label>
                <label>
                  Servidor Ollama local
                  <input
                    value={cfg.local_url}
                    onChange={(e) => patch("local_url", e.target.value)}
                  />
                </label>
              </div>
            </>
          )}
          {tab === "approach" && (
            <>
              <div className="card-heading">
                <div>
                  <h2>Abordagem e conhecimento</h2>
                  <p>O que a assistente pode dizer sobre o Grupo França.</p>
                </div>
              </div>
              {(
                [
                  ["outbound", "Primeira mensagem · outbound"],
                  ["inbound", "Recepção · inbound"],
                  ["question", "Pergunta sobre a necessidade"],
                  ["invite", "Convite para reunião"],
                  [
                    "knowledge",
                    "Base comercial para OpenAI/Ollama (na França IA, use a tela França IA)",
                  ],
                ] as const
              ).map(([k, t]) => (
                <label className="field" key={k}>
                  {t}
                  <textarea
                    required
                    maxLength={10000}
                    rows={k === "knowledge" ? 5 : 3}
                    value={cfg[k]}
                    onChange={(e) => patch(k, e.target.value)}
                  />
                </label>
              ))}
            </>
          )}
          {tab === "schedule" && (
            <>
              <div className="card-heading">
                <div>
                  <h2>Agenda e limites</h2>
                  <p>
                    Disponibilidade de reservas e consumo de chamadas de IA.
                  </p>
                </div>
              </div>
              <div className="form-grid">
                <label>
                  Início do atendimento (hora)
                  <input
                    type="number"
                    required
                    min={0}
                    max={23}
                    value={cfg.start}
                    onChange={(e) => patch("start", Number(e.target.value))}
                  />
                </label>
                <label>
                  Fim do atendimento (hora)
                  <input
                    type="number"
                    required
                    min={1}
                    max={24}
                    value={cfg.end}
                    onChange={(e) => patch("end", Number(e.target.value))}
                  />
                </label>
                <label className="full">
                  Limite diário de chamadas de IA
                  <input
                    aria-label="Limite diário de chamadas de IA"
                    type="number"
                    required
                    min={1}
                    max={10000}
                    value={cfg.daily_limit}
                    onChange={(e) =>
                      patch("daily_limit", Number(e.target.value))
                    }
                  />
                  <small>
                    O limite considera tentativas de chamada, inclusive falhas.
                    Regras locais não consomem chamadas.
                  </small>
                </label>
              </div>
              <div className="info-banner">
                <Clock3 size={18} />
                <span>
                  Reuniões de 30 minutos, de segunda a sexta, no horário de
                  Brasília. Intervalo de 12h às 13h indisponível.
                </span>
              </div>
            </>
          )}
          <div className="settings-save">
            <span>As alterações só entram em vigor ao salvar.</span>
            <Button type="submit" variant="primary" disabled={busy}>
              <Save size={16} />
              {busy ? "Salvando…" : "Salvar configurações"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
