from .config import settings
import httpx

class LLMClient:
    def __init__(self, mode: str = "local"):
        self.mode = "local"
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_MODEL

    async def complete(self, messages: list, stream: bool = True):
        # Local Ollama streaming
        return self._mock_local_stream(messages)
            
    async def _mock_local_stream(self, messages):
        yield {"agent": "system", "type": "status", "content": "Running locally..."}
        yield {"agent": "system", "type": "text", "content": "Done."}
