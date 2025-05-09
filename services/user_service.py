import bcrypt
from models.user import User

def add_user(session, username, email, password, user_type):
    hashed_password = set_password(password)
    new_user = User(username=username, email=email, password_hash=hashed_password, user_type=user_type)
    session.add(new_user)
    session.commit()
    return new_user

def delete_user(session, user_id):
    user = session.query(User).filter_by(id=user_id).first()
    if user:
        session.delete(user)
        session.commit()
        return True
    return False

def get_user(session, user_id):
    return session.query(User).filter_by(id=user_id).first()

def get_user_by_username(session, username):
    return session.query(User).filter_by(username=username).first()

def get_user_by_email(session, email):
    return session.query(User).filter_by(email=email).first()

def update_user(session, user_id, username=None, password=None):
    user = session.query(User).filter_by(id=user_id).first()
    if user:
        if username:
            user.username = username
        if password:
            user.set_password(password)
        session.commit()
        return True
    return False

def set_password(password):
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
    return password_hash

def check_password(user, password):
    password_bytes = password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, user.password_hash.encode('utf-8'))

def authenticate_user(session, username_or_email, password):
    """
    Authenticate a user by username/email and password
    
    Args:
        session: SQLAlchemy database session
        username_or_email: Username or email of the user
        password: Plain text password
        
    Returns:
        User object if authentication succeeds, None otherwise
    """
    # Try to find user by username
    user = get_user_by_username(session, username_or_email)
    
    # If not found, try by email
    if not user:
        user = get_user_by_email(session, username_or_email)
    
    # If user found, check password
    if user and check_password(user, password):
        return user
        
    return None

def search_users_by_term(session, search_term):
    return session.query(User).filter(
        (User.username.ilike(f"%{search_term}%")) | 
        (User.email.ilike(f"%{search_term}%"))
    ).all()