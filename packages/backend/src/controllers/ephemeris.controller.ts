import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import ephemerisService from '../services/ephemeris.service';

export const getEphemeris = asyncHandler(async (req: Request, res: Response) => {
  const { date, latitude, longitude } = req.query;

  if (!date || !latitude || !longitude) {
    return res.status(400).json({
      status: 'error',
      message: 'date, latitude, and longitude are required',
    });
  }

  const parsedDate = new Date(date as string);
  const lat = parseFloat(latitude as string);
  const lon = parseFloat(longitude as string);

  if (isNaN(parsedDate.getTime()) || isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid date, latitude, or longitude',
    });
  }

  const ephemeris = await ephemerisService.getEphemeris(parsedDate, lat, lon);
  res.json({ status: 'success', data: ephemeris });
});

export const getPlanetPositions = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ status: 'error', message: 'date is required' });
  }

  const parsedDate = new Date(date as string);

  if (isNaN(parsedDate.getTime())) {
    return res.status(400).json({ status: 'error', message: 'Invalid date' });
  }

  const positions = await ephemerisService.calculatePlanetPositions(parsedDate);
  res.json({ status: 'success', data: positions });
});

export const calculateAspect = asyncHandler(async (req: Request, res: Response) => {
  const { longitude1, longitude2 } = req.query;

  if (!longitude1 || !longitude2) {
    return res.status(400).json({
      status: 'error',
      message: 'longitude1 and longitude2 are required',
    });
  }

  const lon1 = parseFloat(longitude1 as string);
  const lon2 = parseFloat(longitude2 as string);

  if (isNaN(lon1) || isNaN(lon2)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid longitude values',
    });
  }

  const aspect = ephemerisService.calculateAspect(lon1, lon2);

  if (!aspect) {
    return res.json({ status: 'success', data: null, message: 'No aspect found' });
  }

  res.json({ status: 'success', data: aspect });
});
