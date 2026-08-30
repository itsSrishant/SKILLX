import firebase_admin
from firebase_admin import credentials
import os
import logging

logger = logging.getLogger(__name__)

def initialize_firebase():
    if not firebase_admin._apps:
        # Check for service account JSON
        # The user will need to drop firebase-adminsdk.json in the backend root
        # or we provide an error suggesting they do so.
        cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "firebase-adminsdk.json")
        if os.path.exists(cred_path):
            try:
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                logger.info("Firebase Admin SDK initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
        else:
            logger.warning(
                f"Firebase service account file '{cred_path}' not found! "
                "Token verification will fail. Please add your service account JSON file."
            )

initialize_firebase()
