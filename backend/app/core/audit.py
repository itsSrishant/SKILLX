import logging
from datetime import datetime
import json
import os

# Ensure the logs directory exists
LOGS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
os.makedirs(LOGS_DIR, exist_ok=True)
AUDIT_LOG_FILE = os.path.join(LOGS_DIR, "admin_audit.log")

def get_audit_logger():
    logger = logging.getLogger("audit_logger")
    logger.setLevel(logging.INFO)
    
    # Avoid adding multiple handlers if logger is already configured
    if not logger.handlers:
        file_handler = logging.FileHandler(AUDIT_LOG_FILE)
        formatter = logging.Formatter('%(message)s')
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    return logger

class AuditLogger:
    def __init__(self):
        self.logger = get_audit_logger()

    def log_admin_action(self, uid: str, ip: str, action: str, details: dict = None):
        """
        Securely logs an administrative action.
        Never log API keys or secrets in the details payload.
        """
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "uid": uid,
            "ip_address": ip,
            "action": action,
            "details": details or {}
        }
        self.logger.info(json.dumps(log_entry))

audit_logger = AuditLogger()
