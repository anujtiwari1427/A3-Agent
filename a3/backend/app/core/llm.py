from .config import settings
import httpx

class LLMClient:
    def __init__(self, mode: str):
        self.mode = mode
        if mode == "local":
            self.base_url = settings.OLLAMA_BASE_URL
            self.model = settings.OLLAMA_MODEL
        else:
            self.api_key = settings.GROQ_API_KEY
            self.model = "llama3-70b-8192"

    async def complete(self, messages: list, stream: bool = True):
        # This is a stub implementation. In a real app, you would use
        # the official Ollama or Groq python SDKs here.
        if self.mode == "local":
            return self._mock_local_stream(messages)
        else:
            return self._mock_cloud_stream(messages)
            
    async def _mock_local_stream(self, messages):
        yield {"agent": "system", "type": "status", "content": "Running locally..."}
        yield {"agent": "system", "type": "text", "content": "Done."}

    async def _mock_cloud_stream(self, messages):
        yield {"agent": "system", "type": "status", "content": "Running in cloud..."}
        yield {"agent": "system", "type": "text", "content": "Done."}
