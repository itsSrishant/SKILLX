from fastapi import Security, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
import os

# Import this so the initialization happens when dependencies are loaded
from app.core import firebase

security = HTTPBearer()

# For RBAC, we'll store a comma-separated list of admin UIDs in the environment.
# You can get your UID from the Firebase Authentication console.
ADMIN_UIDS = os.getenv("ADMIN_UIDS", "").split(",")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Verifies the Firebase ID token and returns the decoded user payload.
    """
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def require_admin(user: dict = Depends(get_current_user)):
    """
    Dependency that enforces Role-Based Access Control (RBAC).
    Only allows users whose UID is present in the ADMIN_UIDS environment variable.
    """
    uid = user.get("uid")
    if not uid or uid not in ADMIN_UIDS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have the required permissions to access this resource."
        )
    return user

# Fallback/Backward-compatibility for static API key if still needed for CI/scripts
from fastapi.security import APIKeyHeader
STATIC_ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "skillx-dev-secret-key-123")
api_key_header = APIKeyHeader(name="X-Admin-API-Key", auto_error=False)

async def verify_admin_key(api_key_header: str = Security(api_key_header)):
    if not api_key_header:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin API Key is missing"
        )
    if api_key_header != STATIC_ADMIN_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid Admin API Key"
        )
    return api_key_header
