const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const env = require('./config/env');
const { PORT } = env;
const { createLLMProvider } = require('./lib/ai/factory');
const { searchKnowledgeBase } = require('./queries/search');

const { buildExportFile, isExportTool } = require('./lib/exportDocuments');

const llm = createLLMProvider(env);

const app = express();
app.use(cors({
  exposedHeaders: ['Content-Disposition']
}));
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /api/chat:
 *  post:
 *    summary: Chat with the AI using RAG (supports streaming)
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - message
 *            properties:
 *              message:
 *                type: string
 *                example: "What should I know about data protection?"
 *              tool:
 *                type: string
 */
app.post('/api/chat', async (req, res) => {
  const { message, tool, stream, history = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    // 1. Retrieve Context from Pgvector
    const context = await searchKnowledgeBase(message, llm);

    // 2. Format Tool Instructions
    let toolInstruction = "Answer the user clearly using Markdown.";
    if (tool === 'Chart Report') {
      toolInstruction = `You must provide a JSON chart format wrapped in \`\`\`json chart ... \`\`\`. Example format: [{"name": "A", "value": 400}, {"name": "B", "value": 300}]. Provide brief text context before the chart.`;
    } else if (tool === 'Table Report') {
      toolInstruction = "You must output the relevant data strictly as a Markdown Table.";
    } else if (tool === 'Insights Report') {
      toolInstruction = "Provide a deep dive structural insight report using H3 (###), bullet points, and actionable takeaways.";
    } else if (isExportTool(tool)) {
      toolInstruction = `The user wants to export this as a ${tool}. Ensure your response is well-structured in Markdown, with clear headings and formatting suitable for a professional document.`;
    }

    // 3. Generate Completion
    const systemPrompt = `You are an AI assistant. Use the following context to answer the query. \nContext: ${context}\n\nInstruction: ${toolInstruction}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-5), // Include last 5 messages for context
      { role: 'user', content: message },
    ];

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const streamResponse = await llm.chatStream(messages);
      for await (const chunk of streamResponse) {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const reply = await llm.chatComplete(messages);
      res.json({ reply });
    }

  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({ error: "We are currently experiencing issues connecting to the knowledge base. Please try again later." });
  }
});

/**
 * @swagger
 * /api/export:
 *  post:
 *    summary: Export a markdown reply as a document
 */
app.post('/api/export', async (req, res) => {
  const { tool, content, userMessage } = req.body;

  if (!tool || !content) {
    return res.status(400).json({ error: "Tool and content are required." });
  }

  try {
    const result = await buildExportFile(tool, content, userMessage);
    if (!result) {
      return res.status(400).json({ error: "Invalid export tool." });
    }

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.downloadName}"`);
    res.send(result.buffer);
  } catch (error) {
    console.error("Export Error:", error);
    res.status(500).json({ error: "Failed to export document." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
});