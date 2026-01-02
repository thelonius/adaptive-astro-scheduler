import layerRegistryService from '../src/services/layerRegistry.service';

describe('Layer Registry Service', () => {
  it('should have default layers initialized', () => {
    const layers = layerRegistryService.getAllLayers();
    expect(layers.length).toBeGreaterThan(0);
  });

  it('should create a custom layer', () => {
    const layer = layerRegistryService.createCustomLayer(
      'Test Layer',
      'Test Description',
      { test: true }
    );

    expect(layer.name).toBe('Test Layer');
    expect(layer.type).toBe('custom');
    expect(layer.active).toBe(true);
  });

  it('should get layer by id', () => {
    const allLayers = layerRegistryService.getAllLayers();
    const firstLayer = allLayers[0];
    const retrieved = layerRegistryService.getLayer(firstLayer.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(firstLayer.id);
  });

  it('should toggle layer active status', () => {
    const layer = layerRegistryService.createCustomLayer('Toggle Test', 'Test', {});
    const initialStatus = layer.active;

    const toggled = layerRegistryService.toggleLayer(layer.id);
    expect(toggled?.active).toBe(!initialStatus);
  });

  it('should get layers by type', () => {
    const transitLayers = layerRegistryService.getLayersByType('transit');
    expect(transitLayers.length).toBeGreaterThan(0);
    expect(transitLayers.every((l) => l.type === 'transit')).toBe(true);
  });
});
