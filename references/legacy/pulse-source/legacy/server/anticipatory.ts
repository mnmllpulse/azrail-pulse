import { GoogleGenAI } from "@google/genai";

export interface PredictedIntent {
  prediction: string;
  confidence: number;
  tool: string;
  module: string;
}

export class AnticipatoryCore {
  private genAI: GoogleGenAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
  }

  async predictIntent(lastMessage: string, history: any[]): Promise<PredictedIntent[]> {
    if (!this.genAI) return [];

    try {
      const interaction = await this.genAI.interactions.create({
        model: "gemini-3.5-flash",
        system_instruction: `
        You are the Intent Forecaster module of DARK MNMLL PULSE OS.
        Analyze the current dialogue and session profile.
        Based on the user's last action, calculate their Root Objective.
        
        Generate strictly in JSON format an array of 3 most likely next 
        commands or questions the user will ask to achieve this goal.
        
        For each prediction include:
        - prediction: text of the predicted request
        - confidence: confidence from 0.0 to 1.0
        - tool: required tool (chat, image_gen, code_gen, web_search, swarm)
        - module: Nexus module (AXIOM, FORGE, ARCHITECT, etc.)
        
        Output only valid JSON. No explanations.
      `,
        input: `Context:\n${history.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')}\nLast Message: ${lastMessage}\n\nPredictions:`,
      });

      const text = interaction.output_text?.trim() || "";
      
      // Extract JSON if model added markdown blocks
      const jsonStr = text.replace(/```json|```/g, '').trim();
      return JSON.parse(jsonStr) as PredictedIntent[];
    } catch (error) {
      console.error("[ANTICIPATORY ERROR]", error);
      return [];
    }
  }

  async getSpeculativeQueries(currentQuery: string): Promise<string[]> {
    if (!this.genAI) return [];

    try {
      const interaction = await this.genAI.interactions.create({
        model: "gemini-3.5-flash",
        input: `
        Current user query: ${currentQuery}.
        Predict what technical or conceptual knowledge gap will arise 
        for the user after receiving the answer to this query.
        Formulate 2 hypothetical search queries for a vector database 
        that will close this future gap.
        Queries should be extremely narrow, technical and composed of keywords.
        Return only 2 queries separated by the | symbol.
      `
      });
      const text = interaction.output_text?.trim() || "";
      return text.split('|').map(q => q.trim()).filter(Boolean);
    } catch (error) {
      return [];
    }
  }
}
