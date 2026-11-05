import { useState, type FormEvent } from "react";
import { LogIn, ShieldCheck } from "lucide-react";
import { Brand } from "./Brand";
import { Button } from "./components";
import { api, connect } from "./api";
import type { Session } from "./types";

export function Access({
  session,
  onReady,
}: {
  session: Session;
  onReady: (s: Session) => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const change = Boolean(session.user?.must_change),
    setup = session.setup_required;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = Object.fromEntries(new FormData(e.currentTarget));
    if ((setup || change) && form.password !== form.confirm) {
      setError("As senhas precisam ser iguais.");
      setBusy(false);
      return;
    }
    try {
      await api(
        "/api/auth/" + (setup ? "setup" : change ? "password" : "login"),
        form,
      );
      onReady(await connect());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="access-screen">
      <section className="access-card">
        <Brand className="access-logo" />
        <div className="access-title">
          {setup ? <ShieldCheck size={23} /> : <LogIn size={23} />}
          <h1>
            {setup
              ? "Seu acesso de gerente"
              : change
                ? "Defina sua senha"
                : "Entrar"}
          </h1>
        </div>
        <p>
          {setup
            ? "Igor, crie a senha da sua conta. Seu usuário será igor."
            : change
              ? "Substitua a senha temporária para continuar."
              : "Acesse sua operação comercial."}
        </p>
        <form onSubmit={submit}>
          {!setup && !change && (
            <label>
              Usuário
              <input
                name="username"
                required
                autoComplete="username"
                autoFocus
                maxLength={60}
              />
            </label>
          )}
          {change && (
            <label>
              Senha atual
              <input
                name="current_password"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
          )}
          <label>
            {setup || change ? "Nova senha" : "Senha"}
            <input
              name="password"
              type="password"
              required
              minLength={setup || change ? 10 : 1}
              maxLength={128}
              autoComplete={
                setup || change ? "new-password" : "current-password"
              }
            />
          </label>
          {(setup || change) && (
            <label>
              Confirmar senha
              <input
                name="confirm"
                type="password"
                required
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
              />
              <small>Mínimo de 10 caracteres.</small>
            </label>
          )}
          {error && (
            <p role="alert" className="gf-error">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary full-width" disabled={busy}>
            {busy
              ? "Aguarde…"
              : setup
                ? "Criar meu acesso"
                : change
                  ? "Salvar senha"
                  : "Entrar"}
          </Button>
        </form>
        {change && (
          <Button
            onClick={async () => {
              await api("/api/auth/logout", {});
              onReady(await connect());
            }}
          >
            Sair
          </Button>
        )}
      </section>
    </div>
  );
}
