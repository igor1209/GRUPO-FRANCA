import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  BarChart3,
  CalendarCheck,
  Check,
  GripVertical,
  Mail,
  MoreHorizontal,
  Plus,
  Send,
  Target,
  Users,
} from "lucide-react";
import { api, csv, date } from "./api";
import { Avatar, Button, Empty, Header, Modal, NewButton } from "./components";
import { FrancaAI, Integrations } from "./Platform";
import { can, commercialStage, type Action, type Lead, type State, type User } from "./types";

type Props = { state: State; act: Action; busy: boolean };
const stages: Record<string, string> = {
  new: "Novos",
  contacted: "Contatados",
  qualified: "Qualificados",
  meeting: "Reunião",
  proposal: "Proposta",
  won: "Ganho",
  lost: "Perdido",
};
const tones = ["blue", "amber", "violet", "cyan", "violet", "green", "red"];
export const stageOf = commercialStage;

export function Overview({
  state,
  open,
  navigate,
  newContact,
}: {
  state: State;
  open: (id: number) => void;
  navigate: (page: import("./types").Page) => void;
  newContact: () => void;
}) {
  const won = state.leads.filter((l) => stageOf(state, l) === "won").length;
  const due = state.leads
    .filter((l) => l.followup && l.followup <= state.now && !l.blocked)
    .sort((a, b) => a.followup.localeCompare(b.followup));
  const upcoming = state.meetings
    .filter((m) => m.start >= state.now)
    .sort((a, b) => a.start.localeCompare(b.start));
  const cards = [
    ["Contatos", state.leads.length, Users],
    [
      "Qualificados",
      state.leads.filter((l) =>
        ["qualified", "meeting", "proposal"].includes(stageOf(state, l)),
      ).length,
      Target,
    ],
    ["Reuniões futuras", upcoming.length, CalendarCheck],
    ["Vendas registradas", won, BarChart3],
  ] as const;
  return (
    <>
      <Header
        title="Visão geral"
        description={
          state.user?.role === "manager"
            ? "Sua operação comercial."
            : "Sua carteira de clientes."
        }
      >
        {can(state, "create") && <NewButton onClick={newContact} />}
      </Header>
      <div className="work-stats">
        {cards.map(([label, value, Icon]) => (
          <article className="card" key={label}>
            <Icon size={18} />
            <span>{label}</span>
            <b>{value}</b>
          </article>
        ))}
      </div>
      <div className="work-home-grid">
        <section className="card work-pad">
          <div className="work-title">
            <h2>Funil comercial</h2>
            <Button variant="text" onClick={() => navigate("pipeline")}>
              Abrir funil <ArrowUpRight size={15} />
            </Button>
          </div>
          <div className="compact-funnel">
            {Object.entries(stages).map(([key, label], i) => {
              const count = state.leads.filter(
                (l) => stageOf(state, l) === key,
              ).length;
              return (
                <div key={key}>
                  <span>
                    <i className={"tiny-dot " + tones[i]} />
                    {label}
                  </span>
                  <div className="funnel-track">
                    <i
                      style={{
                        width: state.leads.length
                          ? `${Math.max(count ? 2 : 0, (100 * count) / state.leads.length)}%`
                          : "0%",
                      }}
                    />
                  </div>
                  <b>{count}</b>
                </div>
              );
            })}
          </div>
        </section>
        <section className="card work-pad">
          <div className="work-title">
            <h2>Retornos pendentes</h2>
            <span className="count-badge">{due.length}</span>
          </div>
          {due.length ? (
            due.slice(0, 5).map((l) => (
              <button
                className="work-list-row"
                key={l.id}
                onClick={() => open(l.id)}
              >
                <Avatar name={l.name || l.company} />
                <span>
                  <b>{l.name || l.company}</b>
                  <small>{date(l.followup)}</small>
                </span>
                <ArrowUpRight size={15} />
              </button>
            ))
          ) : (
            <Empty
              title="Tudo em dia"
              description="Seus retornos aparecerão aqui."
            />
          )}
        </section>
      </div>
      <section className="card work-pad">
        <div className="work-title">
          <h2>Próximas reuniões</h2>
          <Button variant="text" onClick={() => navigate("agenda")}>
            Ver agenda <ArrowUpRight size={15} />
          </Button>
        </div>
        {upcoming.length ? (
          upcoming.slice(0, 4).map((m) => (
            <button
              className="work-list-row"
              key={m.id}
              onClick={() => open(m.lead_id)}
            >
              <CalendarCheck size={20} />
              <span>
                <b>{m.name || m.company}</b>
                <small>{date(m.start)}</small>
              </span>
              <ArrowUpRight size={15} />
            </button>
          ))
        ) : (
          <p>Nenhuma reunião agendada.</p>
        )}
      </section>
    </>
  );
}

export function SalesPipeline({
  state,
  act,
  busy,
  open,
  newContact,
}: Props & { open: (id: number) => void; newContact: () => void }) {
  const [drag, setDrag] = useState<number | null>(null),
    [over, setOver] = useState(""),
    [q, setQ] = useState(""),
    [owner, setOwner] = useState("");
  const labels = state.team?.stage_labels || stages;
  const rows = state.leads.filter(
    (l) =>
      (l.name + " " + l.company + " " + l.contact)
        .toLowerCase()
        .includes(q.toLowerCase()) &&
      (!owner || state.team?.assignments[l.id] === Number(owner)),
  );
  async function move(id: number, key: string) {
    if (!busy && can(state, "move"))
      await act({ action: "team_move", id, stage: key });
    setDrag(null);
    setOver("");
  }
  return (
    <>
      <Header
        title="Funil comercial"
        description="Arraste os contatos entre as etapas."
      >
        {can(state, "create") && <NewButton onClick={newContact} />}
      </Header>
      <div className="toolbar work-filter">
        <input
          aria-label="Buscar no funil"
          placeholder="Buscar contato…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {state.user?.role === "manager" && (
          <select
            aria-label="Filtrar responsável"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          >
            <option value="">Todos os responsáveis</option>
            {state.team?.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="sales-board">
        {Object.entries(labels).map(([key, label], index) => {
          const leads = rows.filter((l) => stageOf(state, l) === key);
          return (
            <section
              key={key}
              className={
                "sales-column " +
                tones[index] +
                " " +
                (over === key ? "drop-target" : "")
              }
              onDragOver={(e) => {
                if (drag !== null && !busy) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setOver(key);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (drag !== null) void move(drag, key);
              }}
            >
              <header>
                <span>
                  <i className="tiny-dot" />
                  {label}
                </span>
                <b>{leads.length}</b>
              </header>
              <div className="sales-cards">
                {leads.map((l) => (
                  <article
                    className={
                      "sales-lead " + (drag === l.id ? "dragging" : "")
                    }
                    key={l.id}
                    draggable={!busy && can(state, "move") && !l.blocked}
                    onDragStart={(e) => {
                      setDrag(l.id);
                      e.dataTransfer.setData("text/plain", String(l.id));
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setDrag(null);
                      setOver("");
                    }}
                  >
                    <div className="sales-lead-title">
                      <button onClick={() => open(l.id)}>
                        <b>{l.name || l.company}</b>
                      </button>
                      <GripVertical size={15} />
                    </div>
                    <small>{l.company || "Sem empresa"}</small>
                    <small>{l.contact || "Sem contato"}</small>
                    {Boolean(l.blocked || l.paused) && (
                      <span
                        className={"status " + (l.blocked ? "red" : "amber")}
                      >
                        {l.blocked ? "Não contatar" : "IA pausada"}
                      </span>
                    )}
                    <footer>
                      <span>
                        {state.workspace.meta[l.id]?.owner || state.user?.name}
                      </span>
                      <Button
                        variant="icon"
                        title="Abrir contato"
                        onClick={() => open(l.id)}
                      >
                        <ArrowUpRight size={15} />
                      </Button>
                    </footer>
                    <select
                      aria-label={"Mover " + (l.name || l.company)}
                      value={key}
                      disabled={
                        busy || !can(state, "move") || Boolean(l.blocked)
                      }
                      onChange={(e) => void move(l.id, e.target.value)}
                    >
                      {Object.entries(labels).map(([v, t]) => (
                        <option key={v} value={v}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </article>
                ))}
                {!leads.length && <p className="sales-empty">Nenhum contato</p>}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

type Performance = {
  user: User;
  leads: number;
  wins: number;
  activities: number;
  moves: number;
  contacts_worked: number;
  overdue: number;
  meetings: number;
  last_activity: string;
  conversion: number;
};
type Report = {
  rows: Performance[];
  audit: {
    id: number;
    created: string;
    action: string;
    lead_id: number | null;
    actor: string;
    contact: string | null;
    detail: string;
  }[];
  start: string;
  end: string;
};
const auditLabels: Record<string, string> = {
  wa_send: "Enviou mensagem pelo WhatsApp",
  wa_test: "Testou mensagem de WhatsApp",
  wa_connect: "Iniciou conexão de WhatsApp",
  wa_disconnect: "Desconectou WhatsApp",
  wa_connection_create: "Cadastrou conexão de WhatsApp",
  wa_connection_assign: "Alterou responsável pelo WhatsApp",
  team_move: "Mudou etapa",
  team_assign: "Distribuiu contato",
  gf_profile: "Salvou contato",
  create: "Cadastrou contato",
  notes: "Salvou acompanhamento",
  gf_mail_send: "Envio de e-mail",
  gf_mail_draft: "Preparou e-mail",
  send: "Simulação de conversa",
  retry: "Simulação de resposta",
  gf_book: "Reservou reunião",
  cancel: "Cancelou reunião",
  block: "Bloqueou contato",
  team_user_create: "Cadastrou funcionário",
  team_user_update: "Alterou acesso",
  team_user_password: "Redefiniu senha",
  config: "Ajustou agente",
  gf_import_commit: "Importou contatos",
  pause: "Pausou / retomou IA",
};
export function Management({ state, act, busy }: Props) {
  const [tab, setTab] = useState("performance"),
    [report, setReport] = useState<Report | null>(null),
    [failure, setFailure] = useState(""),
    [revision, setRevision] = useState(0),
    [adding, setAdding] = useState(false),
    [editing, setEditing] = useState<User | null>(null),
    [reset, setReset] = useState<User | null>(null),
    [assignments, setAssignments] = useState<Record<string, string>>({}),
    [query, setQuery] = useState(""),
    [selectedIds,setSelectedIds]=useState<number[]>([]),
    [batchOwner,setBatchOwner]=useState(""),
    [loading,setLoading]=useState(false);
  const today = state.now.slice(0, 10),
    [start, setStart] = useState(today.slice(0, 8) + "01"),
    [end, setEnd] = useState(today);
  useEffect(() => {
    let active = true;
    setFailure("");
    setLoading(true);
    setReport(null);
    api<Report>("/api/action", { action: "team_management", start, end })
      .then((r) => {
        if (active) {setReport(r);setLoading(false);}
      })
      .catch((e) => {
        if (active) {setFailure(e.message);setLoading(false);}
      });
    return () => {
      active = false;
    };
  }, [start, end, state, revision]);
  const distributionRows=state.leads.filter(l=>(l.name+' '+l.company).toLowerCase().includes(query.toLowerCase()));
  const selectedVisible=selectedIds.filter(id=>state.leads.some(l=>l.id===id));
  const selectable=distributionRows.slice(0,500).map(l=>l.id);
  const allSelected=selectable.length>0&&selectable.every(id=>selectedVisible.includes(id));
  async function submitUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const result = await act(
      editing
        ? {
            action: "team_user_update",
            user_id: editing.id,
            permissions: f.getAll("permissions"),
            active: f.get("active") === "on",
            target: Number(f.get("target")),
          }
        : {
            action: "team_user_create",
            name: f.get("name"),
            username: f.get("username"),
            password: f.get("password"),
            permissions: f.getAll("permissions"),
          },
    );
    if (result) {
      setAdding(false);
      setEditing(null);
      setRevision((v) => v + 1);
    }
  }
  return (
    <>
      <Header title="Equipe" description="Gestão comercial e acessos." />
      <div className="work-tabs">
        {[
          ["performance", "Desempenho"],
          ["users", "Usuários"],
          ["assign", "Distribuição"],
          ["audit", "Atividades"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {failure&&<p role="alert" className="gf-error">{failure}</p>}
      {loading&&['performance','audit'].includes(tab)&&<p role="status">Atualizando indicadores…</p>}
      {tab === "performance" && (
        <>
          <div className="toolbar work-filter">
            <label>
              De
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label>
              Até
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
            <Button
              disabled={!report||loading||Boolean(failure)}
              onClick={() =>
                report &&
                csv(
                  "equipe-grupo-franca.csv",
                  [
                    "Pessoa",
                    "Carteira atual",
                    "Contatos trabalhados",
                    "Reuniões reais",
                    "Vendas registradas",
                    "Retornos vencidos",
                  ],
                  report.rows.map((r) => [
                    r.user.name,
                    r.leads,
                    r.contacts_worked,
                    r.meetings,
                    r.wins,
                    r.overdue,
                  ]),
                )
              }
            >
              Exportar
            </Button>
          </div>

          {report&&<><div className="work-stats">
            {[
              [
                "Vendas registradas",
                report?.rows.reduce((n, r) => n + r.wins, 0) || 0,
              ],
              [
                "Contatos trabalhados",
                report?.rows.reduce((n, r) => n + r.contacts_worked, 0) || 0,
              ],
              [
                "Reuniões reais",
                report?.rows.reduce((n, r) => n + r.meetings, 0) || 0,
              ],
              [
                "Retornos vencidos",
                report?.rows.reduce((n, r) => n + r.overdue, 0) || 0,
              ],
            ].map(([label, value]) => (
              <article className="card" key={label}>
                <span>{label}</span>
                <b>{value}</b>
              </article>
            ))}
          </div>
          <section className="card work-pad">
            <h2>Resultados por pessoa</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Posição</th>
                    <th>Pessoa</th>
                    <th>Carteira atual</th>
                    <th>Trabalhados</th>
                    <th>Reuniões reais</th>
                    <th>Vendas</th>
                    <th>Retornos vencidos</th>
                    <th>Meta mensal</th>
                  </tr>
                </thead>
                <tbody>
                  {report?.rows.map((r, i) => (
                    <tr key={r.user.id}>
                      <td>{i + 1}</td>
                      <td>
                        <b>{r.user.name}</b>
                        <small className="owner">
                          {r.user.active ? "Ativo" : "Inativo"}
                        </small>
                      </td>
                      <td>{r.leads}</td>
                      <td>{r.contacts_worked}</td>
                      <td>{r.meetings}</td>
                      <td>
                        <b>{r.wins}</b>
                      </td>
                      <td>{r.overdue}</td>
                      <td>{r.user.target || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <details className="work-explanation">
              <summary>Como os números são calculados</summary>
              <p>
                Ranking por vendas registradas e contatos trabalhados no
                período. Vendas são ganhos manuais ainda ativos, na carteira
                atual da pessoa que os registrou; reaberturas são excluídas.
                Reuniões usam reservas reais da carteira atual. Simulações não
                contam como vendas ou reuniões reais. A meta é mensal; compare
                com o mês completo. Retornos e carteira refletem a situação
                atual. Esses registros não medem tempo de trabalho nem
                produtividade fora da plataforma.
              </p>
            </details>
          </section></>}
        </>
      )}
      {tab === "users" && (
        <section className="card work-pad">
          <div className="work-title">
            <h2>Usuários</h2>
            <Button variant="primary" onClick={() => setAdding(true)}>
              <Plus size={16} />
              Novo funcionário
            </Button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Usuário</th>
                  <th>Função</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {state.team?.users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <b>{u.name}</b>
                    </td>
                    <td>{u.username}</td>
                    <td>{u.role === "manager" ? "Gerente" : "Vendedor"}</td>
                    <td>{u.active ? "Ativo" : "Inativo"}</td>
                    <td>
                      {u.role === "seller" && (
                        <div className="row-actions">
                          <Button disabled={busy} onClick={() => setEditing(u)}>
                            Acesso e meta
                          </Button>
                          <Button disabled={busy} onClick={() => setReset(u)}>
                            Nova senha
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "assign" && (
        <section className="card work-pad">
          <div className="work-title">
            <h2>Distribuir contatos</h2>
            <input
              aria-label="Buscar para distribuir"
              placeholder="Buscar contato…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="toolbar work-filter">
            <span>{selectedVisible.length} contato(s) selecionado(s)</span>
            <select aria-label="Responsável do lote" value={batchOwner} disabled={busy} onChange={e=>setBatchOwner(e.target.value)}>
              <option value="">Escolha o responsável</option>
              {state.team?.users.filter(u=>u.active).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <Button variant="primary" disabled={busy||!selectedVisible.length||!batchOwner} onClick={async()=>{
              if(await act({action:'team_assign_many',ids:selectedVisible,user_id:Number(batchOwner)})){setSelectedIds([]);setAssignments({});}
            }}>Atribuir selecionados</Button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th><input type="checkbox" aria-label="Selecionar contatos filtrados" disabled={busy||!selectable.length} checked={allSelected} onChange={e=>setSelectedIds(e.target.checked?[...new Set([...selectedVisible,...selectable])].slice(0,500):selectedVisible.filter(id=>!selectable.includes(id)))}/></th>
                  <th>Contato</th>
                  <th>Responsável atual</th>
                  <th>Atribuir a</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {distributionRows                  .map((l) => (
                    <tr key={l.id}>
                      <td><input type="checkbox" aria-label={'Selecionar '+(l.name||l.company)} checked={selectedVisible.includes(l.id)} disabled={busy||(!selectedVisible.includes(l.id)&&selectedVisible.length>=500)} onChange={e=>setSelectedIds(e.target.checked?[...selectedVisible,l.id]:selectedVisible.filter(id=>id!==l.id))}/></td>
                      <td>
                        <b>{l.name || l.company}</b>
                        <small className="owner">{l.company}</small>
                      </td>
                      <td>
                        {state.workspace.meta[l.id]?.owner || "Não atribuído"}
                      </td>
                      <td>
                        <select
                          aria-label={
                            "Responsável por " + (l.name || l.company)
                          }
                          value={
                            assignments[l.id] ??
                            String(state.team?.assignments[l.id] || "")
                          }
                          onChange={(e) =>
                            setAssignments((v) => ({
                              ...v,
                              [l.id]: e.target.value,
                            }))
                          }
                        >
                          {state.team?.users
                            .filter((u) => u.active)
                            .map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td>
                        <Button
                          disabled={
                            busy ||
                            !assignments[l.id] ||
                            Number(assignments[l.id]) ===
                              state.team?.assignments[l.id]
                          }
                          onClick={async () => {
                            if (
                              await act({
                                action: "team_assign",
                                id: l.id,
                                user_id: Number(assignments[l.id]),
                              })
                            )
                              setAssignments((v) => {
                                const n = { ...v };
                                delete n[l.id];
                                return n;
                              });
                          }}
                        >
                          Salvar
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <small>Selecione até 500 contatos por lote. Atribuições alteram a carteira de acesso do vendedor.</small>
          {!state.leads.length && (
            <Empty
              title="Nenhum contato"
              description="Cadastre ou importe os primeiros contatos."
            />
          )}
        </section>
      )}
      {tab === "audit" && (
        <section className="card work-pad">
          <h2>Atividades no período selecionado</h2>
          <div className="toolbar work-filter">
            <label>
              De
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label>
              Até
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Pessoa</th>
                  <th>Atividade</th>
                  <th>Contato</th>
                </tr>
              </thead>
              <tbody>
                {report?.audit.map((a) => (
                  <tr key={a.id}>
                    <td>{date(a.created)}</td>
                    <td>{a.actor}</td>
                    <td>
                      {auditLabels[a.action] || "Operação interna"}
                      {a.action === "team_move" && (
                        <small className="owner">
                          {stages[JSON.parse(a.detail).from]} →{" "}
                          {stages[JSON.parse(a.detail).to]}
                        </small>
                      )}
                    </td>
                    <td>{a.contact || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <small>Até 100 atividades recentes no período.</small>
        </section>
      )}
      {(adding || editing) && (
        <Modal
          title={editing ? "Acesso e meta" : "Novo funcionário"}
          close={() => {
            setAdding(false);
            setEditing(null);
          }}
          busy={busy}
        >
          <form onSubmit={submitUser}>
            {!editing && (
              <div className="form-grid">
                <label>
                  Nome
                  <input name="name" required maxLength={100} />
                </label>
                <label>
                  Usuário
                  <input
                    name="username"
                    required
                    minLength={3}
                    maxLength={60}
                    autoComplete="off"
                  />
                </label>
                <label className="full">
                  Senha temporária
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={10}
                    maxLength={128}
                    autoComplete="new-password"
                  />
                </label>
                <p className="full">
                  O funcionário definirá uma nova senha no primeiro acesso.
                </p>
              </div>
            )}
            {editing && (
              <div className="form-grid">
                <label>
                  Meta mensal de vendas
                  <input
                    name="target"
                    type="number"
                    min={0}
                    max={100000}
                    defaultValue={editing.target}
                  />
                </label>
                <label className="work-check">
                  <input
                    name="active"
                    type="checkbox"
                    defaultChecked={Boolean(editing.active)}
                  />
                  Acesso ativo
                </label>
              </div>
            )}
            <fieldset className="work-permissions">
              <legend>Permissões</legend>
              {Object.entries(state.team?.permission_labels || {}).map(
                ([key, label]) => (
                  <label key={key}>
                    <input
                      name="permissions"
                      type="checkbox"
                      value={key}
                      defaultChecked={
                        editing
                          ? editing.permissions.includes(key)
                          : !["import", "cadence"].includes(key)
                      }
                    />
                    {label}
                  </label>
                ),
              )}
            </fieldset>
            <div className="modal-actions">
              <Button
                onClick={() => {
                  setAdding(false);
                  setEditing(null);
                }}
                disabled={busy}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={busy}>
                Salvar
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {reset && (
        <Modal
          title={"Nova senha · " + reset.name}
          close={() => setReset(null)}
          busy={busy}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await act({
                  action: "team_user_password",
                  user_id: reset.id,
                  password: f.get("password"),
                })
              )
                setReset(null);
            }}
          >
            <label>
              Senha temporária
              <input
                name="password"
                type="password"
                minLength={10}
                maxLength={128}
                required
                autoComplete="new-password"
              />
            </label>
            <p>
              O usuário será desconectado e precisará trocar a senha ao entrar.
            </p>
            <div className="modal-actions">
              <Button type="submit" variant="primary" disabled={busy}>
                Redefinir senha
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function FixedAgent({ state, act, busy }: Props) {
  const [tab, setTab] = useState("agent");
  const [error, setError] = useState("");
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    if (await act({ action: "config", ...values }))
      setError("Configuração salva.");
  }
  return (
    <>
      <Header
        title="Configurações"
        description="Agente padrão e conexões do Grupo França."
      />
      <div className="work-tabs">
        {[
          ["agent", "Agente comercial"],
          ["channels", "Conexões"],
        ].map(([k, l]) => (
          <button
            className={tab === k ? "active" : ""}
            key={k}
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
      </div>
      {tab === "agent" ? (
        <>
          <section className="card work-pad fixed-agent">
            <div className="work-title">
              <h2>França IA</h2>
              <span className="status green">
                <Check size={13} />
                Agente padrão
              </span>
            </div>
            <p>
              Apresentar o Grupo França, entender a necessidade, qualificar o
              interesse e encaminhar para reunião.
            </p>
            <form onSubmit={save}>
              <div className="form-grid">
                {[
                  ["outbound", "Apresentação na prospecção"],
                  ["inbound", "Recepção de interessados"],
                  ["question", "Pergunta sobre a necessidade"],
                  ["invite", "Convite para reunião"],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <textarea
                      name={key}
                      required
                      maxLength={10000}
                      rows={3}
                      defaultValue={String(
                        state.config[key as keyof typeof state.config],
                      )}
                    />
                  </label>
                ))}
                <label>
                  Início do atendimento
                  <input
                    name="start"
                    type="number"
                    min={0}
                    max={23}
                    defaultValue={state.config.start}
                  />
                </label>
                <label>
                  Fim do atendimento
                  <input
                    name="end"
                    type="number"
                    min={1}
                    max={24}
                    defaultValue={state.config.end}
                  />
                </label>
              </div>
              <div className="modal-actions">
                <span role="status">{error}</span>
                <Button type="submit" variant="primary" disabled={busy}>
                  Salvar agente
                </Button>
              </div>
            </form>
          </section>
          <details className="card work-pad advanced-agent">
            <summary>Base de conhecimento e ajustes avançados</summary>
            <FrancaAI state={state} act={act} busy={busy} />
          </details>
        </>
      ) : (
        <Integrations state={state} act={act} busy={busy} />
      )}
    </>
  );
}

type Letter = {
  id: string;
  lead_id: number;
  direction: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  error: string;
  created: string;
};
export function MailDesk({ state, act, busy }: Props) {
  const [selected, setSelected] = useState(""),
    [review, setReview] = useState<Letter | null>(null),
    [startReal, setStartReal] = useState(false);
  const letters = (
    (state as State & { commercial?: { mail: Letter[] } }).commercial?.mail ||
    []
  ).filter((m) => !selected || m.lead_id === Number(selected));
  return (
    <>
      <Header title="E-mails" description="Mensagens da sua carteira." />
      <section className="card work-pad">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            if (
              await act({
                action: "gf_mail_draft",
                id: Number(selected),
                mode: "manual",
                subject: f.get("subject"),
                body: f.get("body"),
              })
            )
              form.reset();
          }}
        >
          <div className="form-grid">
            <label>
              Contato
              <select
                required
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">Selecione um contato</option>
                {state.leads
                  .filter((l) => !l.blocked)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name || l.company}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Assunto
              <input name="subject" maxLength={200} />
            </label>
            <label className="full">
              Mensagem
              <textarea name="body" rows={4} maxLength={16000} />
            </label>
          </div>
          <div className="gf-actions">
            <Button
              disabled={!selected || busy || !can(state, "message")}
              onClick={() => setStartReal(true)}
            >
              Usar na operação real
            </Button>
            <Button
              type="submit"
              disabled={!selected || busy || !can(state, "message")}
            >
              Criar rascunho
            </Button>
            <Button
              variant="primary"
              disabled={!selected || busy || !can(state, "message")}
              onClick={() =>
                void act({
                  action: "gf_mail_draft",
                  id: Number(selected),
                  mode: "ai",
                })
              }
            >
              Preparar com França IA
            </Button>
          </div>
        </form>
      </section>
      <section className="card work-pad">
        <h2>Mensagens</h2>
        {letters.map((m) => (
          <article className="gf-letter" key={m.id}>
            <div className="work-title">
              <b>{m.recipient}</b>
              <span className="status neutral">
                {{
                  sent: "Aceito pelo SMTP",
                  draft: "Rascunho",
                  received: "Recebido",
                  failed: "Falhou",
                  unknown: "Envio incerto",
                  cancelled: "Cancelado",
                }[m.status] || m.status}
              </span>
            </div>
            <b>{m.subject}</b>
            <small>{date(m.created)}</small>
            <p className="gf-mail-body">{m.body}</p>
            {m.error && <p className="gf-error">{m.error}</p>}
            {["draft", "failed"].includes(m.status) && (
              <div className="gf-actions">
                <Button
                  variant="primary"
                  disabled={busy || !can(state, "message")}
                  onClick={() => setReview(m)}
                >
                  <Send size={15} />
                  Revisar e enviar
                </Button>
                <Button
                  disabled={busy || !can(state, "message")}
                  onClick={() =>
                    void act({ action: "gf_mail_cancel", mail: m.id })
                  }
                >
                  Cancelar rascunho
                </Button>
              </div>
            )}
            {m.status === "unknown" && (
              <small>Peça ao gerente para conferir o envio.</small>
            )}
          </article>
        ))}
        {!letters.length && (
          <Empty
            title="Nenhuma mensagem"
            description="Os e-mails recebidos e preparados aparecerão aqui."
          />
        )}
      </section>
      {review && (
        <Modal
          title="Revisar e enviar"
          close={() => setReview(null)}
          busy={busy}
        >
          <p>Para: {review.recipient}</p>
          <h3>{review.subject}</h3>
          <p className="gf-mail-body">{review.body}</p>
          <div className="modal-actions">
            <Button onClick={() => setReview(null)} disabled={busy}>
              Voltar
            </Button>
            <Button
              variant="primary"
              disabled={busy}
              onClick={async () => {
                if (
                  await act({
                    action: "gf_mail_send",
                    mail: review.id,
                    confirmed: true,
                  })
                )
                  setReview(null);
              }}
            >
              Enviar e-mail
            </Button>
          </div>
        </Modal>
      )}
      {startReal && (
        <Modal
          title="Usar na operação real"
          description="O histórico será preservado. Relato, objetivo, prazo e reservas de teste serão reiniciados. O simulador ficará desativado para este contato."
          close={() => setStartReal(false)}
          busy={busy}
        >
          <div className="modal-actions">
            <Button disabled={busy} onClick={() => setStartReal(false)}>
              Voltar
            </Button>
            <Button
              variant="primary"
              disabled={busy}
              onClick={async () => {
                if (
                  await act({ action: "gf_start_real", id: Number(selected) })
                )
                  setStartReal(false);
              }}
            >
              Confirmar
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
