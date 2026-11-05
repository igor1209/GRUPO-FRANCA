import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Users,
  MessagesSquare,
  CalendarCheck,
  Clock3,
  Target,
  Activity,
  Workflow,
  Sparkles,
  Check,
  ChevronRight,
} from "lucide-react";
import type { Page, State } from "./types";
import {
  Button,
  Empty,
  Header,
  MiniTable,
  NewButton,
  Avatar,
} from "./components";
import { date } from "./api";
function percent(a: number, b: number) {
  return b ? ((a / b) * 100).toFixed(1).replace(".", ",") + "%" : "—";
}
function dayKey(d: Date) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
function ActivityChart({ state }: { state: State }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(state.now);
    d.setDate(d.getDate() - 6 + i);
    return {
      key: dayKey(d),
      label: d
        .toLocaleDateString("pt-BR", { weekday: "short" })
        .replace(".", ""),
    };
  });
  const values = days.map(
    (d) =>
      state.workspace.history.filter(
        (m) => m.role === "user" && m.created.slice(0, 10) === d.key,
      ).length,
  );
  const max = Math.max(4, ...values),
    points = values
      .map((v, i) => `${40 + i * 78},${145 - (v / max) * 112}`)
      .join(" ");
  return (
    <div className="chart-block">
      <div className="chart-legend">
        <span>
          <i />
          Mensagens recebidas
        </span>
        <small>Últimos 7 dias</small>
      </div>
      <svg
        viewBox="0 0 550 180"
        role="img"
        aria-label={
          "Mensagens recebidas por dia: " +
          days.map((d, i) => d.label + " " + values[i]).join(", ")
        }
      >
        <defs>
          <linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="#3b82f6" stopOpacity=".22" />
            <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((n) => (
          <g key={n}>
            <line
              x1="35"
              x2="525"
              y1={145 - n * 28}
              y2={145 - n * 28}
              className="gridline"
            />
            <text x="9" y={149 - n * 28}>
              {Math.round((max * n) / 4)}
            </text>
          </g>
        ))}
        <polygon points={`40,145 ${points} 508,145`} fill="url(#area-fill)" />
        <polyline
          points={points}
          fill="none"
          stroke="#397df5"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {values.map((v, i) => (
          <g key={i}>
            <circle
              cx={40 + i * 78}
              cy={145 - (v / max) * 112}
              r="4"
              fill="#fff"
              stroke="#397df5"
              strokeWidth="2"
            />
            <text textAnchor="middle" x={40 + i * 78} y="174">
              {days[i].label}
            </text>
            <title>{values[i]} resposta(s)</title>
          </g>
        ))}
      </svg>
      {values.every((v) => v === 0) && (
        <small className="chart-note">
          As primeiras respostas aparecerão aqui.
        </small>
      )}
    </div>
  );
}
export function Dashboard({
  state,
  open,
  navigate,
  newContact,
}: {
  state: State;
  open: (id: number) => void;
  navigate: (p: Page) => void;
  newContact: () => void;
}) {
  const [period, setPeriod] = useState(30);
  const cutoff = new Date(state.now);
  cutoff.setDate(cutoff.getDate() - period);
  const leads = state.leads.filter(
    (l) => !period || l.created >= dayKey(cutoff),
  );
  const ids = new Set(leads.map((l) => l.id));
  const replied = new Set(
    state.workspace.history
      .filter((m) => m.role === "user" && ids.has(m.lead_id))
      .map((m) => m.lead_id),
  ).size;
  const needs = leads.filter((l) => l.need).length,
    meetings = state.meetings.filter((m) => ids.has(m.lead_id)).length;
  const returns = state.leads
    .filter((l) => l.followup && !l.blocked)
    .sort((a, b) => a.followup.localeCompare(b.followup));
  const funnel = [
    { name: "Contatos cadastrados", n: leads.length, color: "blue" },
    { name: "Contatos que responderam", n: replied, color: "cyan" },
    { name: "Necessidade registrada", n: needs, color: "violet" },
    { name: "Reuniões reservadas", n: meetings, color: "green" },
  ];
  const today = state.now.slice(0, 10);
  return (
    <>
      <Header
        title="Visão geral"
        description="Cada conversa, uma nova oportunidade."
      >
        <select
          aria-label="Período de cadastro"
          value={period}
          onChange={(e) => setPeriod(Number(e.target.value))}
        >
          <option value={7}>Cadastros · 7 dias</option>
          <option value={30}>Cadastros · 30 dias</option>
          <option value={0}>Todos os cadastros</option>
        </select>
        <NewButton onClick={newContact} />
      </Header>
      <section className="welcome-banner">
        <div className="welcome-content">
          <span className="banner-label">
            <span className="live-dot" />
            SEU COMERCIAL EM MOVIMENTO
          </span>
          <h2>
            O próximo crescimento
            <br />
            começa com uma conversa.
          </h2>
          <p>Organize sua base. Conecte oportunidades. Avance com clareza.</p>
          <Button
            onClick={() =>
              navigate(state.leads.length ? "pipeline" : "contacts")
            }
          >
            Explorar oportunidades
            <ArrowUpRight size={17} />
          </Button>
        </div>
        <div className="banner-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <div className="art-tile art-users">
            <Users size={23} />
          </div>
          <div className="art-tile art-target">
            <Target size={32} />
          </div>
          <div className="art-tile art-growth">
            <ChartIcon />
          </div>
          <span className="art-dot dot-one" />
          <span className="art-dot dot-two" />
        </div>
        <div className="banner-corner">GRUPO FRANÇA ↗</div>
      </section>
      <div className="metrics-grid">
        {[
          {
            label: "Contatos na base",
            n: leads.length,
            sub: "Cadastrados no período",
            Icon: Users,
            color: "blue",
          },
          {
            label: "Em conversa",
            n: leads.filter(
              (l) => !l.paused && !l.blocked && l.phase !== "booked",
            ).length,
            sub: "Disponíveis no período",
            Icon: MessagesSquare,
            color: "violet",
          },
          {
            label: "Reuniões futuras",
            n: state.meetings.filter((m) => m.start > state.now).length,
            sub: "Reservas registradas",
            Icon: CalendarCheck,
            color: "green",
          },
          {
            label: "Retornos pendentes",
            n: returns.length,
            sub:
              returns.filter((l) => l.followup <= state.now).length +
              " retorno(s) vencido(s)",
            Icon: Clock3,
            color: "amber",
          },
        ].map(({ label, n, sub, Icon, color }) => (
          <article key={label} className={"metric " + color}>
            <div className="metric-top">
              <span>{label}</span>
              <div className="metric-icon">
                <Icon size={18} />
              </div>
            </div>
            <strong>{n.toLocaleString("pt-BR")}</strong>
            <div className="metric-sub">
              <span className="tiny-dot" />
              {sub}
            </div>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="card funnel-card">
          <div className="card-heading">
            <div>
              <h2>Funil de resultados</h2>
              <p>Do primeiro contato à reunião.</p>
            </div>
            <span className="label-tag">Coorte de cadastro</span>
          </div>
          <div className="funnel-rows">
            {funnel.map((f, i) => (
              <div key={f.name} className="funnel-line">
                <span className="funnel-number">0{i + 1}</span>
                <div
                  className={"funnel-bar " + f.color}
                  style={{ width: `${100 - i * 13}%` }}
                >
                  <span>{f.name}</span>
                  <b>{f.n}</b>
                </div>
              </div>
            ))}
          </div>
          <div className="funnel-footer">
            <div>
              <small>Conversão para reserva</small>
              <strong>{percent(meetings, leads.length)}</strong>
            </div>
            <Button variant="text" onClick={() => navigate("pipeline")}>
              Ver funil
              <ArrowRight size={15} />
            </Button>
          </div>
        </section>
        <section className="card">
          <div className="card-heading">
            <div>
              <h2>Ritmo da operação</h2>
              <p>Acompanhe suas conversas ao longo da semana.</p>
            </div>
            <Activity size={18} className="muted" />
          </div>
          <ActivityChart state={state} />
          <div className="chart-summary">
            <div>
              <small>Respostas hoje</small>
              <b>
                {
                  state.workspace.history.filter(
                    (m) =>
                      m.role === "user" && m.created.slice(0, 10) === today,
                  ).length
                }
              </b>
            </div>
            <div>
              <small>Cadências em andamento</small>
              <b>
                {
                  state.workspace.runs.filter((r) => r.status === "active")
                    .length
                }
              </b>
            </div>
          </div>
        </section>
        <section className="card recent-card">
          <div className="card-heading">
            <div>
              <h2>Oportunidades recentes</h2>
              <p>Continue de onde a conversa parou.</p>
            </div>
            <Button variant="text" onClick={() => navigate("contacts")}>
              Ver contatos
              <ArrowUpRight size={15} />
            </Button>
          </div>
          <MiniTable
            leads={state.leads.slice(0, 4)}
            state={state}
            open={open}
          />
        </section>
        <section className="card next-card">
          <div className="card-heading">
            <div>
              <h2>Na sua próxima ação</h2>
              <p>Foco no que faz a operação avançar.</p>
            </div>
            <CalendarDaysIcon />
          </div>
          {returns.length ? (
            <div className="task-list">
              {returns.slice(0, 3).map((l) => (
                <button key={l.id} onClick={() => open(l.id)}>
                  <Avatar name={l.company || l.name} />
                  <span>
                    <b>{l.company || l.name}</b>
                    <small className={l.followup <= state.now ? "overdue" : ""}>
                      {date(l.followup)}
                      {l.followup <= state.now ? " · Vencido" : ""}
                    </small>
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          ) : (
            <div className="all-clear">
              <span>
                <Check size={21} />
              </span>
              <div>
                <b>Tudo em dia por aqui</b>
                <p>Seus próximos retornos aparecerão neste espaço.</p>
              </div>
            </div>
          )}
          <div className="assistant-strip">
            <div className="assistant-icon">
              <Sparkles size={19} />
            </div>
            <div>
              <b>Sua assistente comercial</b>
              <small>
                {state.config.provider === "Regras (teste)"
                  ? "Modo de regras para testar o fluxo"
                  : state.config.provider + " selecionado"}
              </small>
            </div>
            <Button
              variant="icon"
              title="Configurar assistente"
              onClick={() => navigate("settings")}
            >
              <ArrowUpRight size={17} />
            </Button>
          </div>
          <Button variant="text" onClick={() => navigate("cadences")}>
            Organizar cadências
            <Workflow size={15} />
          </Button>
        </section>
      </div>
      <p className="data-note">
        Visão operacional: inclui testes e recebimentos reais identificados no
        histórico. Use Análise comercial para indicadores exclusivos de
        atividade real.
      </p>
    </>
  );
}
function ChartIcon() {
  return (
    <svg width="42" height="35" viewBox="0 0 42 35">
      <path
        d="M2 29L14 18L23 22L38 5M27 5H38V16"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
function CalendarDaysIcon() {
  return <CalendarCheck size={18} className="muted" />;
}
