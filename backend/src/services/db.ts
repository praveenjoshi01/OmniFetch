import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { Recipe, Run, CapturedRow } from '../types';

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'webcapture.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    startUrl TEXT NOT NULL,
    steps TEXT NOT NULL,
    schedule TEXT,
    webhookUrl TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    recipeId TEXT NOT NULL,
    status TEXT NOT NULL,
    startedAt TEXT NOT NULL,
    finishedAt TEXT,
    errorMessage TEXT,
    resultCount INTEGER DEFAULT 0,
    logs TEXT,
    FOREIGN KEY(recipeId) REFERENCES recipes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS results (
    id TEXT PRIMARY KEY,
    runId TEXT NOT NULL,
    data TEXT NOT NULL,
    capturedAt TEXT NOT NULL,
    FOREIGN KEY(runId) REFERENCES runs(id) ON DELETE CASCADE
  );
`);

// Seed default demo recipes if table is empty
const existingRecipesCount = (db.prepare('SELECT COUNT(*) as count FROM recipes').get() as { count: number }).count;
if (existingRecipesCount === 0) {
  const seedRecipes: Recipe[] = [
    {
      id: 'demo-hacker-news',
      name: 'Hacker News Top Stories',
      description: 'Extract title, link URL, and score points from Hacker News frontpage',
      startUrl: 'https://news.ycombinator.com',
      steps: [
        { id: 's1', type: 'navigate', value: 'https://news.ycombinator.com', label: 'Go to Hacker News' },
        { id: 's2', type: 'wait', selector: '.titleline > a', timeout: 5000, label: 'Wait for story links' },
        { id: 's3', type: 'extract', selector: '.titleline > a', attribute: 'text', label: 'Extract Story Titles' },
        { id: 's4', type: 'extract', selector: '.titleline > a', attribute: 'href', label: 'Extract Story URLs' },
        { id: 's5', type: 'extract', selector: '.score', attribute: 'text', label: 'Extract Scores' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'demo-quotes-to-scrape',
      name: 'Quotes Scraper',
      description: 'Scrape quotes, authors, and tags from Quotes to Scrape sandbox',
      startUrl: 'https://quotes.toscrape.com',
      steps: [
        { id: 's1', type: 'navigate', value: 'https://quotes.toscrape.com', label: 'Navigate to Quotes' },
        { id: 's2', type: 'wait', selector: '.quote', timeout: 5000, label: 'Wait for quotes container' },
        { id: 's3', type: 'extract', selector: '.quote .text', attribute: 'text', label: 'Extract Quote Text' },
        { id: 's4', type: 'extract', selector: '.quote .author', attribute: 'text', label: 'Extract Author Name' },
        { id: 's5', type: 'extract', selector: '.quote .tags', attribute: 'text', label: 'Extract Tags' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'demo-list-maker',
      name: 'List Maker Tiles',
      description: 'Extract tile titles from memonotepad list-maker application',
      startUrl: 'https://memonotepad.github.io/list-maker',
      steps: [
        { id: 's1', type: 'navigate', value: 'https://memonotepad.github.io/list-maker', label: 'Go to List Maker' },
        { id: 's2', type: 'wait', selector: '.tile h3', timeout: 5000, label: 'Wait for list tiles' },
        { id: 's3', type: 'extract', selector: '.tile h3', attribute: 'text', label: 'Tile Titles' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const insertStmt = db.prepare(`
    INSERT INTO recipes (id, name, description, startUrl, steps, schedule, webhookUrl, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const r of seedRecipes) {
    insertStmt.run(r.id, r.name, r.description, r.startUrl, JSON.stringify(r.steps), r.schedule || null, r.webhookUrl || null, r.createdAt, r.updatedAt);
  }
}

export const RecipeStore = {
  getAll(): Recipe[] {
    const rows = db.prepare('SELECT * FROM recipes ORDER BY updatedAt DESC').all() as any[];
    return rows.map(r => ({
      ...r,
      steps: JSON.parse(r.steps)
    }));
  },

  getById(id: string): Recipe | null {
    const r = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      ...r,
      steps: JSON.parse(r.steps)
    };
  },

  save(recipe: Recipe): Recipe {
    const existing = this.getById(recipe.id);
    const now = new Date().toISOString();
    if (existing) {
      db.prepare(`
        UPDATE recipes SET name = ?, description = ?, startUrl = ?, steps = ?, schedule = ?, webhookUrl = ?, updatedAt = ?
        WHERE id = ?
      `).run(recipe.name, recipe.description || null, recipe.startUrl, JSON.stringify(recipe.steps), recipe.schedule || null, recipe.webhookUrl || null, now, recipe.id);
      return { ...recipe, updatedAt: now };
    } else {
      db.prepare(`
        INSERT INTO recipes (id, name, description, startUrl, steps, schedule, webhookUrl, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(recipe.id, recipe.name, recipe.description || null, recipe.startUrl, JSON.stringify(recipe.steps), recipe.schedule || null, recipe.webhookUrl || null, recipe.createdAt || now, now);
      return { ...recipe, createdAt: recipe.createdAt || now, updatedAt: now };
    }
  },

  delete(id: string): boolean {
    const result = db.prepare('DELETE FROM recipes WHERE id = ?').run(id);
    return result.changes > 0;
  }
};

export const RunStore = {
  getAll(): Run[] {
    const rows = db.prepare('SELECT * FROM runs ORDER BY startedAt DESC').all() as any[];
    return rows.map(r => ({
      ...r,
      logs: r.logs ? JSON.parse(r.logs) : []
    }));
  },

  getById(id: string): Run | null {
    const r = db.prepare('SELECT * FROM runs WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      ...r,
      logs: r.logs ? JSON.parse(r.logs) : []
    };
  },

  save(run: Run): void {
    const existing = db.prepare('SELECT id FROM runs WHERE id = ?').get(run.id);
    if (existing) {
      db.prepare(`
        UPDATE runs SET status = ?, finishedAt = ?, errorMessage = ?, resultCount = ?, logs = ?
        WHERE id = ?
      `).run(run.status, run.finishedAt || null, run.errorMessage || null, run.resultCount, JSON.stringify(run.logs || []), run.id);
    } else {
      db.prepare(`
        INSERT INTO runs (id, recipeId, status, startedAt, finishedAt, errorMessage, resultCount, logs)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(run.id, run.recipeId, run.status, run.startedAt, run.finishedAt || null, run.errorMessage || null, run.resultCount, JSON.stringify(run.logs || []));
    }
  },

  delete(id: string): boolean {
    const result = db.prepare('DELETE FROM runs WHERE id = ?').run(id);
    return result.changes > 0;
  }
};

export const ResultStore = {
  getByRunId(runId: string): CapturedRow[] {
    const rows = db.prepare('SELECT * FROM results WHERE runId = ? ORDER BY capturedAt ASC').all(runId) as any[];
    return rows.map(r => ({
      ...r,
      data: JSON.parse(r.data)
    }));
  },

  saveBatch(runId: string, rows: Record<string, any>[]): void {
    const insert = db.prepare(`
      INSERT INTO results (id, runId, data, capturedAt)
      VALUES (?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    const transaction = db.transaction((items: Record<string, any>[]) => {
      for (const item of items) {
        insert.run(require('uuid').v4(), runId, JSON.stringify(item), now);
      }
    });

    transaction(rows);
  }
};
