from enum import Enum

from ai_personal_lawyer.agent_core.lang_graph_rag_agent import LangGraphRagAgent


class AgentType(str, Enum):
    LangGraphRag = "LangGraphRag"


class AgentFactory:
    def __init__(self):
        pass

    def create_agent(self):
        return LangGraphRagAgent()
