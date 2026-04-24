import logging
import datetime
import chromadb
from llama_index.core import VectorStoreIndex
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.core import StorageContext
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI
from llama_index.core import Settings
import config

# Set up query logging
logging.basicConfig(
    filename='query_log.txt',
    level=logging.INFO,
    format='%(asctime)s | %(message)s'
)


def load_index():
    """Load the existing ChromaDB index."""
    Settings.embed_model = OpenAIEmbedding(
        model=config.EMBED_MODEL,
        api_base=config.OPENAI_API_BASEURL,
        api_key=config.OPENAI_API_KEY
    )
    Settings.llm = OpenAI(
        model=config.LLM_MODEL,
        temperature=config.LLM_TEMPERATURE,
        api_base=config.OPENAI_API_BASEURL,
        api_key=config.OPENAI_API_KEY,
        system_prompt=config.SYSTEM_PROMPT
    )
    chroma_client = chromadb.PersistentClient(path=config.CHROMA_PATH)
    chroma_collection = chroma_client.get_collection(config.COLLECTION_NAME)
    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
    storage_context = StorageContext.from_defaults(
        vector_store=vector_store
    )
    index = VectorStoreIndex.from_vector_store(
        vector_store,
        storage_context=storage_context
    )
    return index


def query_knowledge_base(question: str, index, debug: bool = False) -> dict:
    """Query the knowledge base and return an answer with sources."""
    try:
        query_engine = index.as_query_engine(
            similarity_top_k=config.TOP_K
        )
        response = query_engine.query(question)

        if debug:
            print('\n--- DEBUG: Retrieved Chunks ---')
            for i, node in enumerate(response.source_nodes):
                print(f'Chunk {i+1} | Score: {node.score:.3f}')
                print(f'Source: {node.metadata.get("file_name", "unknown")}')
                print(f'Text: {node.text[:300]}...')
                print('---')

        # Extract source file names from the retrieved nodes
        sources = []
        for node in response.source_nodes:
            fname = node.metadata.get('file_name', 'Unknown source')
            score = round(node.score, 3) if node.score else 'N/A'
            sources.append(f'{fname} (relevance: {score})')

        result = {
            'answer': str(response),
            'sources': sources
        }

        # Log the query
        logging.info(f'Q: {question}')
        logging.info(f'A: {str(response)[:200]}')
        logging.info(f'Sources: {sources}')

        return result

    except Exception as e:
        logging.error(f'Query error: {e}')
        raise


def run_interactive_session():
    """Run an interactive question-answering session in the terminal."""
    print('Loading knowledge base...')
    index = load_index()
    print('Knowledge base ready. Type your questions below.')
    print('Type "exit" to quit.\n')

    while True:
        question = input('Your question: ').strip()
        if question.lower() in ('exit', 'quit', ''):
            print('Goodbye!')
            break

        result = query_knowledge_base(question, index)

        print('\nAnswer:')
        print(result['answer'])
        print('\nSources used:')
        for s in result['sources']:
            print(f'  - {s}')
        print()


if __name__ == '__main__':
    run_interactive_session()
