import { Router } from 'express';
import { testStepInline } from '../services/automationEngine';

const router = Router();

router.post('/test-step', async (req, res) => {
  try {
    const { startUrl, step } = req.body;
    if (!startUrl || !step) {
      return res.status(400).json({ error: 'startUrl and step are required' });
    }

    const testResult = await testStepInline(startUrl, step);
    res.json(testResult);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
