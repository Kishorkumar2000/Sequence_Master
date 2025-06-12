from flask import Flask, render_template, jsonify, request, session
from sequenceMaster import SequenceMasterV2
from datetime import datetime, timedelta
import json
import os
import hashlib

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Game modes configuration
GAME_MODES = {
    'classic': {'timer': 20, 'score_multiplier': 1},
    'speed': {'timer': 10, 'score_multiplier': 2},
    'zen': {'timer': None, 'score_multiplier': 0.5},
    'daily': {'timer': 30, 'score_multiplier': 3}
}

# Achievement definitions
ACHIEVEMENTS = {
    'quick_thinker': {'name': 'Quick Thinker', 'description': 'Complete a level in under 5 seconds', 'icon': '⚡'},
    'perfectionist': {'name': 'Perfectionist', 'description': 'Get 5 correct answers in a row', 'icon': '🎯'},
    'zen_master': {'name': 'Zen Master', 'description': 'Score 1000 points in Zen mode', 'icon': '🧘'},
    'speed_demon': {'name': 'Speed Demon', 'description': 'Score 2000 points in Speed mode', 'icon': '🏃'},
    'daily_warrior': {'name': 'Daily Warrior', 'description': 'Complete 5 daily challenges', 'icon': '📅'},
    'pattern_master': {'name': 'Pattern Master', 'description': 'Solve a level 10 sequence', 'icon': '🧩'}
}

def get_daily_challenge():
    """Generate a consistent daily challenge based on the date"""
    today = datetime.now().strftime('%Y-%m-%d')
    seed = int(hashlib.sha256(today.encode()).hexdigest(), 16)
    # Use the seed to generate a specific sequence for the day
    return seed

def check_achievements(user_stats):
    """Check and award achievements based on user stats"""
    earned = []
    if user_stats.get('fastest_solve', 999) < 5:
        earned.append('quick_thinker')
    if user_stats.get('current_streak', 0) >= 5:
        earned.append('perfectionist')
    if user_stats.get('zen_high_score', 0) >= 1000:
        earned.append('zen_master')
    if user_stats.get('speed_high_score', 0) >= 2000:
        earned.append('speed_demon')
    if user_stats.get('daily_completed', 0) >= 5:
        earned.append('daily_warrior')
    if user_stats.get('highest_level', 0) >= 10:
        earned.append('pattern_master')
    return earned

@app.route('/')
def home():
    return render_template('game.html')

@app.route('/api/challenge')
def get_challenge():
    mode = session.get('game_mode', 'classic')
    if mode == 'daily' and session.get('daily_completed'):
        return jsonify({'error': 'Daily challenge already completed'}), 400
        
    game = SequenceMasterV2()
    if mode == 'daily':
        game.set_seed(get_daily_challenge())
    
    game.level = session.get('level', 1)
    game.score = session.get('score', 0)
    game.generate_sequence()
    
    session['last_sequence'] = game.sequence
    session['correct_answer'] = game.correct_answer
    session['start_time'] = datetime.now().timestamp()
    
    return jsonify({
        'sequence': game.sequence,
        'hint': game.hint,
        'level': game.level,
        'score': game.score,
        'timer': GAME_MODES[mode]['timer'],
        'mode': mode
    })

@app.route('/api/answer', methods=['POST'])
def check_answer():
    data = request.get_json()
    answer = data.get('answer')
    mode = session.get('game_mode', 'classic')
    
    if not answer:
        return jsonify({'error': 'No answer provided'}), 400
        
    try:
        answer = int(answer)
    except ValueError:
        return jsonify({'error': 'Invalid answer format'}), 400
        
    correct_answer = session.get('correct_answer')
    if correct_answer is None:
        return jsonify({'error': 'No active challenge'}), 400
        
    # Calculate time taken
    start_time = session.get('start_time')
    time_taken = datetime.now().timestamp() - start_time if start_time else 999
    
    # Update user stats
    user_stats = session.get('user_stats', {})
    if answer == correct_answer:
        # Calculate score based on time and mode
        time_bonus = int(200 / (time_taken + 1)) if mode != 'zen' else 100
        score_gain = time_bonus * session.get('level', 1) * GAME_MODES[mode]['score_multiplier']
        
        new_score = session.get('score', 0) + score_gain
        new_level = session.get('level', 1) + 1
        
        session['score'] = new_score
        session['level'] = new_level
        
        # Update stats
        user_stats['games_played'] = user_stats.get('games_played', 0) + 1
        user_stats['current_streak'] = user_stats.get('current_streak', 0) + 1
        user_stats['highest_level'] = max(user_stats.get('highest_level', 0), new_level)
        user_stats['fastest_solve'] = min(user_stats.get('fastest_solve', 999), time_taken)
        
        # Mode-specific stats
        mode_score_key = f'{mode}_high_score'
        user_stats[mode_score_key] = max(user_stats.get(mode_score_key, 0), new_score)
        
        if mode == 'daily':
            user_stats['daily_completed'] = user_stats.get('daily_completed', 0) + 1
            session['daily_completed'] = True
            
        # Check for new achievements
        new_achievements = check_achievements(user_stats)
        user_stats['achievements'] = list(set(user_stats.get('achievements', []) + new_achievements))
        
        session['user_stats'] = user_stats
        
        return jsonify({
            'message': f'Correct! Score: {new_score}',
            'game_over': False,
            'new_achievements': new_achievements
        })
    else:
        user_stats['current_streak'] = 0
        session['user_stats'] = user_stats
        return jsonify({
            'message': f'Game Over! Final Score: {session.get("score", 0)}',
            'game_over': True,
            'correct_answer': correct_answer
        })

@app.route('/api/stats')
def get_stats():
    return jsonify(session.get('user_stats', {}))

@app.route('/api/mode', methods=['POST'])
def set_mode():
    data = request.get_json()
    mode = data.get('mode')
    if mode not in GAME_MODES:
        return jsonify({'error': 'Invalid game mode'}), 400
        
    session['game_mode'] = mode
    session['score'] = 0
    session['level'] = 1
    
    return jsonify({'status': 'success'})

@app.route('/api/achievements')
def get_achievements():
    user_stats = session.get('user_stats', {})
    earned = user_stats.get('achievements', [])
    
    achievements = {
        id: {**data, 'earned': id in earned}
        for id, data in ACHIEVEMENTS.items()
    }
    
    return jsonify(achievements)

@app.route('/api/leaderboard')
def get_leaderboard():
    # In a real app, this would fetch from a database
    # For now, return dummy data
    return jsonify([
        {'name': 'Alice', 'score': 3200, 'mode': 'classic'},
        {'name': 'Bob', 'score': 2700, 'mode': 'speed'},
        {'name': 'Charlie', 'score': 2100, 'mode': 'zen'}
    ])

@app.route('/api/last_answer')
def get_last_answer():
    return jsonify({
        'last_answer': session.get('correct_answer')
    })

if __name__ == '__main__':
    app.run(debug=True, port=5001)