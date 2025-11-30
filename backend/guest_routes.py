from uuid import uuid4

from flask import Blueprint, jsonify, request, g

from jwt_helper import create_jwt, guest_or_user_required


def _validate_cdr_sum(raw_value):
    try:
        value = float(raw_value)
    except (TypeError, ValueError):
        raise ValueError("CDRSUM 必須是數值")

    if value < 0 or value > 18:
        raise ValueError("CDRSUM 需介於 0 到 18")
    if not float(value * 2).is_integer():
        raise ValueError("CDRSUM 僅接受 0.5 的倍數")
    if value in (16.5, 17.5):
        raise ValueError("CDRSUM 16.5 與 17.5 不可使用")
    return value


def _validate_cdr_score(raw_value, field_name):
    try:
        value = float(raw_value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} 必須是數值")

    if value not in {0.0, 0.5, 1.0, 2.0, 3.0}:
        raise ValueError(f"{field_name} 僅接受 0、0.5、1、2、3")
    return value


def _validate_mmse(raw_value):
    try:
        value = float(raw_value)
    except (TypeError, ValueError):
        raise ValueError("NACCMMSE 必須是整數")

    if not float(value).is_integer():
        raise ValueError("NACCMMSE 必須是整數")
    if value < 0 or value > 30:
        raise ValueError("NACCMMSE 需介於 0 到 30")
    return int(value)


def _parse_guest_payload(payload):
    cdr_sum = _validate_cdr_sum(payload.get('cdrSum'))
    cdr_memory = _validate_cdr_score(payload.get('cdrMemory'), 'CDRMEMORY')
    cdr_glob = _validate_cdr_score(payload.get('cdrGlob'), 'CDRGLOB')
    nacc_mmse = _validate_mmse(payload.get('naccMmse'))
    return {
        'cdrSum': cdr_sum,
        'cdrMemory': cdr_memory,
        'cdrGlob': cdr_glob,
        'naccMmse': nacc_mmse,
    }


guest_blueprint = Blueprint('guest_routes', __name__)


@guest_blueprint.route('/guest/session', methods=['POST'])
def create_guest_session():
    if not request.is_json:
        return jsonify({'error': 'Content-Type 必須為 application/json'}), 400

    payload = request.get_json(silent=True) or {}
    try:
        validated = _parse_guest_payload(payload)
    except ValueError as ex:
        return jsonify({'error': str(ex)}), 400

    session_id = str(uuid4())
    token, expiration = create_jwt(session_id, 'guest', 30)
    return jsonify({
        'token': token,
        'expiresAt': expiration.isoformat(),
        'payload': validated,
    })


@guest_blueprint.route('/guest/protected-sample', methods=['GET'])
@guest_or_user_required
def guest_protected():
    return jsonify({'message': 'Guest token verified', 'role': getattr(g, 'current_role', 'guest')})
