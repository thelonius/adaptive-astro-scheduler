import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import NatalChart from '../models/NatalChart';
import llmService from '../services/llm.service';
import Rule from '../models/Rule';

export const generateRule = asyncHandler(async (req: Request, res: Response) => {
  const { natalChartId, request } = req.body;

  if (!natalChartId || !request) {
    return res.status(400).json({
      status: 'error',
      message: 'natalChartId and request are required',
    });
  }

  const natalChart = await NatalChart.findById(natalChartId);

  if (!natalChart) {
    return res.status(404).json({ status: 'error', message: 'Natal chart not found' });
  }

  const generatedRule = await llmService.generateRule(natalChart, request);

  // Save the generated rule
  const rule = new Rule({
    ...generatedRule,
    natalChartId,
    generated: true,
    generatedBy: 'openai-gpt4',
    prompt: request,
  });

  await rule.save();

  res.status(201).json({ status: 'success', data: rule });
});

export const explainRule = asyncHandler(async (req: Request, res: Response) => {
  const { ruleId } = req.params;

  const rule = await Rule.findById(ruleId);

  if (!rule) {
    return res.status(404).json({ status: 'error', message: 'Rule not found' });
  }

  const explanation = await llmService.explainRule(rule);

  res.json({ status: 'success', data: { explanation } });
});
