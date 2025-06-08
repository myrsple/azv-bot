import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Create a new assistant
app.post('/api/assistant', async (req, res) => {
  try {
    const assistant = await openai.beta.assistants.create({
      name: "Knowledge Base Assistant",
      instructions: "You are a helpful assistant that provides information from the knowledge base.",
      model: "gpt-4-turbo-preview",
    });
    res.json(assistant);
  } catch (error) {
    console.error('Error creating assistant:', error);
    res.status(500).json({ error: 'Failed to create assistant' });
  }
});

// Create a new thread
app.post('/api/thread', async (req, res) => {
  try {
    const thread = await openai.beta.threads.create();
    res.json(thread);
  } catch (error) {
    console.error('Error creating thread:', error);
    res.status(500).json({ error: 'Failed to create thread' });
  }
});

// Add message to thread
app.post('/api/thread/:threadId/message', async (req, res) => {
  try {
    const { threadId } = req.params;
    const { content } = req.body;
    
    const message = await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content,
    });
    
    res.json(message);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Run the assistant
app.post('/api/thread/:threadId/run', async (req, res) => {
  try {
    const { threadId } = req.params;
    // Always use the assistant ID from the environment variable
    const assistantId = process.env.OPENAI_ASSISTANT_ID;
    if (!assistantId) {
      throw new Error('OPENAI_ASSISTANT_ID is not set in the environment variables');
    }

    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
    });

    res.json(run);
  } catch (error) {
    console.error('Error running assistant:', error);
    res.status(500).json({ error: 'Failed to run assistant' });
  }
});

// Get run status
app.get('/api/thread/:threadId/run/:runId', async (req, res) => {
  try {
    const { threadId, runId } = req.params;
    const run = await openai.beta.threads.runs.retrieve(runId, { thread_id: threadId });
    res.json(run);
  } catch (error) {
    console.error('Error getting run status:', error);
    res.status(500).json({ error: 'Failed to get run status' });
  }
});

// Get messages from thread
app.get('/api/thread/:threadId/messages', async (req, res) => {
  try {
    const { threadId } = req.params;
    const messages = await openai.beta.threads.messages.list(threadId);
    res.json(messages);
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
