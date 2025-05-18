from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session, configure_mappers
from contextlib import contextmanager
from dotenv import load_dotenv
from urllib.parse import urlparse
import os


load_dotenv()
configure_mappers()

tmpPostgres = urlparse(os.getenv("DATABASE_URL"))

engine = create_engine(
    f"postgresql+psycopg2://{tmpPostgres.username}:{tmpPostgres.password}@{tmpPostgres.hostname}{tmpPostgres.path}?sslmode=require",
    echo=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@contextmanager
def get_db():
    """
    Context manager that yields a database session and ensures it's closed when done.
    Usage:
        with get_db() as db:
            users = db.query(User).all()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

# For FastAPI dependency
def get_db_session():
    """
    For FastAPI dependency injection.
    Usage:
        @app.get("/users/")
        def get_users(db: Session = Depends(get_db_session)):
            return db.query(User).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()