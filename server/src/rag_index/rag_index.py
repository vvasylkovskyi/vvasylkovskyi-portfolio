import os
import sys

from dotenv import load_dotenv
from langchain_community.document_loaders import DirectoryLoader, PyMuPDFLoader
from langchain_community.vectorstores import Chroma
from langchain_core.retrievers import BaseRetriever
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pinecone import Pinecone, ServerlessSpec

from logger.cust_logger import format_log_message, logger, set_files_message_color

load_dotenv()
# env_var_key = "DOCS_FOLDER"
env_var_key = "DOCS_FOLDER_LOCAL"
LOCAL_DOCS_PATH: str | None = os.getenv(env_var_key)

if not LOCAL_DOCS_PATH:
    logger.fatal(f"Fatal Error: The '{env_var_key}' environment variable is missing.")
    sys.exit(1)

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")

if not PINECONE_API_KEY:
    logger.fatal("Fatal Error: The 'PINECONE_API_KEY' environment variable is missing.")
    sys.exit(1)

set_files_message_color("CYAN")  # Set color for logging in this function


class RagIndex:
    _instance = None  # Class attribute to store the singleton instance

    vectordb: Chroma
    persistence_path: str
    retriever: BaseRetriever

    def __new__(cls, *args, **kwargs):
        # Check if an instance already exists
        if not cls._instance:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, "initialized"):  # Ensure __init__ is run only once
            self.initialized = True
            self.vectordb = None
            self.persistence_path = None
            self.retriever = None
            # Create or connect to the Pinecone index
            self.pc = Pinecone(api_key=PINECONE_API_KEY)
            index_name = "rag-pinecone"  # Define your index name
            if index_name not in self.pc.list_indexes().names():
                self.pc.create_index(
                    name=index_name,
                    dimension=1536,  # Adjust dimension as per your embedding model
                    metric="cosine",  # Use 'euclidean' or 'cosine' as per your requirement
                    spec=ServerlessSpec(cloud="aws", region="us-east-1"),  # Adjust cloud and region as needed
                )

    def update_index(self):
        logger.info(format_log_message(f"Initializing RAG... loading documents from {LOCAL_DOCS_PATH}"))
        loader = DirectoryLoader(LOCAL_DOCS_PATH, glob="**/*.pdf", loader_cls=PyMuPDFLoader)
        docs = loader.load()
        logger.info(format_log_message(f"RAG Index loaded {len(docs)} documents from {LOCAL_DOCS_PATH}"))
        text_splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(chunk_size=100, chunk_overlap=50)
        doc_splits = text_splitter.split_documents(docs)

        # Initialize the OpenAI embeddings model
        embedding_model = OpenAIEmbeddings(model="text-embedding-ada-002")

        # Embed and upsert documents to Pinecone
        index = self.pc.Index("rag-pinecone")  # Use the Pinecone instance to get the index
        points = []
        for i, doc in enumerate(doc_splits):
            embedding = embedding_model.embed_query(doc.page_content)  # Generate embedding
            points.append((str(i), embedding, {"text": doc.page_content}))  # Prepare for upsert

        index.upsert(vectors=points)  # Upsert to Pinecone

        logger.info(format_log_message(f"RAG Index updated with {len(points)} document chunks"))
        self.vectordb = PineconeVectorStore(
            index=index, embedding=embedding_model
        )  # "text" is the metadata key for document text
        self.retriever = self.vectordb.as_retriever()  # Assuming you implement this method
