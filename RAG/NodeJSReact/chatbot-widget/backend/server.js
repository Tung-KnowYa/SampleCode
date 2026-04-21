const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const env = require('./config/env');
const { PORT } = env;
const { createLLMProvider } = require('./lib/ai/factory');
const { searchKnowledgeBase } = require('./queries/search');

const llm = createLLMProvider(env);

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /api/chat:
 *  post:
 *    summary: Chat with the AI using RAG
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
 *    responses:
 *      '200':
 *        description: AI Response
 */
app.post('/api/chat', async (req, res) => {
  const { message, tool } = req.body;

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
    }

    // 3. Generate Completion
    const systemPrompt = `You are an AI assistant. Use the following context to answer the query. \nContext: ${context}\n\nInstruction: ${toolInstruction}`;
    
    const reply = await llm.chatComplete([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ]);

    res.json({ reply });

  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({ error: "We are currently experiencing issues connecting to the knowledge base. Please try again later." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
});