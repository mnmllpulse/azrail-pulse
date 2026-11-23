/** Повторяет запрос при сетевом сбое: один лаг не должен превращаться в «Войди в аккаунт». */
export async function withRetry<T>(
  run: () => Promise<T>,
  tries = 3,
  delayMs = 400,
  retryable: (error: unknown) => boolean = () => true,
): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await run();
    } catch (error) {
      last = error;
      if (!retryable(error) || attempt === tries - 1) break;
      await new Promise((resolve) =>
        setTimeout(resolve, delayMs * (attempt + 1)),
      );
    }
  }
  throw last;
}
