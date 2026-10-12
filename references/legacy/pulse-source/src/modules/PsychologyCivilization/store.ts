import { PsychologyStore, ArchetypeData, CognitiveTrigger, LibrarySection } from './types';
import { archetypesLibrary, cognitiveTriggers, bookshelfData } from './data';

class PsychologyCivilizationCore {
  private state: PsychologyStore;

  constructor() {
    this.state = {
      archetypes: [...archetypesLibrary],
      triggers: [...cognitiveTriggers],
      bookshelf: [...bookshelfData]
    };
  }

  public getArchetypes(): ArchetypeData[] {
    return this.state.archetypes;
  }

  public getArchetypeById(id: string): ArchetypeData | undefined {
    return this.state.archetypes.find(a => a.id === id);
  }

  public getTriggers(category?: CognitiveTrigger['category']): CognitiveTrigger[] {
    if (category) {
      return this.state.triggers.filter(t => t.category === category);
    }
    return this.state.triggers;
  }

  public getBookshelf(): LibrarySection[] {
    return this.state.bookshelf;
  }

  public addArchetype(archetype: ArchetypeData) {
    this.state.archetypes.push(archetype);
  }
}

export const pulsePsychologyCore = new PsychologyCivilizationCore();
