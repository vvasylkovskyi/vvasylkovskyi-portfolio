import os
import sys

from dotenv import load_dotenv
from langchain_community.document_loaders import DirectoryLoader, PyMuPDFLoader
from langchain_community.vectorstores import Qdrant
from langchain_core.retrievers import BaseRetriever
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from qdrant_client import QdrantClient

from logger.cust_logger import format_log_message, logger, set_files_message_color

load_dotenv()
env_var_key = "DOCS_FOLDER"
LOCAL_DOCS_PATH: str | None = os.getenv(env_var_key)

if not LOCAL_DOCS_PATH:
    logger.fatal(f"Fatal Error: The '{env_var_key}' environment variable is missing.")
    sys.exit(1)

set_files_message_color("CYAN")

class RagIndex:
    _instance = None

    vectordb: Qdrant
    retriever: BaseRetriever
    collection_name: str

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, "initialized"):
            self.initialized = True
            self.vectordb = None
            self.retriever = None
            self.collection_name = "rag-qdrant"

    def update_index(self):
        logger.info(format_log_message(f"Initializing RAG... loading documents from {LOCAL_DOCS_PATH}"))
        
        # Load PDFs
        loader = DirectoryLoader(LOCAL_DOCS_PATH, glob="**/*.pdf", loader_cls=PyMuPDFLoader)
        docs = loader.load()
        logger.info(format_log_message(f"RAG Index loaded {len(docs)} documents from {LOCAL_DOCS_PATH}"))

        # Split text
        text_splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(chunk_size=100, chunk_overlap=50)
        doc_splits = text_splitter.split_documents(docs)

        # Embed and store documents
        embedding_model = OpenAIEmbeddings(model="text-embedding-3-large")

        # Create Qdrant client
        qdrant_client = QdrantClient("qdrant", port=6333)

        # Create or recreate Qdrant collection
        try:
            qdrant_client.recreate_collection(
                collection_name=self.collection_name,
                vectors_config={"size": 1536, "distance": "Cosine"},  # Adjust vector params as needed
            )
        except Exception as e:
            logger.warning(format_log_message(f"Could not recreate collection: {e}"))

        logger.info(format_log_message("Recreated collection... "))
        # Add documents to Qdrant
        self.vectordb = Qdrant.from_documents(
            documents=doc_splits,
            embedding=embedding_model,
            collection_name=self.collection_name,
            client=qdrant_client,  # Pass the Qdrant client
        )

        logger.info(format_log_message(f"RAG Index updated with {len(doc_splits)} document chunks"))
        self.retriever = self.vectordb.as_retriever()

    def search(self, query: str, top_k: int = 5):
        """Search Qdrant for relevant documents"""
        response = self.vectordb.similarity_search(query, k=top_k)
        return [doc.page_content for doc in response]
