import os
from dotenv import load_dotenv

load_dotenv()

from app.api.routers.assistant import _call_gemini_with_guardrails

history = [{"role": "user", "content": "hi"}]

class MockMsg:
    def __init__(self, role, content):
        self.role = role
        self.content = content

hist_objs = [MockMsg(h["role"], h["content"]) for h in history]

try:
    res = _call_gemini_with_guardrails("You are a helpful assistant.", "What is the capital of France?", history=hist_objs)
    print("RESULT:", res)
except Exception as e:
    print("EXCEPTION CAUGHT BY SCRIPT:", e)
