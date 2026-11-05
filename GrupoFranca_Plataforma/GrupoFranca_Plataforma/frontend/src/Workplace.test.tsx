// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  within,
} from "@testing-library/react";
import { SalesPipeline, Management, MailDesk } from "./Workplace";
import { Access } from "./Access";
import type { State, User } from "./types";
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function fixture() {
  const user: User = {
    id: 1,
    name: "Igor França",
    username: "igor",
    role: "manager",
    active: 1,
    permissions: ["create", "move", "message"],
    target: 0,
    must_change: 0,
    created: "2030-11-01",
  };
  return {
    user,
    now: "2030-11-01T09:00:00",
    config: { provider: "França IA" },
    leads: [
      {
        id: 8,
        name: "Ana",
        company: "Empresa",
        contact: "ana@example.test",
        phase: "opening",
        blocked: 0,
        paused: 0,
        created: "2030-11-01",
        updated: "2030-11-01",
        need: "",
        notes: "",
        followup: "",
        origin: "Outbound",
        target: "B2B",
      },
    ],
    meetings: [],
    workspace: { meta: {}, history: [], runs: [], cadences: [], usage: [] },
    team: {
      users: [user],
      assignments: { "8": 1 },
      stages: { "8": "new" },
      stage_labels: {
        new: "Novos",
        contacted: "Contatados",
        qualified: "Qualificados",
        meeting: "Reunião",
        proposal: "Proposta",
        won: "Ganho",
        lost: "Perdido",
      },
      permission_labels: {
        move: "Mover oportunidades",
        create: "Cadastrar contatos",
      },
    },
    commercial: {
      mail: [
        {
          id: "draft1",
          lead_id: 8,
          direction: "out",
          recipient: "ana@example.test",
          subject: "Contato",
          body: "Olá Ana",
          status: "draft",
          created: "2030-11-01",
          error: "",
        },
      ],
    },
  } as unknown as State;
}
it("moves a card using the accessible stage selector and preserves booking separation", async () => {
  const state = fixture(),
    act = vi.fn(async () => ({ ok: true }));
  render(
    <SalesPipeline
      state={state}
      act={act}
      busy={false}
      open={vi.fn()}
      newContact={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Mover Ana"), {
    target: { value: "meeting" },
  });
  await waitFor(() =>
    expect(act).toHaveBeenCalledWith({
      action: "team_move",
      id: 8,
      stage: "meeting",
    }),
  );
  expect(act.mock.calls).toHaveLength(1);
});
it("moves a card by dragging it to a different column", async () => {
  const state = fixture(),
    act = vi.fn(async () => ({ ok: true }));
  const { container } = render(
    <SalesPipeline
      state={state}
      act={act}
      busy={false}
      open={vi.fn()}
      newContact={vi.fn()}
    />,
  );
  const card = container.querySelector(".sales-lead")!,
    column = container.querySelectorAll(".sales-column")[2];
  const transfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };
  fireEvent.dragStart(card, { dataTransfer: transfer });
  fireEvent.dragOver(column, { dataTransfer: transfer });
  fireEvent.drop(column, { dataTransfer: transfer });
  await waitFor(() =>
    expect(act).toHaveBeenCalledWith({
      action: "team_move",
      id: 8,
      stage: "qualified",
    }),
  );
});
it("disables movement for a blocked lead or a seller without permission", () => {
  const state = fixture();
  state.user = { ...state.user!, role: "seller", permissions: [] };
  const act = vi.fn();
  const { container } = render(
    <SalesPipeline
      state={state}
      act={act}
      busy={false}
      open={vi.fn()}
      newContact={vi.fn()}
    />,
  );
  expect(
    (screen.getByLabelText("Mover Ana") as HTMLSelectElement).disabled,
  ).toBe(true);
  expect(
    container.querySelector(".sales-lead")?.getAttribute("draggable"),
  ).toBe("false");
});
it("does not send a draft until the operator reviews the recipient and confirms", async () => {
  const state = fixture(),
    act = vi.fn(async () => ({ ok: true }));
  render(<MailDesk state={state} act={act} busy={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Revisar e enviar" }));
  expect(act).not.toHaveBeenCalled();
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText("Para: ana@example.test")).toBeTruthy();
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Enviar e-mail" }),
  );
  await waitFor(() =>
    expect(act).toHaveBeenCalledWith({
      action: "gf_mail_send",
      mail: "draft1",
      confirmed: true,
    }),
  );
});
it("only creates employee accounts from the manager form", async () => {
  const state = fixture(),
    act = vi.fn(async () => ({ ok: true }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ rows: [], audit: [] }),
    })),
  );
  render(<Management state={state} act={act} busy={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Usuários" }));
  fireEvent.click(screen.getByRole("button", { name: "Novo funcionário" }));
  fireEvent.change(screen.getByLabelText("Nome", { exact: true }), {
    target: { value: "Bia" },
  });
  fireEvent.change(screen.getByLabelText("Usuário", { exact: true }), {
    target: { value: "bia" },
  });
  fireEvent.change(screen.getByLabelText("Senha temporária"), {
    target: { value: "Temporary.Password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
  await waitFor(() =>
    expect(act).toHaveBeenCalledWith({
      action: "team_user_create",
      name: "Bia",
      username: "bia",
      password: "Temporary.Password",
      permissions: ["move", "create"],
    }),
  );
  expect(screen.queryByLabelText("Função")).toBeNull();
});
it("requires matching first-manager passwords before submitting setup", async () => {
  const ready = vi.fn();
  vi.stubGlobal("fetch", vi.fn());
  render(
    <Access
      session={{ token: "test", setup_required: true, user: null }}
      onReady={ready}
    />,
  );
  fireEvent.change(screen.getByLabelText("Nova senha"), {
    target: { value: "First.Password.2030" },
  });
  fireEvent.change(screen.getByLabelText(/Confirmar senha/), {
    target: { value: "Other.Password.2030" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Criar meu acesso" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
  expect(ready).not.toHaveBeenCalled();
});
