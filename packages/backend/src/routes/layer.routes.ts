import express from 'express';
import * as layerController from '../controllers/layer.controller';

const router = express.Router();

router.get('/', layerController.getAllLayers);
router.get('/:id', layerController.getLayer);
router.post('/', layerController.createCustomLayer);
router.patch('/:id', layerController.updateLayer);
router.delete('/:id', layerController.deleteLayer);
router.post('/:id/toggle', layerController.toggleLayer);

export default router;
