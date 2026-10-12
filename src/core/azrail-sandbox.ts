import { Sandbox as BaseSandbox } from "@cloudflare/sandbox";
import { ALLOWED_HOSTS, SANDBOX_LIMITS } from "./sandbox";
import type { Env } from "../types";

/**
 * ПЕСОЧНИЦА AZRAIL — класс, на котором стоит контейнер.
 *
 * ЗАЧЕМ ОН ЕСТЬ, ЕСЛИ SDK ДАЁТ ГОТОВЫЙ. Прямой реэкспорт `Sandbox` из
 * пакета работает — но берёт УМОЛЧАНИЯ пакета, а не наши лимиты. В
 * core/sandbox.ts объявлен SANDBOX_LIMITS.IDLE_TIMEOUT_MS, и он не
 * применялся никуда: цифра существовала как документация, а поведением
 * управлял чужой дефолт.
 *
 * Сегодня они совпадают — оба десять минут. Именно поэтому расхождение
 * было бы незаметным: ничего не сломалось бы сейчас, но при смене
 * умолчания в пакете наш лимит молча перестал бы значить что-либо, а счёт
 * за простаивающие контейнеры вырос бы без единого сообщения.
 *
 * ПОЧЕМУ ЭТО ПРО ДЕНЬГИ. Контейнер тарифицируется за время работы. Простой
 * до усыпления — единственное, что отделяет забытую песочницу от счёта за
 * час её безделья. Такую величину нельзя оставлять на умолчании, о котором
 * никто в проекте не знает.
 *
 * Имя класса ОБЯЗАНО совпадать с class_name в [[containers]] и в
 * [[durable_objects.bindings]] — wrangler ищет по имени среди экспортов
 * воркера. Переименование здесь сломает деплой, не сломав сборку.
 */
/** Ключ в хранилище Durable Object, под которым лежит время рождения. */
const BORN_AT = "azrail:bornAt";

export class Sandbox extends BaseSandbox<Env> {
  // E31: network access is explicit and host-allowlisted. No arbitrary egress.
  enableInternet = true;
  allowedHosts: string[] = [...ALLOWED_HOSTS];
  readonly securityPolicy = {
    network: "allowlist" as const,
    filesystemQuotaBytes: SANDBOX_LIMITS.FILESYSTEM_QUOTA_BYTES,
    maxProcesses: SANDBOX_LIMITS.MAX_PROCESSES,
    commandTimeoutMs: SANDBOX_LIMITS.COMMAND_TIMEOUT_MS,
    secretMode: SANDBOX_LIMITS.SECRET_MODE,
  };
  /**
   * Простой до усыпления, в секундах. Значение берётся из SANDBOX_LIMITS,
   * а не пишется числом здесь: два источника правды для одной величины
   * неминуемо разъедутся, и разъедутся молча.
   */
  sleepAfter = Math.round(SANDBOX_LIMITS.IDLE_TIMEOUT_MS / 1000);

  /**
   * ПОТОЛОК ЖИЗНИ. Третий и последний рубеж против счёта за контейнер.
   *
   * Два других уже стоят и ловят другое:
   *   COMMAND_TIMEOUT_MS — одна команда, которая зависла;
   *   sleepAfter         — контейнер, про который забыли.
   *
   * Ни один из них не ловит ТРЕТИЙ случай: цикл миссии, который гоняет
   * короткие команды одну за другой без конца. Каждая команда укладывается
   * в таймаут, простоя не наступает никогда — и контейнер живёт часами,
   * тарифицируясь за каждую минуту.
   *
   * Проверка стоит ПЕРЕД командой, а не по таймеру: будить объект ради
   * сторожа значит платить за сам сторож. Здесь она бесплатна — объект и
   * так проснулся, чтобы выполнить команду.
   *
   * ЧЕГО ЭТО НЕ ДЕЛАЕТ. Одну бесконечную команду потолок не оборвёт: он
   * срабатывает между командами. Это задача COMMAND_TIMEOUT_MS, и она
   * решена там.
   */
  async exec(command: string, options?: Parameters<BaseSandbox<Env>["exec"]>[1]) {
    await this.enforceLifetime();
    return super.exec(command, options);
  }

  private async enforceLifetime(): Promise<void> {
    const now = Date.now();
    const born = await this.ctx.storage.get<number>(BORN_AT);

    if (typeof born !== "number") {
      await this.ctx.storage.put(BORN_AT, now);
      return;
    }

    if (now - born < SANDBOX_LIMITS.MAX_LIFETIME_MS) return;

    // Stop this command: a freshly destroyed filesystem cannot be treated as the old one.
    await this.destroy();
    await this.ctx.storage.put(BORN_AT, now);
    throw new Error("Истёк срок песочницы. Команда не выполнена; синхронизируйте файлы перед новым запуском.");
  }
}
