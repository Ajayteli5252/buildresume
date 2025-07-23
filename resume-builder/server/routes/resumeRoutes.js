import express from 'express';
import {
  enhanceSection,
  saveResume,
  getResume,
  generateShareLink,
  getSharedResume,
  generatePDF,
  autoEnhanceResume
} from '../controllers/resumeController.js';

const router = express.Router();

// AI Enhancement routes
router.post('/enhance-section', enhanceSection);
router.post('/auto-enhance-resume', autoEnhanceResume);

// Resume CRUD routes
router.post('/save-resume', saveResume);
router.get('/get-resume/:userId', getResume);

// Share resume route
router.get('/generate-share-link/:userId', generateShareLink);
router.get('/shared-resume/:token', getSharedResume);

// PDF generation route
router.post('/generate-pdf', generatePDF);

export default router;