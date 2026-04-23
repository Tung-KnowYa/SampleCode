import os
from dotenv import load_dotenv

load_dotenv()  # loads variables from .env into the environment

OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')

# Embedding model settings
EMBED_MODEL = 'text-embedding-3-small'

# LLM settings
LLM_MODEL = 'gpt-4o-mini'
LLM_TEMPERATURE = 0.1  # low temperature for factual Q&A

# Chunking settings
CHUNK_SIZE = 400       # tokens per chunk
CHUNK_OVERLAP = 60     # token overlap between chunks

# Retrieval settings
TOP_K = 4              # number of chunks to retrieve per query

# ChromaDB settings
CHROMA_PATH = './chroma_db'
COLLECTION_NAME = 'business_knowledge'

# System prompt
SYSTEM_PROMPT = '''
You are a helpful, professional knowledge base assistant.
Your role is to answer questions accurately using only the
information provided in the context below.

Guidelines:
- Only use information from the provided context to answer questions.
- If the answer is not clearly present in the context, respond with:
  "I don't have that information in my current knowledge base."
- Always mention the source document when using information from it,
  using the format: [Source: document_name.txt]
- When you use information from a specific document, add a brief
  inline citation in the format: [Source: document_name.txt]
  For example: "Returns must be made within 30 days of purchase
  [Source: returns_policy.txt]."
- Keep answers clear and concise. Use bullet points for lists.
- Do not make up information or draw on general knowledge
  outside the provided context.
- If the question is ambiguous, ask for clarification.
'''
