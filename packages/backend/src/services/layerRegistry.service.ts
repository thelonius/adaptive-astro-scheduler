import logger from '../utils/logger';

export interface Layer {
  id: string;
  name: string;
  description: string;
  type: 'transit' | 'progression' | 'solar_return' | 'custom';
  priority: number;
  active: boolean;
  config: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

class LayerRegistryService {
  private layers: Map<string, Layer> = new Map();

  constructor() {
    this.initializeDefaultLayers();
  }

  private initializeDefaultLayers() {
    const defaultLayers: Omit<Layer, 'createdAt' | 'updatedAt'>[] = [
      {
        id: 'transit',
        name: 'Transit Layer',
        description: 'Current planetary transits affecting the natal chart',
        type: 'transit',
        priority: 10,
        active: true,
        config: {
          planets: ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'],
          aspects: ['Conjunction', 'Sextile', 'Square', 'Trine', 'Opposition'],
          orb: 8,
        },
      },
      {
        id: 'progression',
        name: 'Progression Layer',
        description: 'Secondary progressions for long-term trends',
        type: 'progression',
        priority: 8,
        active: true,
        config: {
          method: 'secondary',
          rate: 'day-for-year',
        },
      },
      {
        id: 'solar_return',
        name: 'Solar Return Layer',
        description: 'Annual solar return chart influences',
        type: 'solar_return',
        priority: 7,
        active: true,
        config: {
          calculateAnnually: true,
        },
      },
    ];

    defaultLayers.forEach((layer) => {
      this.registerLayer({
        ...layer,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    logger.info(`Initialized ${this.layers.size} default layers`);
  }

  registerLayer(layer: Layer): void {
    if (this.layers.has(layer.id)) {
      logger.warn(`Layer ${layer.id} already exists, updating...`);
    }

    this.layers.set(layer.id, {
      ...layer,
      updatedAt: new Date(),
    });

    logger.info(`Registered layer: ${layer.name} (${layer.id})`);
  }

  getLayer(id: string): Layer | undefined {
    return this.layers.get(id);
  }

  getAllLayers(): Layer[] {
    return Array.from(this.layers.values()).sort((a, b) => b.priority - a.priority);
  }

  getActiveLayers(): Layer[] {
    return this.getAllLayers().filter((layer) => layer.active);
  }

  updateLayer(id: string, updates: Partial<Layer>): Layer | null {
    const layer = this.layers.get(id);
    if (!layer) {
      logger.error(`Layer ${id} not found`);
      return null;
    }

    const updatedLayer: Layer = {
      ...layer,
      ...updates,
      id: layer.id, // Prevent ID changes
      updatedAt: new Date(),
    };

    this.layers.set(id, updatedLayer);
    logger.info(`Updated layer: ${id}`);

    return updatedLayer;
  }

  deleteLayer(id: string): boolean {
    const deleted = this.layers.delete(id);
    if (deleted) {
      logger.info(`Deleted layer: ${id}`);
    } else {
      logger.warn(`Layer ${id} not found for deletion`);
    }
    return deleted;
  }

  toggleLayer(id: string): Layer | null {
    const layer = this.layers.get(id);
    if (!layer) {
      logger.error(`Layer ${id} not found`);
      return null;
    }

    return this.updateLayer(id, { active: !layer.active });
  }

  getLayersByType(type: Layer['type']): Layer[] {
    return this.getAllLayers().filter((layer) => layer.type === type);
  }

  createCustomLayer(
    name: string,
    description: string,
    config: Record<string, any>
  ): Layer {
    const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const layer: Layer = {
      id,
      name,
      description,
      type: 'custom',
      priority: 5,
      active: true,
      config,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.registerLayer(layer);
    return layer;
  }
}

export default new LayerRegistryService();
