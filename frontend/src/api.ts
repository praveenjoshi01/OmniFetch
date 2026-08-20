const API_BASE = '/api';

export async function fetchRecipes() {
  const res = await fetch(`${API_BASE}/recipes`);
  if (!res.ok) throw new Error('Failed to fetch recipes');
  return res.json();
}

export async function fetchRuns() {
  const res = await fetch(`${API_BASE}/runs`);
  if (!res.ok) throw new Error('Failed to fetch runs');
  return res.json();
}

export async function triggerRun(recipeId: string) {
  const res = await fetch(`${API_BASE}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipeId })
  });
  if (!res.ok) throw new Error('Failed to trigger run');
  return res.json();
}

export async function fetchResults(runId: string) {
  const res = await fetch(`${API_BASE}/runs/${runId}/results`);
  if (!res.ok) throw new Error('Failed to fetch results');
  return res.json();
}

export async function testStepInline(startUrl: string, step: any) {
  const res = await fetch(`${API_BASE}/engine/test-step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startUrl, step })
  });
  if (!res.ok) throw new Error('Failed to test step inline');
  return res.json();
}
