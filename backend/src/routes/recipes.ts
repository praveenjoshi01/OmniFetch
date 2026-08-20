import { Router } from 'express';
import { RecipeStore } from '../services/db';
import { Recipe } from '../types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET all recipes
router.get('/', (req, res) => {
  try {
    const recipes = RecipeStore.getAll();
    res.json(recipes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single recipe
router.get('/:id', (req, res) => {
  try {
    const recipe = RecipeStore.getById(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json(recipe);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create or update recipe
router.post('/', (req, res) => {
  try {
    const data = req.body;
    const now = new Date().toISOString();

    const recipe: Recipe = {
      id: data.id || uuidv4(),
      name: data.name || 'Untitled Recipe',
      description: data.description || '',
      startUrl: data.startUrl || 'https://example.com',
      steps: Array.isArray(data.steps) ? data.steps : [],
      schedule: data.schedule || undefined,
      webhookUrl: data.webhookUrl || undefined,
      createdAt: data.createdAt || now,
      updatedAt: now
    };

    const saved = RecipeStore.save(recipe);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update recipe
router.put('/:id', (req, res) => {
  try {
    const existing = RecipeStore.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Recipe not found' });

    const updated: Recipe = {
      ...existing,
      ...req.body,
      id: req.params.id,
      updatedAt: new Date().toISOString()
    };

    const saved = RecipeStore.save(updated);
    res.json(saved);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE recipe
router.delete('/:id', (req, res) => {
  try {
    const success = RecipeStore.delete(req.params.id);
    if (!success) return res.status(404).json({ error: 'Recipe not found' });
    res.json({ success: true, message: 'Recipe deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
