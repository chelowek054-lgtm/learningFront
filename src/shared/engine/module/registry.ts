// Реестр модулей: табличный lookup по type. НИ ОДНОГО `if module === ...` (инвариант №3).
import type { ActivityRenderer, ActivityTypeDef, LocalGrader, ModuleManifest } from './manifest';

interface TypeEntry {
  moduleId: string;
  def: ActivityTypeDef;
}

export class ModuleRegistry {
  private readonly modules = new Map<string, ModuleManifest>();
  private readonly typeIndex = new Map<string, TypeEntry>();

  registerModule(manifest: ModuleManifest): void {
    if (this.modules.has(manifest.id)) {
      throw new Error(`Module already registered: ${manifest.id}`);
    }
    for (const def of manifest.activityTypes) {
      const existing = this.typeIndex.get(def.type);
      if (existing) {
        throw new Error(
          `Activity type collision: "${def.type}" declared by both ` +
            `"${existing.moduleId}" and "${manifest.id}"`,
        );
      }
      this.typeIndex.set(def.type, { moduleId: manifest.id, def });
    }
    this.modules.set(manifest.id, manifest);
  }

  getModules(): ModuleManifest[] {
    return [...this.modules.values()];
  }

  getActivityTypes(): ActivityTypeDef[] {
    return [...this.typeIndex.values()].map((e) => e.def);
  }

  getModuleIdForType(type: string): string | undefined {
    return this.typeIndex.get(type)?.moduleId;
  }

  getActivityType(type: string): ActivityTypeDef | undefined {
    return this.typeIndex.get(type)?.def;
  }

  /**
   * Название типа для человека. Единственный источник: экраны спрашивают
   * здесь, а не держат свои карты — иначе словарь разъезжается по слоям.
   * Незнакомый тип отдаёт сам слуг: это заметно на экране и лучше пустоты.
   */
  getActivityTitle(type: string): string {
    return this.typeIndex.get(type)?.def.title ?? type;
  }

  getRenderer(type: string): ActivityRenderer | undefined {
    const entry = this.typeIndex.get(type);
    if (!entry) return undefined;
    return this.modules.get(entry.moduleId)?.renderers[type];
  }

  getLocalGrader(type: string): LocalGrader | undefined {
    const entry = this.typeIndex.get(type);
    if (!entry) return undefined;
    return this.modules.get(entry.moduleId)?.localGraders?.[type];
  }
}

export function createModuleRegistry(): ModuleRegistry {
  return new ModuleRegistry();
}
