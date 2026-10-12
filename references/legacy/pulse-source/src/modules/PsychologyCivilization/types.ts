import { ElementType } from 'react';

export interface OCEANProfile {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface ArchetypeData {
  id: string;
  name: string;
  description: string;
  ocean: OCEANProfile;
  techniques: string[];
}

export interface CognitiveTrigger {
  id: string;
  name: string;
  description: string;
  category: 'manipulation' | 'defense' | 'influence' | 'strategy';
  counterMeasures?: string[];
}

export interface BookItem {
  title: string;
  author: string;
  desc: string;
  accent: string;
  icon: ElementType;
}

export interface LibrarySection {
  category: string;
  books: BookItem[];
}

export interface PsychologyStore {
  archetypes: ArchetypeData[];
  triggers: CognitiveTrigger[];
  bookshelf: LibrarySection[];
}

