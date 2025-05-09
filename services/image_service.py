from models.image import Image
from sqlalchemy import desc

def add_image(session, user_id, image_url, description=None):
    new_image = Image(user_id=user_id, image_url=image_url, description=description)
    session.add(new_image)
    session.commit()
    return new_image

def delete_image(session, image_id):
    image = session.query(Image).filter_by(id=image_id).first()
    if image:
        session.delete(image)
        session.commit()
        return True
    return False

def get_image(session, image_id):
    return session.query(Image).filter_by(id=image_id).first()

def get_user_images(session, user_id):
    return session.query(Image).filter_by(user_id=user_id).all()

def get_feed_images(session, limit=20, offset=0, search_term=None):
    query = session.query(Image)
    
    if search_term:
        query = query.filter(Image.description.ilike(f"%{search_term}%"))
    query = query.order_by(desc(Image.id))
    
    return query.limit(limit).offset(offset).all()