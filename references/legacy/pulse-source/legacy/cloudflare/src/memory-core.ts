export class AzrailMemoryCore {
  constructor(private env: any) {}

  /**
   * 1. Short-Term Memory (KV)
   * Быстрая контекстная память текущей сессии (исчезает через 24 часа)
   */
  async getSessionContext(userId: string): Promise<any[]> {
    const context = await this.env.SHORT_TERM_MEMORY.get(`session:${userId}`, 'json');
    return context || [];
  }

  async updateSessionContext(userId: string, messages: any[]) {
    // Храним только последние 10 сообщений для экономии токенов
    const recent = messages.slice(-10);
    await this.env.SHORT_TERM_MEMORY.put(`session:${userId}`, JSON.stringify(recent), {
      expirationTtl: 86400 // 24 hours
    });
  }

  /**
   * 2. Episodic Memory (D1)
   * Журнал точных событий и фактов (кто, что, когда сделал)
   */
  async saveEpisode(userId: string, action: string, details: any) {
    await this.env.DB.prepare(
      `INSERT INTO agent_episodes (id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, datetime('now'))`
    ).bind(crypto.randomUUID(), userId, action, JSON.stringify(details)).run();
  }

  /**
   * 3. Semantic Memory (Vectorize + AI Embeddings)
   * Долгосрочная память: ассоциации, смыслы, предпочтения пользователя.
   * "Крутая фишка", позволяющая агентам находить похожие ситуации в прошлом.
   */
  async embedAndRemember(userId: string, text: string, metadata: any = {}) {
    // 1. Генерируем вектор через BAAI/bge-m3
    const embeddingResp = await this.env.AI.run('@cf/baai/bge-m3', { text: [text] });
    const vector = embeddingResp.data[0];

    // 2. Сохраняем в Vectorize index
    const memoryId = crypto.randomUUID();
    await this.env.VECTOR_MEMORY.upsert([{
      id: memoryId,
      values: vector,
      namespace: userId,
      metadata: { text, ...metadata }
    }]);

    return memoryId;
  }

  async recallSimilar(userId: string, query: string, topK: number = 3) {
    // 1. Векторизуем запрос
    const queryResp = await this.env.AI.run('@cf/baai/bge-m3', { text: [query] });
    const queryVector = queryResp.data[0];

    // 2. Ищем в памяти
    const matches = await this.env.VECTOR_MEMORY.query(queryVector, {
      topK,
      namespace: userId,
      returnValues: true,
      returnMetadata: true
    });

    return matches.matches.map((m: any) => m.metadata.text);
  }

  /**
   * SYNTHESIS: Полный сбор контекста перед ответом агента
   */
  async buildAzrailContext(userId: string, currentQuery: string) {
    const [shortTerm, pastMemories] = await Promise.all([
      this.getSessionContext(userId),
      this.recallSimilar(userId, currentQuery, 2)
    ]);

    let systemPromptExt = "\\n--- AZRAIL MEMORY BANKS ---\\n";
    if (pastMemories.length > 0) {
      systemPromptExt += "Relevant past memories:\\n" + pastMemories.map((m: string) => "- " + m).join("\\n") + "\\n";
    }

    return {
      messages: shortTerm,
      memoryInjectedPrompt: systemPromptExt
    };
  }
}
