from sqlalchemy import func, desc
from sqlalchemy.orm import Session
from models.image import Image
from models.user import User
from models.tag import Tag
from models.interaction import Interaction
import datetime

def get_recommendations(session: Session, user_id: int, limit: int = 20):
    """
    Generuje spersonalizowane rekomendacje dla użytkownika

    Algorytm uwzględnia:
    1. Obrazy od obserwowanych artystów
    2. Obrazy z tagami, z którymi użytkownik wcześniej wchodził w interakcje
    3. Popularne obrazy w podobnych kategoriach
    4. Nowości w systemie
    """
    if not user_id:
        # Dla niezalogowanych użytkowników - popularne i nowe obrazy
        return get_popular_recent_images(session, limit)
    
    # Znajdź użytkownika
    user = session.query(User).filter(User.id == user_id).first()
    if not user:
        return get_popular_recent_images(session, limit)

    # Wyniki będziemy zbierać w słowniku {image_id: score}
    image_scores = {}
    
    # 1. Obrazy od obserwowanych artystów (najwyższy priorytet)
    followed_users_images = session.query(Image)\
        .join(User, User.id == Image.user_id)\
        .filter(User.id.in_([followed.id for followed in user.following]))\
        .order_by(desc(Image.created_at))\
        .limit(limit * 2)\
        .all()

    # Przypisz wysokie wagi obrazom od obserwowanych
    for img in followed_users_images:
        image_scores[img.id] = image_scores.get(img.id, 0) + 10.0
    
    # 2. Znajdź tagi, z którymi użytkownik wchodził w interakcje
    user_interaction_tags = session.query(Tag)\
        .join(Image.tags)\
        .join(Interaction, Interaction.image_id == Image.id)\
        .filter(Interaction.user_id == user_id)\
        .group_by(Tag.id)\
        .order_by(desc(func.count(Interaction.id)))\
        .limit(10)\
        .all()
        
    # Znajdź obrazy z tymi tagami
    if user_interaction_tags:
        tag_based_images = session.query(Image)\
            .join(Image.tags)\
            .filter(Tag.id.in_([tag.id for tag in user_interaction_tags]))\
            .filter(Image.id.notin_(image_scores.keys()))\
            .limit(limit)\
            .all()
            
        # Przypisz wagi na podstawie podobieństwa tagów
        for img in tag_based_images:
            image_scores[img.id] = image_scores.get(img.id, 0) + 5.0
    
    # 3. Uwzględnij popularność i świeżość - dla wszystkich obrazów
    # Te dwa parametry będą miały niższe wagi, jeśli już przypisaliśmy wagi powyżej
    now = datetime.datetime.now()
    one_week_ago = now - datetime.timedelta(days=7)
    
    # Popularne ostatnio obrazy
    popular_images = session.query(Image, func.count(Interaction.id).label('interactions_count'))\
        .outerjoin(Interaction)\
        .filter(Interaction.timestamp > one_week_ago)\
        .group_by(Image.id)\
        .order_by(desc('interactions_count'))\
        .limit(limit)\
        .all()

    # Przypisz wagi na podstawie popularności
    for img, count in popular_images:
        # Maksymalna waga 3.0 dla najpopularniejszych
        popularity_score = min(3.0, count / 10.0)
        image_scores[img.id] = image_scores.get(img.id, 0) + popularity_score
    
    # 4. Najnowsze obrazy (priorytet dla świeżości)
    recent_images = session.query(Image)\
        .filter(Image.created_at > one_week_ago)\
        .order_by(desc(Image.created_at))\
        .limit(limit)\
        .all()

    # Przypisz wagi na podstawie świeżości
    for img in recent_images:
        days_old = (now - img.created_at).days
        recency_score = 2.0 * (7 - min(days_old, 7)) / 7  # 2.0 to 0.0 w ciągu 7 dni
        image_scores[img.id] = image_scores.get(img.id, 0) + recency_score
    
    # Sortuj obrazy według ich końcowych wag i pobierz pełne obiekty
    sorted_image_ids = sorted(image_scores.keys(), key=lambda x: image_scores[x], reverse=True)
    
    # Pobierz pełne obiekty obrazów
    recommended_images = []
    for image_id in sorted_image_ids[:limit]:
        image = session.query(Image).filter(Image.id == image_id).first()
        if image:
            recommended_images.append(image)
    
    # Jeśli mamy za mało rekomendacji, uzupełnij popularnymi obrazami
    if len(recommended_images) < limit:
        fallback_limit = limit - len(recommended_images)
        fallback_images = get_popular_recent_images(
            session, 
            fallback_limit, 
            [img.id for img in recommended_images]
        )
        recommended_images.extend(fallback_images)
    
    return recommended_images

def get_popular_recent_images(session: Session, limit: int, excluded_ids=None):
    """
    Pobiera popularne i nowe obrazy - dla niezalogowanych użytkowników
    lub jako uzupełnienie dla użytkowników z małą ilością interakcji
    """
    if excluded_ids is None:
        excluded_ids = []
        
    # Łączymy popularność z świeżością
    now = datetime.datetime.utcnow()
    one_month_ago = now - datetime.timedelta(days=30)
    
    popular_recent = session.query(Image, func.count(Interaction.id).label('interaction_count'))\
        .outerjoin(Interaction)\
        .filter(Image.created_at > one_month_ago)\
        .filter(Image.id.notin_(excluded_ids))\
        .group_by(Image.id)\
        .order_by(desc('interaction_count'), desc(Image.created_at))\
        .limit(limit)\
        .all()
    
    # Wyciągnij samo obrazy z wyników
    return [item[0] for item in popular_recent]