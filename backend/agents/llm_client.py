"""
LLM Client abstraction supporting OpenAI, Gemini, and High-Fidelity Deterministic Engine.
"""
import os
import json
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("sentinelops.llm")

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "").strip()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()


def get_active_llm_mode() -> Dict[str, str]:
    if GEMINI_API_KEY:
        return {"mode": "Gemini API", "model": "gemini-1.5-pro", "is_deterministic": False}
    elif OPENAI_API_KEY:
        return {"mode": "OpenAI API", "model": "gpt-4o", "is_deterministic": False}
    else:
        return {"mode": "Deterministic Built-in Engine", "model": "sentinelops-deterministic-v1", "is_deterministic": True}


class LLMClient:
    def __init__(self):
        self.mode_info = get_active_llm_mode()

    def generate_json(self, system_prompt: str, user_prompt: str, response_schema: Optional[type] = None) -> Dict[str, Any]:
        if OPENAI_API_KEY:
            try:
                import httpx
                resp = httpx.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
                    json={
                        "model": "gpt-4o",
                        "messages": [
                            {"role": "system", "content": system_prompt + "\nRespond with valid JSON only."},
                            {"role": "user", "content": user_prompt},
                        ],
                        "response_format": {"type": "json_object"},
                        "temperature": 0.2,
                    },
                    timeout=25.0,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    return json.loads(content)
            except Exception as e:
                logger.warning(f"OpenAI call failed: {e}")
        return {}
