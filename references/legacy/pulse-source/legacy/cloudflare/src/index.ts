import { AzrailMemoryCore } from './memory-core';
// import { NexusRouter } from './nexus-router';

export default {
  async fetch(request: Request, env: any, ctx: any) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // CORS Header setup (simplified)
    const CORS = {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
      }
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, CORS);
    }

    try {
      // Инициализация фишки с памятью (Azrail Memory)
      const memoryCore = new AzrailMemoryCore(env);

      // --- ПРИМЕР РАБОТЫ С ПАМЯТЬЮ В ЧАТЕ ---
      if (pathname === '/api/chat/intelligent') {
        const { userId, message } = await request.json();
        
        // 1. Вытаскиваем воспоминания (Short-term + Semantic/Vectorize)
        const context = await memoryCore.buildAzrailContext(userId, message);
        
        // 2. Добавляем новое сообщение в сессию
        const newHistory = [...context.messages, { role: 'user', content: message }];
        await memoryCore.updateSessionContext(userId, newHistory);
        
        // 3. Сохраняем как долговременную память (Vectorize), если это важно
        if (message.length > 50) {
          ctx.waitUntil(memoryCore.embedAndRemember(userId, message, { source: 'chat' }));
        }

        // 4. Генерируем ответ с учетом внедренной памяти
        const systemPrompt = "You are Azrail, the overlord AI. " + context.memoryInjectedPrompt;
        
        const aiResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
          messages: [
            { role: 'system', content: systemPrompt },
            ...newHistory
          ]
        });

        // 5. Сохраняем ответ в KV сессию
        newHistory.push({ role: 'assistant', content: aiResponse.response });
        ctx.waitUntil(memoryCore.updateSessionContext(userId, newHistory));
        ctx.waitUntil(memoryCore.saveEpisode(userId, 'chat_interaction', { input: message }));

        return new Response(JSON.stringify({ 
          response: aiResponse.response,
          memory_accessed: context.memoryInjectedPrompt !== "\\n--- AZRAIL MEMORY BANKS ---\\n" 
        }), CORS);
      }

      // ... остальные роуты из сценария (Lab, Video, Music, etc.)
      if (pathname.startsWith('/api/lab/')) {
        return new Response(JSON.stringify({ status: "Pulse Lab endpoint reached" }), CORS);
      }

      return new Response(JSON.stringify({ error: 'Route not found' }), { status: 404, ...CORS });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, ...CORS });
    }
  }
};
