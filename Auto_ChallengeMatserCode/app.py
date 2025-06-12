from flask import Flask, session, jsonify, request, render_template
from sequenceMaster import SequenceMasterV2
import os

from sequenceMaster import SequenceMasterV2
app = Flask(__name__)
app.secret_key = os.urandom(24)
GAMES = {}

def get_game_for_session():
    sid = session.get('sid')
    if not sid:
        sid = os.urandom(8).hex()
        session['sid'] = sid
    if sid not in GAMES:
        GAMES[sid] = SequenceMasterV2()
    return GAMES[sid]


# ... (keep your GAMES and get_game_for_session as before) ...

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/challenge', methods=['GET'])
def api_challenge():
    game = get_game_for_session()
    game.generate_sequence()
    # Store the correct answer in the session
    session['last_answer'] = game.correct_answer
    return jsonify({
        'level': game.level,
        'score': game.score,
        'sequence': game.sequence,
        'hint': game.hint
    })

@app.route('/api/answer', methods=['POST'])
def api_answer():
    game = get_game_for_session()
    data = request.get_json()
    answer = data.get('answer')
    message = ''
    game_over = False
    try:
        answer_int = int(answer)
        if answer_int == game.correct_answer:
            game.score += 100 * game.level
            game.level += 1
            message = 'Correct! Next challenge awaits...'
        else:
            # Store the correct answer before ending the game
            session['last_answer'] = game.correct_answer
            message = f'Wrong! The correct answer was {game.correct_answer}. Final Score: {game.score}'
            game_over = True
            GAMES.pop(session['sid'], None)
    except Exception:
        message = 'Please enter a valid number.'
    return jsonify({'message': message, 'game_over': game_over})

@app.route('/api/quit', methods=['POST'])
def api_quit():
    game = get_game_for_session()
    # Store the correct answer before ending the game
    session['last_answer'] = game.correct_answer
    message = f'Game Over! Final Score: {game.score}'
    GAMES.pop(session['sid'], None)
    return jsonify({'message': message, 'game_over': True})

@app.route('/api/last_answer', methods=['GET'])
def last_answer():
    # Assuming you store the last answer in the session or a global variable
    last_answer = session.get('last_answer', None)
    return jsonify({'last_answer': last_answer})

if __name__ == '__main__':
    app.run(debug=True)