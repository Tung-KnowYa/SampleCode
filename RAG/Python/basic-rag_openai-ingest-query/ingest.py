import datetime
import chromadb
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.core import StorageContext
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core import Settings
import config


def run_ingestion():
    print(f"Starting ingestion pipeline at {datetime.datetime.utcnow().isoformat()}")

    # Step 1: Configure the embedding model
    Settings.embed_model = OpenAIEmbedding(
        model=config.EMBED_MODEL,
        api_base=config.OPENAI_API_BASEURL,
        api_key=config.OPENAI_API_KEY
    )

    # Step 2: Load documents from the data/ directory
    print("Loading documents from data/ ...")
    documents = SimpleDirectoryReader('./data').load_data()
    print(f"Loaded {len(documents)} documents")

    # Step 3: Split documents into chunks
    print("Splitting documents into chunks...")
    splitter = SentenceSplitter(
        chunk_size=config.CHUNK_SIZE,
        chunk_overlap=config.CHUNK_OVERLAP
    )
    nodes = splitter.get_nodes_from_documents(documents)
    print(f"Created {len(nodes)} chunks")

    # Step 4: Set up ChromaDB as the vector store
    print("Connecting to ChromaDB...")
    chroma_client = chromadb.PersistentClient(path=config.CHROMA_PATH)

    # Delete existing collection for a clean rebuild
    try:
        chroma_client.delete_collection(config.COLLECTION_NAME)
        print("Deleted existing collection for clean rebuild")
    except Exception:
        print("No existing collection found, creating fresh")

    chroma_collection = chroma_client.get_or_create_collection(
        config.COLLECTION_NAME
    )
    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
    storage_context = StorageContext.from_defaults(
        vector_store=vector_store
    )

    # Step 5: Generate embeddings and store in ChromaDB
    print("Generating embeddings and storing in ChromaDB...")
    index = VectorStoreIndex(
        nodes,
        storage_context=storage_context
    )
    print("Ingestion complete. Knowledge base is ready.")
    print(f"Total chunks stored: {len(nodes)}")
    return index


if __name__ == '__main__':
    run_ingestion()
