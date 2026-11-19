const send = async (method: "PUT" | "DELETE", body?: object) => {
  const response = await fetch("/auth/nickname", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json().catch(() => ({}))) as {
    nickname?: string;
    error?: string;
  };
  if (!response.ok && response.status !== 204)
    throw new Error(data.error || "Не удалось сохранить ник.");
  return data;
};

export async function saveNickname(nickname: string): Promise<string> {
  const data = await send("PUT", { nickname });
  return data.nickname || nickname;
}

export async function resetNickname(): Promise<string> {
  await send("DELETE");
  const status = (await (
    await fetch("/auth/status", { cache: "no-store" })
  )
    .json()
    .catch(() => ({}))) as { account?: { name?: string } };
  return status.account?.name ?? "";
}
