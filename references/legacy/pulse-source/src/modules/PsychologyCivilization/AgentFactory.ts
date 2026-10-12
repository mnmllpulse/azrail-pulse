import { OCEANProfile } from './types';

export interface BehavioralProfile {
  id: string;
  name: string;
  archetype: string;
  ocean: OCEANProfile;
  manipulationWeights: Record<string, number>; // e.g. "gaslighting": 0.8, "guilt_trip": 0.5
  description: string;
}

export class AgentFactory {
  private profiles: Map<string, BehavioralProfile> = new Map();

  constructor() {
    this.initializeDefaultProfiles();
  }

  private initializeDefaultProfiles() {
    this.registerProfile({
      id: "machiavelli",
      name: "Niccolò Machiavelli",
      archetype: "The Master Manipulator",
      ocean: { openness: 0.8, conscientiousness: 0.9, extraversion: 0.4, agreeableness: 0.1, neuroticism: 0.2 },
      manipulationWeights: {
        "pragmatism": 0.95,
        "deception": 0.8,
        "coercion": 0.6
      },
      description: "Focuses entirely on ends justifying the means. Highly calculated and devoid of emotional interference."
    });

    this.registerProfile({
      id: "steve_jobs",
      name: "Steve Jobs",
      archetype: "The Reality Distortion Field",
      ocean: { openness: 0.9, conscientiousness: 0.8, extraversion: 0.8, agreeableness: 0.2, neuroticism: 0.6 },
      manipulationWeights: {
        "reality_distortion": 0.95,
        "charm": 0.8,
        "intimidation": 0.7
      },
      description: "Combines intense charisma with abrasive standards, bending the perception of others to match his vision."
    });
    
    this.registerProfile({
      id: "catherine_medici",
      name: "Catherine de' Medici",
      archetype: "The Web Weaver",
      ocean: { openness: 0.7, conscientiousness: 0.9, extraversion: 0.3, agreeableness: 0.3, neuroticism: 0.4 },
      manipulationWeights: {
        "intrigue": 0.9,
        "patience": 0.95,
        "triangulation": 0.85
      },
      description: "Operates behind the scenes, playing factions against each other while maintaining a facade of neutrality."
    });
  }

  public registerProfile(profile: BehavioralProfile) {
    this.profiles.set(profile.id, profile);
  }

  public getProfile(id: string): BehavioralProfile | undefined {
    return this.profiles.get(id);
  }

  public getAllProfiles(): BehavioralProfile[] {
    return Array.from(this.profiles.values());
  }
  
  public loadFromJson(jsonConfig: string): boolean {
    try {
      const parsed = JSON.parse(jsonConfig);
      if (Array.isArray(parsed)) {
        parsed.forEach(p => this.registerProfile(p as BehavioralProfile));
      } else {
        this.registerProfile(parsed as BehavioralProfile);
      }
      return true;
    } catch (e) {
      console.error("Failed to load Agent profiles from JSON", e);
      return false;
    }
  }
}

export const globalAgentFactory = new AgentFactory();
