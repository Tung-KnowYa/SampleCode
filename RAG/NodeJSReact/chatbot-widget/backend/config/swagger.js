const swaggerJsdoc = require('swagger-jsdoc');
const { PORT } = require('./env');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Embeddable AI Chatbot API',
      version: '1.0.0',
      description: 'API for the RAG-based AI Chatbot Widget',
    },
    servers: [{ url: `http://localhost:${PORT}` }],
  },
  apis: ['./server.js'], // Points to the main server file for annotations
};

module.exports = swaggerJsdoc(options);