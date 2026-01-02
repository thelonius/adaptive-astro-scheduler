import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import NatalChart from '../models/NatalChart';
import Rule from '../models/Rule';
import Outcome from '../models/Outcome';

export const createNatalChart = asyncHandler(async (req: Request, res: Response) => {
  const chart = new NatalChart(req.body);
  await chart.save();
  res.status(201).json({ status: 'success', data: chart });
});

export const getNatalCharts = asyncHandler(async (_req: Request, res: Response) => {
  const charts = await NatalChart.find();
  res.json({ status: 'success', data: charts });
});

export const getNatalChart = asyncHandler(async (req: Request, res: Response) => {
  const chart = await NatalChart.findById(req.params.id);
  if (!chart) {
    return res.status(404).json({ status: 'error', message: 'Natal chart not found' });
  }
  res.json({ status: 'success', data: chart });
});

export const createRule = asyncHandler(async (req: Request, res: Response) => {
  const rule = new Rule(req.body);
  await rule.save();
  res.status(201).json({ status: 'success', data: rule });
});

export const getRules = asyncHandler(async (req: Request, res: Response) => {
  const { natalChartId } = req.query;
  const filter = natalChartId ? { natalChartId } : {};
  const rules = await Rule.find(filter);
  res.json({ status: 'success', data: rules });
});

export const getRule = asyncHandler(async (req: Request, res: Response) => {
  const rule = await Rule.findById(req.params.id);
  if (!rule) {
    return res.status(404).json({ status: 'error', message: 'Rule not found' });
  }
  res.json({ status: 'success', data: rule });
});

export const createOutcome = asyncHandler(async (req: Request, res: Response) => {
  const outcome = new Outcome(req.body);
  await outcome.save();
  res.status(201).json({ status: 'success', data: outcome });
});

export const getOutcomes = asyncHandler(async (req: Request, res: Response) => {
  const { natalChartId, ruleId } = req.query;
  const filter: any = {};
  if (natalChartId) filter.natalChartId = natalChartId;
  if (ruleId) filter.ruleId = ruleId;
  
  const outcomes = await Outcome.find(filter).populate('ruleId').populate('natalChartId');
  res.json({ status: 'success', data: outcomes });
});
