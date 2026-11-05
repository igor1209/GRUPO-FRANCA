let token = "";
export async function api<T>(path: string, data?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: data ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "X-SDR-Token": token },
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = await response.json();
  if (response.status === 401 && !path.startsWith("/api/auth/"))
    window.dispatchEvent(new Event("gf-session-expired"));
  if (!response.ok)
    throw new Error(
      result.error ||
        result.detail?.[0]?.msg ||
        "Não foi possível concluir a operação.",
    );
  return result;
}
export async function connect() {
  const session = await api<import("./types").Session>("/api/session");
  token = session.token;
  return session;
}
export function csv(name: string, headers: string[], rows: unknown[][]) {
  const safe = (value: unknown) => {
    let v = String(value ?? "");
    if (/^[=+@\-\t\r]/.test(v)) v = "'" + v;
    return '"' + v.replace(/"/g, '""') + '"';
  };
  const url = URL.createObjectURL(
    new Blob(
      [
        "\ufeff" +
          [headers, ...rows].map((row) => row.map(safe).join(";")).join("\r\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function date(value: string) {
  if (!value) return "Sem data";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function initials(value: string) {
  return (
    value
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((v) => v[0])
      .join("")
      .toUpperCase() || "GF"
  );
}
