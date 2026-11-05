// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Contacts, FrancaAI, Growth, Integrations } from "./Platform";
import type { State } from "./types";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);
function fixture() {
  const lead = {
    id: 1,
    name: "Ana",
    company: "Empresa",
    contact: "ana@example.test",
    origin: "Outbound",
    target: "B2B",
    phase: "need",
    need: "",
    notes: "",
    followup: "",
    paused: 0,
    blocked: 0,
    created: "2030-11-01T09:00:00",
    updated: "2030-11-01T09:00:00",
  };
  const commercial = {
    profiles: {
      "1": {
        email: lead.contact,
        segment: "Tecnologia",
        source: "Mapa",
        goal: "",
        timing: "",
        qualified: 0,
        outcome: "open",
        reason: "",
      },
    },
    mail: [],
    calendar: [],
    knowledge: [],
    examples: [],
    model: null,
    connections: {
      values: {},
      configured: { smtp: true, imap: true, google: true },
      checked: {},
    },
  };
  return {
    leads: [lead],
    meetings: [],
    phases: { need: "Entender relato" },
    config: { provider: "Regras (teste)" },
    now: lead.created,
    key_ready: false,
    workspace: { meta: {}, history: [], cadences: [], runs: [], usage: [] },
    commercial,
  } as unknown as State;
}
function props() {
  return {
    busy: false,
    notify: vi.fn(),
    open: vi.fn(),
    confirm: vi.fn(),
    edit: vi.fn(),
    newContact: vi.fn(),
  };
}
it("requires a fresh import preview after changing column mapping", async () => {
  const preview = {
    batch: "batch",
    headers: ["Nome", "Empresa"],
    mapping: { name: "Nome", company: "Empresa" },
    rows: [
      {
        line: 2,
        row: { name: "Bia", company: "Clínica" },
        status: "ready",
        reason: "",
      },
    ],
  };
  const act = vi.fn(
    async (_data: Record<string, unknown>) =>
      preview as unknown as Record<string, unknown>,
  );
  render(<Contacts {...props()} state={fixture()} act={act} />);
  fireEvent.click(screen.getByRole("button", { name: "Importar CSV" }));
  const bytes = new TextEncoder().encode("Nome;Empresa\nBia;Clínica");
  fireEvent.change(screen.getByLabelText(/Arquivo CSV/), {
    target: {
      files: [{ size: bytes.length, arrayBuffer: async () => bytes.buffer }],
    },
  });
  const confirm = await screen.findByRole("button", {
    name: "Confirmar importação",
  });
  expect((confirm as HTMLButtonElement).disabled).toBe(false);
  fireEvent.change(screen.getByLabelText("Nome", { exact: true }), {
    target: { value: "Empresa" },
  });
  expect((confirm as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(
    screen.getByRole("button", {
      name: "Reanalisar com o mapeamento escolhido",
    }),
  );
  await waitFor(() =>
    expect(
      (
        screen.getByRole("button", {
          name: "Confirmar importação",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  );
  expect(
    act.mock.calls.every(
      ([data]) => !data || data.action !== "gf_import_commit",
    ),
  ).toBe(true);
});
it("reviews recipient and body before invoking a real email send", async () => {
  const state = fixture() as State & { commercial: { mail: unknown[] } };
  state.commercial.mail = [
    {
      id: "out1",
      lead_id: 1,
      direction: "out",
      recipient: "ana@example.test",
      subject: "Abordagem",
      body: "Olá Ana, podemos conversar?",
      mode: "manual",
      status: "draft",
      error: "",
      created: state.now,
    },
  ];
  const act = vi.fn(async (_data: Record<string, unknown>) => ({
    status: "sent",
  }));
  render(<Integrations {...props()} state={state} act={act} />);
  fireEvent.click(screen.getByRole("button", { name: "Revisar e enviar" }));
  expect(act).not.toHaveBeenCalled();
  expect(
    screen.getByRole("heading", { name: "Confirmar envio real" }),
  ).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Enviar para este contato" }),
  );
  await waitFor(() =>
    expect(act).toHaveBeenCalledWith({
      action: "gf_mail_send",
      mail: "out1",
      confirmed: true,
    }),
  );
});
it("offers explicit example approval and training for the own AI", async () => {
  const act = vi.fn(async (_data: Record<string, unknown>) => ({ ok: true }));
  render(<FrancaAI {...props()} state={fixture()} act={act} />);
  fireEvent.change(screen.getByLabelText("Mensagem de exemplo"), {
    target: { value: "Precisamos organizar as vendas" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Aprovar exemplo" }));
  await waitFor(() =>
    expect(act).toHaveBeenCalledWith({
      action: "gf_example",
      text: "Precisamos organizar as vendas",
      label: "statement",
    }),
  );
  expect(act.mock.calls.some(([data]) => data.action === "gf_train")).toBe(
    false,
  );
});
it("requests real metrics by period and source without an update loop", async () => {
  const report = {
    counts: { sent: 3, received: 1, qualified: 1, meeting_booked: 0, won: 0 },
    cohort: { received: 1 },
    approached: 3,
    daily: {},
    sources: ["Mapa"],
    failures: 0,
  };
  const act = vi.fn(async (_data: Record<string, unknown>) => report);
  render(<Growth {...props()} state={fixture()} act={act} />);
  await screen.findByText("Contatos com envio real");
  expect(act).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText("Fonte"), {
    target: { value: "Mapa" },
  });
  await waitFor(() => expect(act).toHaveBeenCalledTimes(2));
  expect(act.mock.calls[1][0].source).toBe("Mapa");
});
it('requires explicit activation before enabling automatic real replies',async()=>{
  const act=vi.fn(async(_data:Record<string,unknown>)=>({ok:true}));
  render(<Integrations {...props()} state={fixture()} act={act}/>);
  fireEvent.click(screen.getByRole('button',{name:'Ativar atendimento automático'}));
  expect(act).not.toHaveBeenCalled();
  expect(screen.getByRole('heading',{name:'Ativar respostas automáticas reais'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Confirmar ativação automática'}));
  await waitFor(()=>expect(act).toHaveBeenCalledWith({action:'gf_automation',enabled:true,limit:40,calendar:false}));
});
