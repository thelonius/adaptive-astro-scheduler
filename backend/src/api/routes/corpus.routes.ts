import { Router } from 'express';
import { CorpusController } from '../controllers/corpus.controller';

const router = Router();
const controller = new CorpusController();

/**
 * Корпус интерпретаций ZET.
 *
 * Поиск по разобранным полям, без LLM и эмбеддингов: ключ вычисляется из
 * карты, дальше индексный доступ к corpus_interpretations.
 */

// Пакетный запрос толкований на аспекты — колесо шлёт все сразу.
router.post('/aspects', (req, res) => controller.aspects(req, res));

// Планета в знаке или в доме.
router.get('/planet', (req, res) => controller.planet(req, res));

// Символика градуса зодиака.
router.get('/degree', (req, res) => controller.degree(req, res));

// Словарь терминов для тултипов: планеты, знаки, дома.
router.get('/glossary', (req, res) => controller.glossary(req, res));

// Что вообще лежит в таблице.
router.get('/stats', (req, res) => controller.stats(req, res));

// LLM-переписывание текстов корпуса (pass-through если CORPUS_WRITER_ENABLED=false).
router.post('/rewrite', (req, res) => controller.rewrite(req, res));

export default router;
