from models.image import Image
from models.tag import Tag
from sqlalchemy import desc, or_

def add_image(session, user_id, image_url, description=None, tags=None):
    new_image = Image(user_id=user_id, image_url=image_url, description=description)
    session.add(new_image)
    session.flush()

    if tags and isinstance(tags, list):
        tag_objects = []
        for tag_name in tags:
            tag_name = tag_name.strip().lower()
            if not tag_name:
                continue
            
            tag = session.query(Tag).filter(Tag.name == tag_name).first()
            if not tag:
                tag = Tag(name=tag_name)
                session.add(tag)
                session.flush()  
            
            tag_objects.append(tag)

        new_image.tags = tag_objects

    session.commit()
    return new_image

def update_image(session, image_id, image_url=None, description=None, tags=None):
    image = session.query(Image).filter_by(id=image_id).first()
    if image:
        if image_url:
            image.image_url = image_url
        if description:
            image.description = description
        if tags and isinstance(tags, list):
            tag_objects = []
            for tag_name in tags:
                tag_name = tag_name.strip().lower()
                if not tag_name:
                    continue
                
                tag = session.query(Tag).filter(Tag.name == tag_name).first()
                if not tag:
                    tag = Tag(name=tag_name)
                    session.add(tag)
                    session.flush()  
                
                tag_objects.append(tag)

            image.tags = tag_objects

        session.commit()
        return True
    return False

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
        search_term = search_term.strip().lower()        
        tag_images = session.query(Image.id)\
            .join(Image.tags)\
            .filter(Tag.name.ilike(f"%{search_term}%"))\
            .subquery()
            
        query = query.filter(
            or_(
                Image.description.ilike(f"%{search_term}%"),
                Image.id.in_(tag_images)
            )
        )
    
    query = query.order_by(desc(Image.id))
    
    return query.limit(limit).offset(offset).all()

def get_images_by_tags(session, tag_names, limit=20, offset=0):
    if not tag_names:
        return []
        
    normalized_tags = [name.strip().lower() for name in tag_names if name.strip()]
    
    query = session.query(Image).join(Image.tags).filter(
        Tag.name.in_(normalized_tags)
    ).group_by(Image.id)
    
    if len(normalized_tags) > 1:
        from sqlalchemy import func
        query = query.having(
            func.count(Tag.id) > 0
        ).order_by(
            desc(func.count(Tag.id)),
            desc(Image.id)
        )
    else:
        query = query.order_by(desc(Image.id))
        
    return query.limit(limit).offset(offset).all()