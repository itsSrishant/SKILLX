import os
try:
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
    load_dotenv(dotenv_path=env_path)
except Exception:
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip())
        except Exception:
            pass

class Settings:
    PROJECT_NAME: str = "SkillX - Labour Market Intelligence Platform"
    VERSION: str = "1.0.0"
    
    # Database configuration with PostgreSQL primary & SQLite fallback capability
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "skillx")
    
    @property
    def DATABASE_URL(self) -> str:
        # Check if environment variable DATABASE_URL is explicitly set
        env_url = os.getenv("DATABASE_URL")
        if env_url:
            return env_url
        
        # Default to local sqlite file for zero-setup execution, configurable to postgresql
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "skillx.db")
        return f"sqlite:///{db_path}"

settings = Settings()
