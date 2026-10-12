export type PipelineStageName = 'Tokenization' | 'Sentiment Analysis' | 'Cognitive Trigger Detection' | 'Logical Fallacy Extraction' | 'Final Intent Synthesis';

export interface PipelineStage {
  name: PipelineStageName;
  execute(input: any, context: any): Promise<any>;
}

export interface ScalpelResult {
  originalText: string;
  detectedTriggers: string[];
  hiddenMotives: string[];
  vulnerabilityScore: number; // 0-1
  confidence: number; // 0-1
  semanticEchoes?: string[]; // Detected echo constructs
  ocean?: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
}

export class ScalpelOfIntentions {
  private stages: PipelineStage[] = [];

  constructor() {
    this.stages.push({
      name: 'Tokenization',
      execute: async (input: string, ctx: any) => {
        // Mock tokenization and initial semantic mapping
        return { tokens: input.split(/\s+/), text: input };
      }
    });
    
    this.stages.push({
      name: 'Cognitive Trigger Detection',
      execute: async (input: any, ctx: any) => {
        // Mock detection of manipulation techniques
        const triggers = [];
        const lowerText = input.text.toLowerCase();
        if (lowerText.includes('должен') || lowerText.includes('обязан')) triggers.push('Pressure / Obligation');
        if (lowerText.includes('быстро') || lowerText.includes('сейчас')) triggers.push('Urgency / Scarcity');
        if (lowerText.includes('все знают') || lowerText.includes('очевидно')) triggers.push('Gaslighting / Consensus Forcing');
        return { ...input, triggers };
      }
    });

    this.stages.push({
      name: 'Final Intent Synthesis',
      execute: async (input: any, ctx: any) => {
        // Mock final semantic synthesis and scoring
        const confidence = input.triggers && input.triggers.length > 0 ? 0.85 : 0.4;
        const vulnerabilityScore = input.triggers ? Math.min(1.0, input.triggers.length * 0.25) : 0.1;
        
        const text = input.text || '';
        const lowerText = text.toLowerCase();
        
        let openness = 50;
        let conscientiousness = 50;
        let extraversion = 50;
        let agreeableness = 50;
        let neuroticism = 50;
        
        if (lowerText.includes('клуб') || lowerText.includes('элитарный') || lowerText.includes('своих')) {
          openness += 25;
          agreeableness -= 20;
          extraversion += 15;
        }
        if (lowerText.includes('быстро') || lowerText.includes('сейчас') || lowerText.includes('срочно')) {
          neuroticism += 25;
          agreeableness -= 15;
          conscientiousness += 10;
        }
        if (lowerText.includes('должен') || lowerText.includes('обязан')) {
          conscientiousness += 30;
          agreeableness -= 15;
        }
        if (lowerText.includes('экологично') || lowerText.includes('честно') || lowerText.includes('любовь')) {
          agreeableness += 30;
          neuroticism -= 20;
          openness += 15;
        }
        if (lowerText.includes('не знаю') || lowerText.includes('кажется') || lowerText.includes('наверное')) {
          neuroticism += 20;
          conscientiousness -= 15;
        }
        
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
          hash = (hash << 5) - hash + text.charCodeAt(i);
          hash |= 0;
        }
        hash = Math.abs(hash);
        
        openness = Math.min(100, Math.max(10, openness + (hash % 21) - 10));
        conscientiousness = Math.min(100, Math.max(10, conscientiousness + ((hash >> 2) % 21) - 10));
        extraversion = Math.min(100, Math.max(10, extraversion + ((hash >> 4) % 21) - 10));
        agreeableness = Math.min(100, Math.max(10, agreeableness + ((hash >> 6) % 21) - 10));
        neuroticism = Math.min(100, Math.max(10, neuroticism + ((hash >> 8) % 21) - 10));
        
        return {
          originalText: input.text,
          detectedTriggers: input.triggers || [],
          hiddenMotives: input.triggers && input.triggers.length > 0 
            ? ['Attempt to rush decision making', 'Establishing dominance via obligation']
            : ['Neutral or undetected motive'],
          vulnerabilityScore,
          confidence,
          semanticEchoes: ['Competitor avoidance', 'Value signaling'],
          ocean: {
            openness,
            conscientiousness,
            extraversion,
            agreeableness,
            neuroticism
          }
        } as ScalpelResult;
      }
    });
  }

  public addStage(stage: PipelineStage, index?: number) {
    if (index !== undefined) {
      this.stages.splice(index, 0, stage);
    } else {
      this.stages.push(stage);
    }
  }

  public async parse(text: string): Promise<ScalpelResult> {
    let currentPayload = text;
    const context = { timestamp: Date.now() };

    for (const stage of this.stages) {
      currentPayload = await stage.execute(currentPayload, context);
    }

    return currentPayload as unknown as ScalpelResult;
  }
}

export const globalScalpel = new ScalpelOfIntentions();
