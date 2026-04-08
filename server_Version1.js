const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

// Simple summarization function (local)
function summarizeText(text, summaryLength) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const words = text.split(/\s+/).length;
    
    // Calculate target sentence count based on summary length percentage
    const targetSentences = Math.max(1, Math.ceil((sentences.length * summaryLength) / 100));
    
    // Extract most important sentences (basic approach)
    const scoredSentences = sentences.map((sentence, index) => {
        const words = sentence.trim().split(/\s+/).length;
        const score = words > 5 ? 1 : 0.5; // Prefer longer sentences
        return { text: sentence.trim(), score, index };
    });

    // Select top sentences in original order
    const importantSentences = scoredSentences
        .sort((a, b) => b.score - a.score)
        .slice(0, targetSentences)
        .sort((a, b) => a.index - b.index)
        .map(s => s.text)
        .join(' ');

    return importantSentences;
}

// Extract text from PDF
async function extractPDFText(pdfBuffer) {
    try {
        const data = await pdfParse(pdfBuffer);
        return data.text;
    } catch (error) {
        throw new Error('Failed to extract text from PDF: ' + error.message);
    }
}

// API route for summarization
app.post('/api/summarize', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const summaryLength = parseInt(req.body.summaryLength) || 50;

        if (summaryLength < 20 || summaryLength > 100) {
            return res.status(400).json({ error: 'Summary length must be between 20 and 100' });
        }

        // Extract text from PDF
        const pdfText = await extractPDFText(req.file.buffer);

        if (!pdfText.trim()) {
            return res.status(400).json({ error: 'Could not extract text from PDF' });
        }

        // Generate summary
        const summary = summarizeText(pdfText, summaryLength);

        // Calculate statistics
        const originalWords = pdfText.split(/\s+/).length;
        const summaryWords = summary.split(/\s+/).length;
        const compressionRatio = Math.round((summaryWords / originalWords) * 100);

        res.json({
            summary,
            originalWords,
            summaryWords,
            compressionRatio
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});