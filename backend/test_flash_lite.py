import os
from dotenv import load_dotenv
load_dotenv()
from app.api.routers.assistant import _call_gemini_with_guardrails

class MockMsg:
    def __init__(self, role, content):
        self.role = role
        self.content = content

history = [MockMsg("user", "hi")]

try:
    # Temporarily force the fallback to gemini-flash-lite-latest by passing a bogus model name first
    # Actually, let's just write a script that bypasses the helper and tests the model directly
    import google.generativeai as genai
    genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
    model = genai.GenerativeModel("gemini-flash-lite-latest")
    res = model.generate_content("Hello! What is the capital of Japan?")
    print("RESULT:", res.text)
except Exception as e:
    print("EXCEPTION CAUGHT:", e)
