from models.interaction import Interaction


def add_interaction(db, user_id: int, image_id: int, interaction_type: str):
    weights = {
        'view': 0.5,
        'like': 2.0,
        'save': 3.0,
        'comment': 4.0
    }    
    
    weight = weights.get(interaction_type, 1.0)
    
    new_interaction = Interaction(
        user_id=user_id,
        image_id=image_id,
        interaction_type=interaction_type,
        weight=weight
    )

    db.add(new_interaction)
    db.commit()
    db.refresh(new_interaction)
    return new_interaction

## tu chyba chujowe podejscie 
def delete_interaction(db, user_id: int, image_id: int, interaction_type: str):
    interaction = db.query(Interaction).filter_by(user_id=user_id, image_id=image_id, interaction_type=interaction_type).first()
    if interaction:
        db.delete(interaction)
        db.commit()
        return True
    return False