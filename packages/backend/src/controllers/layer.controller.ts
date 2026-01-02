import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import layerRegistryService from '../services/layerRegistry.service';

export const getAllLayers = asyncHandler(async (_req: Request, res: Response) => {
  const layers = layerRegistryService.getAllLayers();
  res.json({ status: 'success', data: layers });
});

export const getLayer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const layer = layerRegistryService.getLayer(id);

  if (!layer) {
    return res.status(404).json({ status: 'error', message: 'Layer not found' });
  }

  res.json({ status: 'success', data: layer });
});

export const createCustomLayer = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, config } = req.body;

  if (!name || !description) {
    return res.status(400).json({ status: 'error', message: 'Name and description are required' });
  }

  const layer = layerRegistryService.createCustomLayer(name, description, config || {});
  res.status(201).json({ status: 'success', data: layer });
});

export const updateLayer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const layer = layerRegistryService.updateLayer(id, updates);

  if (!layer) {
    return res.status(404).json({ status: 'error', message: 'Layer not found' });
  }

  res.json({ status: 'success', data: layer });
});

export const deleteLayer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = layerRegistryService.deleteLayer(id);

  if (!deleted) {
    return res.status(404).json({ status: 'error', message: 'Layer not found' });
  }

  res.json({ status: 'success', message: 'Layer deleted successfully' });
});

export const toggleLayer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const layer = layerRegistryService.toggleLayer(id);

  if (!layer) {
    return res.status(404).json({ status: 'error', message: 'Layer not found' });
  }

  res.json({ status: 'success', data: layer });
});
