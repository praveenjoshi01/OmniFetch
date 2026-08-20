import { chromium, Browser, Page } from 'playwright';
import { Recipe, Step, Run, CapturedRow } from '../types';
import { RunStore, ResultStore } from './db';
import { v4 as uuidv4 } from 'uuid';

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browserInstance;
}

export async function executeRecipe(recipe: Recipe): Promise<Run> {
  const runId = uuidv4();
  const startTime = new Date().toISOString();

  const run: Run = {
    id: runId,
    recipeId: recipe.id,
    status: 'running',
    startedAt: startTime,
    resultCount: 0,
    logs: []
  };

  const logMessage = (msg: string, stepIndex: number, type: string, status: 'info' | 'success' | 'error' = 'info') => {
    const entry = {
      timestamp: new Date().toISOString(),
      stepIndex,
      stepType: type,
      message: msg,
      status
    };
    run.logs?.push(entry);
    console.log(`[Run ${runId} Step ${stepIndex}] ${type}: ${msg}`);
  };

  RunStore.save(run);

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    browser = await getBrowser();
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 WebCapture/1.0'
    });
    page = await context.newPage();

    logMessage(`Initializing session for ${recipe.name}`, 0, 'init', 'info');

    // Storage map for extract steps: { labelOrSelector: string[] }
    const extractions: Record<string, string[]> = {};

function sanitizeSelector(selector: string): string[] {
  const candidates: string[] = [selector];

  // If selector has dynamic IDs (containing numbers)
  if (/#\d+/.test(selector) || /#[a-zA-Z0-9_-]*\d+[a-zA-Z0-9_-]*/.test(selector)) {
    // 1. Strip dynamic numeric IDs (e.g. tr#49379253 -> tr)
    const strippedId = selector.replace(/#[a-zA-Z0-9_-]*\d+[a-zA-Z0-9_-]*/g, '');
    if (strippedId && !candidates.includes(strippedId)) candidates.push(strippedId);

    // 2. Strip nth-of-type indices (e.g. td:nth-of-type(3) -> td)
    const strippedNth = strippedId.replace(/:nth-of-type\(\d+\)/g, '');
    if (strippedNth && !candidates.includes(strippedNth)) candidates.push(strippedNth);

    // 3. Fallback for common title links
    if (selector.includes('span > a') || selector.endsWith('a')) {
      if (!candidates.includes('.titleline > a')) candidates.push('.titleline > a');
      if (!candidates.includes('td > a')) candidates.push('td > a');
    }
  }

  return candidates;
}

    for (let i = 0; i < recipe.steps.length; i++) {
      const step = recipe.steps[i];
      const stepNum = i + 1;
      const stepTimeout = step.timeout || 10000;

      logMessage(`Executing step: ${step.label || step.type}`, stepNum, step.type, 'info');

      switch (step.type) {
        case 'navigate': {
          const targetUrl = step.value || recipe.startUrl;
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: stepTimeout });
          logMessage(`Navigated to ${targetUrl}`, stepNum, step.type, 'success');
          break;
        }

        case 'click': {
          if (!step.selector) throw new Error('Click step requires a CSS selector');
          const candidates = sanitizeSelector(step.selector);
          let success = false;
          for (const cand of candidates) {
            try {
              await page.waitForSelector(cand, { timeout: 4000 });
              await page.click(cand, { timeout: stepTimeout });
              logMessage(`Clicked element matching "${cand}"`, stepNum, step.type, 'success');
              success = true;
              break;
            } catch (_) {}
          }
          if (!success) throw new Error(`Could not locate click element for selector "${step.selector}"`);
          break;
        }

        case 'type': {
          if (!step.selector) throw new Error('Type step requires a CSS selector');
          const candidates = sanitizeSelector(step.selector);
          let success = false;
          for (const cand of candidates) {
            try {
              await page.waitForSelector(cand, { timeout: 4000 });
              await page.fill(cand, step.value || '', { timeout: stepTimeout });
              logMessage(`Typed "${step.value}" into "${cand}"`, stepNum, step.type, 'success');
              success = true;
              break;
            } catch (_) {}
          }
          if (!success) throw new Error(`Could not locate type input element for selector "${step.selector}"`);
          break;
        }

        case 'wait': {
          if (step.selector) {
            const candidates = sanitizeSelector(step.selector);
            let success = false;
            for (const cand of candidates) {
              try {
                await page.waitForSelector(cand, { timeout: 4000 });
                logMessage(`Waited for selector "${cand}"`, stepNum, step.type, 'success');
                success = true;
                break;
              } catch (_) {}
            }
            if (!success) {
              logMessage(`Warning: Wait selector "${step.selector}" timed out, proceeding...`, stepNum, step.type, 'info');
            }
          } else if (step.value) {
            const delayMs = parseInt(step.value, 10) || 1000;
            await page.waitForTimeout(delayMs);
            logMessage(`Waited for ${delayMs}ms`, stepNum, step.type, 'success');
          } else {
            await page.waitForTimeout(2000);
            logMessage(`Waited for default 2000ms`, stepNum, step.type, 'success');
          }
          break;
        }

        case 'scroll': {
          if (step.selector) {
            await page.evaluate((sel) => {
              const el = document.querySelector(sel);
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, step.selector);
            logMessage(`Scrolled to "${step.selector}"`, stepNum, step.type, 'success');
          } else {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            logMessage(`Scrolled to page bottom`, stepNum, step.type, 'success');
          }
          break;
        }

        case 'extract': {
          if (!step.selector) throw new Error('Extract step requires a CSS selector');
          const candidates = sanitizeSelector(step.selector);
          let extractedValues: string[] = [];
          let activeSelector = step.selector;

          for (const cand of candidates) {
            try {
              await page.waitForSelector(cand, { timeout: 4000 });
              const attr = step.attribute || 'text';
              extractedValues = await page.evaluate(({ sel, attribute }) => {
                const elements = Array.from(document.querySelectorAll(sel));
                return elements.map(el => {
                  if (attribute === 'text') return (el.textContent || '').trim();
                  if (attribute === 'html') return (el.innerHTML || '').trim();
                  if (attribute === 'value' && 'value' in el) return (el as HTMLInputElement).value;
                  return el.getAttribute(attribute) || '';
                }).filter(val => val.length > 0);
              }, { sel: cand, attribute: attr });

              if (extractedValues.length > 0) {
                activeSelector = cand;
                break;
              }
            } catch (_) {}
          }

          const keyName = step.label || activeSelector;
          extractions[keyName] = extractedValues;

          logMessage(`Extracted ${extractedValues.length} items for "${keyName}" (using selector "${activeSelector}")`, stepNum, step.type, 'success');
          break;
        }

        default:
          logMessage(`Skipping unsupported step type "${step.type}"`, stepNum, step.type, 'info');
      }
    }

    // Process extracted columns into row-oriented JSON array
    const extractedKeys = Object.keys(extractions);
    const resultsRows: Record<string, any>[] = [];

    if (extractedKeys.length > 0) {
      const maxRows = Math.max(...extractedKeys.map(k => extractions[k].length));
      for (let r = 0; r < maxRows; r++) {
        const row: Record<string, any> = {};
        for (const k of extractedKeys) {
          row[k] = extractions[k][r] || null;
        }
        resultsRows.push(row);
      }
    }

    // Save results
    if (resultsRows.length > 0) {
      ResultStore.saveBatch(runId, resultsRows);
    }

    run.status = 'success';
    run.finishedAt = new Date().toISOString();
    run.resultCount = resultsRows.length;
    logMessage(`Recipe execution completed successfully. Captured ${resultsRows.length} data rows.`, recipe.steps.length + 1, 'complete', 'success');

    RunStore.save(run);
    await context.close();
    return run;

  } catch (err: any) {
    const errorMsg = err.message || 'Execution failed';
    logMessage(`Execution Error: ${errorMsg}`, 99, 'error', 'error');
    run.status = 'failed';
    run.finishedAt = new Date().toISOString();
    run.errorMessage = errorMsg;
    RunStore.save(run);

    if (page) {
      try { await page.context().close(); } catch (_) {}
    }
    return run;
  }
}

export async function testStepInline(startUrl: string, step: Step): Promise<{ success: boolean; result?: any; error?: string }> {
  let browser: Browser | null = null;
  try {
    browser = await getBrowser();
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    const targetUrl = step.type === 'navigate' ? (step.value || startUrl) : startUrl;
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

    let testOutput: any = null;

    if (step.type === 'click' && step.selector) {
      await page.waitForSelector(step.selector, { timeout: 5000 });
      await page.click(step.selector);
      testOutput = `Successfully clicked element matching "${step.selector}"`;
    } else if (step.type === 'type' && step.selector) {
      await page.waitForSelector(step.selector, { timeout: 5000 });
      await page.fill(step.selector, step.value || '');
      testOutput = `Successfully typed "${step.value}" into "${step.selector}"`;
    } else if (step.type === 'extract' && step.selector) {
      await page.waitForSelector(step.selector, { timeout: 5000 });
      const attr = step.attribute || 'text';
      testOutput = await page.evaluate(({ sel, attribute }) => {
        const els = Array.from(document.querySelectorAll(sel));
        return els.slice(0, 10).map(el => {
          if (attribute === 'text') return (el.textContent || '').trim();
          if (attribute === 'html') return (el.innerHTML || '').trim();
          return el.getAttribute(attribute) || '';
        });
      }, { sel: step.selector, attribute: attr });
    } else {
      testOutput = `Step "${step.type}" evaluated clean.`;
    }

    await context.close();
    return { success: true, result: testOutput };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
