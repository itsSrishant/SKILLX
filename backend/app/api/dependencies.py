from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader
import os

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "skillx-dev-secret-key-123")

api_key_header = APIKeyHeader(name="X-Admin-API-Key", auto_error=False)

async def verify_admin_key(api_key_header: str = Security(api_key_header)):
    if not api_key_header:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin API Key is missing"
        )
    if api_key_header != ADMIN_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid Admin API Key"
        )
    return api_key_header
