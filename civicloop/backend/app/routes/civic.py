"""
Civic score route — citizen ka score dekhna.
Blueprint prefix: /api/v1
"""
from flask import Blueprint, jsonify, g

from app.auth.middleware import require_auth
from app.models.civic_score import CivicScore

civic_bp = Blueprint('civic', __name__, url_prefix='/api/v1')


@civic_bp.route('/civic-score', methods=['GET'])
@require_auth
def get_civic_score():
    """Current user ka civic score return karo."""
    user  = g.current_user
    score = CivicScore.query.filter_by(user_id=user.id).first()

    if not score:
        # Return zero score (score record tab create hota hai jab earn hota hai)
        return jsonify({
            'user_id': user.id,
            'total_score': 0,
            'verified_reports': 0,
            'confirmations_made': 0,
            'resolutions_verified': 0,
        })

    return jsonify(score.to_dict())
