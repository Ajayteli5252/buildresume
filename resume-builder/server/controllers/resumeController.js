import Resume from '../models/Resume.js';
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';
import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Load environment variables directly in this file
dotenv.config();

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize OpenAI API with error handling
let openai;
let openaiAvailable = true;
let openaiErrorMessage = '';

try {
  // Check if API key is present
  const apiKey = process.env.OPENAI_API_KEY;
  
  console.log('API Key found:', apiKey ? 'Yes (length: ' + apiKey.length + ')' : 'No');
  
  if (!apiKey) {
    console.warn('OpenAI API key is missing.');
    openaiAvailable = false;
    openaiErrorMessage = 'OpenAI API key is missing. Please add a valid API key to your .env file.';
    throw new Error('Missing API key');
  }
  
  // Check if API key format is valid (should start with 'sk-' or 'sk-proj-')
  if (!apiKey.startsWith('sk-')) {
    console.warn('OpenAI API key format is invalid. API keys should start with "sk-"');
    // Allow sk-proj- keys for development
    if (!apiKey.startsWith('sk-proj-')) {
      openaiAvailable = false;
      openaiErrorMessage = 'Invalid OpenAI API key format. API keys should start with "sk-" or "sk-proj-".';
      throw new Error('Invalid API key format');
    }
  }
  
  openai = new OpenAI({
    apiKey: apiKey
  });
} catch (error) {
  console.error('Error initializing OpenAI:', error.message);
  // Create a mock OpenAI instance to prevent server crash
  openai = {
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { content: openaiErrorMessage || 'AI enhancement is currently unavailable. Please check your OpenAI API key.' } }]
        })
      }
    }
  };
}

/**
 * Enhance a specific section of the resume using AI
 */
export const enhanceSection = async (req, res) => {
  try {
    const { section, inputText } = req.body;
    
    if (!section || !inputText) {
      return res.status(400).json({ error: 'Section and input text are required' });
    }

    // Check if OpenAI is available
    if (!openaiAvailable) {
      return res.status(503).json({ 
        error: openaiErrorMessage || 'AI enhancement is currently unavailable. Please check your OpenAI API key.',
        aiUnavailable: true
      });
    }

    // Generate a unique prompt to ensure different responses
    const uniquePrompt = `Enhance the following ${section} section for a professional resume. Make it well-written, impactful, and unique: ${inputText}. Current timestamp: ${Date.now()}`;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a professional resume writer. Your task is to enhance resume content to be more impactful, professional, and well-written." },
        { role: "user", content: uniquePrompt }
      ],
      max_tokens: 500,
      temperature: 0.7, // Add some randomness for uniqueness
    });

    const enhancedText = completion.choices[0].message.content.trim();
    
    // Check if we got the error message from our mock OpenAI instance
    if (enhancedText.includes('AI enhancement is currently unavailable') || 
        enhancedText.includes('OpenAI API key')) {
      return res.status(503).json({ 
        error: enhancedText,
        aiUnavailable: true
      });
    }
    
    return res.status(200).json({ enhancedText });
  } catch (error) {
    console.error('Error enhancing section:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to enhance section',
      aiUnavailable: error.message?.includes('API key') || false
    });
  }
};

/**
 * Save resume data to database
 */
export const saveResume = async (req, res) => {
  try {
    const { userId, resumeData } = req.body;
    
    if (!userId || !resumeData) {
      return res.status(400).json({ error: 'User ID and resume data are required' });
    }

    // Find existing resume or create new one
    const resume = await Resume.findOneAndUpdate(
      { userId },
      { resumeData, updatedAt: Date.now() },
      { new: true, upsert: true }
    );
    
    return res.status(200).json({ success: true, resume });
  } catch (error) {
    console.error('Error saving resume:', error);
    return res.status(500).json({ error: 'Failed to save resume' });
  }
};

/**
 * Get resume data by user ID
 */
export const getResume = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const resume = await Resume.findOne({ userId });
    
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    return res.status(200).json({ resume });
  } catch (error) {
    console.error('Error getting resume:', error);
    return res.status(500).json({ error: 'Failed to get resume' });
  }
};

/**
 * Generate a shareable link for a resume
 */
export const generateShareLink = async (req, res) => {
  try {
    const { userId } = req.params;
    const { expiryDays } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const resume = await Resume.findOne({ userId });
    
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    // Generate a unique token for sharing
    const shareToken = uuidv4();
    
    // Set expiry date if provided
    let shareExpiry = null;
    if (expiryDays) {
      shareExpiry = new Date();
      shareExpiry.setDate(shareExpiry.getDate() + parseInt(expiryDays));
    }
    
    // Update resume with share token and expiry
    resume.shareToken = shareToken;
    resume.shareExpiry = shareExpiry;
    await resume.save();
    
    // Generate the full share URL
    const shareUrl = `${req.protocol}://${req.get('host')}/share/${shareToken}`;
    
    return res.status(200).json({ shareUrl, expiryDate: shareExpiry });
  } catch (error) {
    console.error('Error generating share link:', error);
    return res.status(500).json({ error: 'Failed to generate share link' });
  }
};

/**
 * Get a shared resume by token
 */
export const getSharedResume = async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ error: 'Share token is required' });
    }

    const resume = await Resume.findOne({ shareToken: token });
    
    if (!resume) {
      return res.status(404).json({ error: 'Shared resume not found or link expired' });
    }
    
    // Check if the share link has expired
    if (resume.shareExpiry && new Date() > resume.shareExpiry) {
      return res.status(410).json({ error: 'Share link has expired' });
    }
    
    return res.status(200).json({ resumeData: resume.resumeData });
  } catch (error) {
    console.error('Error getting shared resume:', error);
    return res.status(500).json({ error: 'Failed to get shared resume' });
  }
};

/**
 * Generate a PDF from resume data
 */
export const generatePDF = async (req, res) => {
  try {
    const { resumeData } = req.body;
    
    if (!resumeData) {
      return res.status(400).json({ error: 'Resume data is required' });
    }

    // Create a new PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=resume.pdf');
    
    // Pipe the PDF document to the response
    doc.pipe(res);
    
    // Add content to the PDF based on resumeData
    // This is a simplified version - you would need to format this according to your template
    doc.fontSize(25).text('Resume', { align: 'center' });
    doc.moveDown();
    
    // Personal Info
    if (resumeData.name) {
      doc.fontSize(16).text(resumeData.name, { align: 'center' });
    }
    
    if (resumeData.email || resumeData.phone) {
      doc.fontSize(10).text(`${resumeData.email || ''} | ${resumeData.phone || ''}`, { align: 'center' });
    }
    
    doc.moveDown();
    
    // Summary
    if (resumeData.summary) {
      doc.fontSize(14).text('Professional Summary', { underline: true });
      doc.fontSize(10).text(resumeData.summary);
      doc.moveDown();
    }
    
    // Experience
    if (resumeData.experience && resumeData.experience.length > 0) {
      doc.fontSize(14).text('Work Experience', { underline: true });
      
      resumeData.experience.forEach(exp => {
        doc.fontSize(12).text(`${exp.title} at ${exp.company}`);
        doc.fontSize(10).text(`${exp.startDate} - ${exp.endDate || 'Present'}`);
        doc.fontSize(10).text(exp.description);
        doc.moveDown();
      });
    }
    
    // Education
    if (resumeData.education && resumeData.education.length > 0) {
      doc.fontSize(14).text('Education', { underline: true });
      
      resumeData.education.forEach(edu => {
        doc.fontSize(12).text(`${edu.degree} - ${edu.institution}`);
        doc.fontSize(10).text(`${edu.startDate} - ${edu.endDate || 'Present'}`);
        if (edu.description) {
          doc.fontSize(10).text(edu.description);
        }
        doc.moveDown();
      });
    }
    
    // Skills
    if (resumeData.skills && resumeData.skills.length > 0) {
      doc.fontSize(14).text('Skills', { underline: true });
      
      const skillsText = resumeData.skills.map(skill => {
        if (typeof skill === 'string') {
          return skill;
        } else if (skill.category && skill.items) {
          return `${skill.category}: ${skill.items.join(', ')}`;
        }
        return '';
      }).filter(Boolean).join(', ');
      
      doc.fontSize(10).text(skillsText);
      doc.moveDown();
    }
    
    // Languages
    if (resumeData.languages && resumeData.languages.length > 0) {
      doc.fontSize(14).text('Languages', { underline: true });
      
      const languagesText = resumeData.languages.map(lang => {
        return `${lang.name} (${lang.level})`;
      }).join(', ');
      
      doc.fontSize(10).text(languagesText);
    }
    
    // Finalize the PDF and end the stream
    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    return res.status(500).json({ error: 'Failed to generate PDF' });
  }
};

/**
 * Auto-enhance the entire resume using AI
 */
export const autoEnhanceResume = async (req, res) => {
  try {
    const { resumeData } = req.body;
    
    if (!resumeData) {
      return res.status(400).json({ error: 'Resume data is required' });
    }

    // Check if OpenAI is available
    if (!openaiAvailable) {
      return res.status(503).json({ 
        error: openaiErrorMessage || 'AI enhancement is currently unavailable. Please check your OpenAI API key.',
        aiUnavailable: true
      });
    }

    // Create a deep copy of the resume data
    const enhancedResume = JSON.parse(JSON.stringify(resumeData));
    
    // Enhance summary if it exists
    if (enhancedResume.summary) {
      const summaryPrompt = `Enhance the following professional summary to be more impactful and well-written: ${enhancedResume.summary}. Current timestamp: ${Date.now()}`;
      
      const summaryCompletion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a professional resume writer. Your task is to enhance resume content to be more impactful, professional, and well-written." },
          { role: "user", content: summaryPrompt }
        ],
        max_tokens: 300,
        temperature: 0.7,
      });
      
      const summaryText = summaryCompletion.choices[0].message.content.trim();
      
      // Check if we got the error message from our mock OpenAI instance
      if (summaryText.includes('AI enhancement is currently unavailable') || 
          summaryText.includes('OpenAI API key')) {
        return res.status(503).json({ 
          error: summaryText,
          aiUnavailable: true
        });
      }
      
      enhancedResume.summary = summaryText;
    }
    
    // Enhance experience descriptions if they exist
    if (enhancedResume.experience && enhancedResume.experience.length > 0) {
      for (let i = 0; i < enhancedResume.experience.length; i++) {
        if (enhancedResume.experience[i].description) {
          const expPrompt = `Enhance the following work experience description to be more impactful, using strong action verbs and quantifiable achievements: ${enhancedResume.experience[i].description}. Current timestamp: ${Date.now()}`;
          
          const expCompletion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: "You are a professional resume writer. Your task is to enhance resume content to be more impactful, professional, and well-written." },
              { role: "user", content: expPrompt }
            ],
            max_tokens: 300,
            temperature: 0.7,
          });
          
          const expText = expCompletion.choices[0].message.content.trim();
          
          // Check if we got the error message from our mock OpenAI instance
          if (expText.includes('AI enhancement is currently unavailable') || 
              expText.includes('OpenAI API key')) {
            return res.status(503).json({ 
              error: expText,
              aiUnavailable: true
            });
          }
          
          enhancedResume.experience[i].description = expText;
        }
      }
    }
    
    // Enhance education descriptions if they exist
    if (enhancedResume.education && enhancedResume.education.length > 0) {
      for (let i = 0; i < enhancedResume.education.length; i++) {
        if (enhancedResume.education[i].description) {
          const eduPrompt = `Enhance the following education description to be more impactful and relevant: ${enhancedResume.education[i].description}. Current timestamp: ${Date.now()}`;
          
          const eduCompletion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: "You are a professional resume writer. Your task is to enhance resume content to be more impactful, professional, and well-written." },
              { role: "user", content: eduPrompt }
            ],
            max_tokens: 200,
            temperature: 0.7,
          });
          
          const eduText = eduCompletion.choices[0].message.content.trim();
          
          // Check if we got the error message from our mock OpenAI instance
          if (eduText.includes('AI enhancement is currently unavailable') || 
              eduText.includes('OpenAI API key')) {
            return res.status(503).json({ 
              error: eduText,
              aiUnavailable: true
            });
          }
          
          enhancedResume.education[i].description = eduText;
        }
      }
    }
    
    return res.status(200).json({ enhancedResume });
  } catch (error) {
    console.error('Error auto-enhancing resume:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to auto-enhance resume',
      aiUnavailable: error.message?.includes('API key') || false
    });
  }
};