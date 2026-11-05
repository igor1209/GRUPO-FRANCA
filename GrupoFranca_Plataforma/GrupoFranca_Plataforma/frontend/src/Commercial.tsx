import { useState } from "react";
import {
  ArrowUpRight,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { State, Message } from "./types";
import {
  Avatar,
  Button,
  Empty,
  Header,
  NewButton,
  Phase,
  SearchBox,
} from "./components";
import { csv, date } from "./api";

function Pagination({
  page,
  total,
  size,
  setPage,
}: {
  page: number;
  total: number;
  size: number;
  setPage: (v: number) => void;
}) {
  return (
    <div className="pagination">
      <small>
        {total
          ? `${page * size + 1}–${Math.min((page + 1) * size, total)} de ${total} registros`
          : "0 registros"}
      </small>
      <div>
        <span>
          Página {page + 1} de {Math.max(1, Math.ceil(total / size))}
        </span>
        <Button
          variant="icon"
          title="Página anterior"
          disabled={!page}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft size={16} />
        </Button>
        <Button
          variant="icon"
          title="Próxima página"
          disabled={(page + 1) * size >= total}
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}

export function Pipeline({
  state,
  open,
  newContact,
}: {
  state: State;
  open: (id: number) => void;
  newContact: () => void;
}) {
  const cols = [
    ["Primeiro contato", "blue", ["opening", "need", "goal", "timing"]],
    ["Convite e horário", "violet", ["invite", "schedule", "confirm"]],
    ["Reunião reservada", "green", ["booked"]],
    ["Pausados e encerrados", "amber", []],
  ] as const;
  return (
    <>
      <Header
        title="Funil comercial"
        description="Encontre o próximo passo de cada oportunidade."
      >
        <NewButton onClick={newContact} />
      </Header>
      <div className="pipeline-summary">
        <ColumnsLegend />
        As etapas avançam pela conversa. Pausas e bloqueios são respeitados.
      </div>
      <div className="board">
        {cols.map(([title, color, phases], i) => {
          const rows = state.leads.filter((l) =>
            i === 3
              ? l.paused || l.blocked
              : !l.paused &&
                !l.blocked &&
                (phases as readonly string[]).includes(l.phase),
          );
          return (
            <section className={"board-column " + color} key={title}>
              <header>
                <span>
                  <i className="tiny-dot" />
                  {title}
                </span>
                <b>{rows.length}</b>
              </header>
              <div className="board-content">
                {rows.map((l) => (
                  <button
                    className="opportunity-card"
                    key={l.id}
                    onClick={() => open(l.id)}
                  >
                    <div className="opportunity-top">
                      <Avatar name={l.company || l.name} />
                      <ArrowUpRight size={16} />
                    </div>
                    <b>{l.company || l.name}</b>
                    <small>{l.name}</small>
                    {l.need && <p>{l.need}</p>}
                    <Phase lead={l} state={state} />
                    <footer>
                      <span>{l.origin}</span>
                      <span>
                        {state.workspace.meta[l.id]?.owner || "Igor França"}
                      </span>
                    </footer>
                  </button>
                ))}
                {!rows.length && (
                  <div className="column-empty">
                    <span>＋</span>
                    <p>
                      Oportunidades nesta etapa
                      <br />
                      aparecerão aqui.
                    </p>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function ColumnsLegend() {
  return <span className="live-dot" />;
}

export function InteractionHistory({
  state,
  open,
}: {
  state: State;
  open: (id: number) => void;
}) {
  const [q, setQ] = useState(""),
    [role, setRole] = useState(""),
    [page, setPage] = useState(0);
  const authors: Record<string, string> = {
    user: "Contato",
    assistant: "SDR",
    human: "Operação manual",
    error: "Erro",
  };
  const rows = state.workspace.history.filter(
    (m) =>
      (m.name + " " + m.company + " " + m.contact + " " + m.text)
        .toLowerCase()
        .includes(q.toLowerCase()) &&
      (!role || m.role === role),
  );
  return (
    <>
      <Header
        title="Histórico de interações"
        description="Cada mensagem e ação, com contexto e rastreabilidade."
      >
        <Button
          onClick={() =>
            csv(
              "grupo-franca-historico.csv",
              ["Contato", "Empresa", "Data", "Tipo", "Motor", "Conteúdo"],
              rows.map((m) => [
                m.name,
                m.company,
                m.created,
                authors[m.role],
                m.provider,
                m.text,
              ]),
            )
          }
        >
          <Download size={16} />
          Exportar CSV
        </Button>
      </Header>
      <section className="card">
        <div className="toolbar">
          <SearchBox
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(0);
            }}
            placeholder="Buscar contato, empresa ou conteúdo…"
          />
          <select
            aria-label="Tipo de interação"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Todos os tipos</option>
            {Object.entries(authors).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </div>
        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Contato</th>
                  <th>Data / hora</th>
                  <th>Tipo / motor</th>
                  <th>Interação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(page * 20, (page + 1) * 20).map((m: Message) => (
                  <tr key={m.id}>
                    <td>
                      <b>{m.company || m.name}</b>
                      <small className="owner">{m.contact || m.name}</small>
                    </td>
                    <td className="nowrap">{date(m.created)}</td>
                    <td>
                      <span
                        className={
                          "status " +
                          (m.role === "error"
                            ? "red"
                            : m.role === "assistant"
                              ? "blue"
                              : "neutral")
                        }
                      >
                        {authors[m.role]}
                      </span>
                      <small className="owner">{m.provider}</small>
                    </td>
                    <td>
                      <details className="history-content">
                        <summary>
                          {m.text.slice(0, 100)}
                          {m.text.length > 100 ? "…" : ""}
                        </summary>
                        <p>{m.text}</p>
                      </details>
                    </td>
                    <td>
                      <Button
                        variant="icon"
                        title="Abrir contato"
                        onClick={() => open(m.lead_id)}
                      >
                        <ArrowUpRight size={17} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="O histórico da sua operação"
            description="Conversas e ações internas aparecerão aqui conforme você usar a plataforma."
          />
        )}
        <Pagination
          page={page}
          total={rows.length}
          size={20}
          setPage={setPage}
        />
      </section>
      <p className="data-note">
        Exibindo até 2.000 eventos recentes. O histórico completo de cada
        contato permanece na conversa.
      </p>
    </>
  );
}
