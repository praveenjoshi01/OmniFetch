import { Router } from 'express';
import { RunStore, ResultStore, RecipeStore } from '../services/db';
import { executeRecipe } from '../services/automationEngine';

const router = Router();

// GET all runs
router.get('/', (req, res) => {
  try {
    const runs = RunStore.getAll();
    res.json(runs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single run status and logs
router.get('/:id', (req, res) => {
  try {
    const run = RunStore.getById(req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET results for a run
router.get('/:id/results', (req, res) => {
  try {
    const results = ResultStore.getByRunId(req.params.id);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export results as CSV or JSON
router.get('/:id/export', (req, res) => {
  try {
    const format = (req.query.format as string) || 'csv';
    const results = ResultStore.getByRunId(req.params.id);

    if (results.length === 0) {
      return res.status(404).send('No extracted data found for this run');
    }

    const dataRows = results.map(r => r.data);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="webcapture-run-${req.params.id}.json"`);
      return res.send(JSON.stringify(dataRows, null, 2));
    }

    // CSV format
    const allHeaders = Array.from(new Set(dataRows.flatMap(r => Object.keys(r))));
    const csvLines = [allHeaders.join(',')];

    for (const row of dataRows) {
      const line = allHeaders.map(header => {
        const val = row[header] !== undefined && row[header] !== null ? String(row[header]) : '';
        // Escape quotes
        const escaped = val.replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',');
      csvLines.push(line);
    }

    const csvContent = csvLines.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="webcapture-run-${req.params.id}.csv"`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST trigger execution of a recipe
router.post('/', async (req, res) => {
  try {
    const { recipeId } = req.body;
    if (!recipeId) return res.status(400).json({ error: 'recipeId is required' });

    const recipe = RecipeStore.getById(recipeId);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    // Execute in background
    executeRecipe(recipe).catch(err => console.error('Background run failed:', err));

    res.status(202).json({
      message: 'Run initiated',
      recipeId: recipe.id
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
