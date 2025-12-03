from flask import Flask, render_template, jsonify, request, session
from sequenceMaster import SequenceMasterV2
from codeBreakerPatterns import CodeBreakerPatterns
from datetime import datetime, timedelta
import json
import os
import hashlib

app = Flask(__name__)
# Use environment variable in production, fallback to dev key for local development
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key-sequence-master')

# Load configuration
def load_config():
    config_path = os.path.join(os.path.dirname(__file__), 'config', 'game_config.json')
    with open(config_path, 'r') as f:
        return json.load(f)

CONFIG = load_config()
GAME_MODES = CONFIG['game_modes']
ACHIEVEMENTS = CONFIG['achievements']

# Leaderboard functions
def load_leaderboard():
    data_path = os.path.join(os.path.dirname(__file__), 'data', 'leaderboard.json')
    try:
        with open(data_path, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def save_leaderboard(leaderboard_data):
    data_path = os.path.join(os.path.dirname(__file__), 'data', 'leaderboard.json')
    with open(data_path, 'w') as f:
        json.dump(leaderboard_data, f, indent=4)

def update_leaderboard(name, score, mode):
    leaderboard = load_leaderboard()
    leaderboard.append({
        'name': name,
        'score': score,
        'mode': mode,
        'date': datetime.now().strftime('%Y-%m-%d %H:%M')
    })
    # Sort by score descending and keep top 50
    leaderboard.sort(key=lambda x: x['score'], reverse=True)
    leaderboard = leaderboard[:50]
    save_leaderboard(leaderboard)

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
    
    current_level = session.get('level', 1)
    
    # Check if this is a boss level (every 5 levels)
    is_boss = current_level % 5 == 0 and current_level > 0
    
    if is_boss:
        return jsonify({
            'is_boss': True,
            'level': current_level,
            'message': f'🔥 BOSS BATTLE - Level {current_level}! Complete 3 sequences in 30 seconds!'
        })
    
    # Code Breaker mode uses different patterns
    if mode == 'code_breaker':
        pattern_data = CodeBreakerPatterns.generate_pattern(current_level)
        
        session['last_sequence'] = pattern_data['sequence']
        session['correct_answer'] = pattern_data['answer']
        session['pattern_type'] = pattern_data['type']
        session['start_time'] = datetime.now().timestamp()
        
        return jsonify({
            'sequence': pattern_data['sequence'],
            'hint': pattern_data['hint'],
            'level': current_level,
            'score': session.get('score', 0),
            'timer': GAME_MODES[mode]['timer'],
            'mode': mode,
            'is_boss': False,
            'pattern_type': pattern_data['type']
        })
        
    game = SequenceMasterV2()
    if mode == 'daily':
        game.set_seed(get_daily_challenge())
    
    game.level = current_level
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
        'mode': mode,
        'is_boss': False
    })

@app.route('/api/boss/start', methods=['POST'])
def start_boss():
    """Generate 3 sequences for boss battle"""
    mode = session.get('game_mode', 'classic')
    current_level = session.get('level', 1)
    
    sequences = []
    for i in range(3):
        game = SequenceMasterV2()
        game.level = current_level
        game.score = session.get('score', 0)
        game.generate_sequence()
        
        sequences.append({
            'sequence': game.sequence,
            'hint': game.hint,
            'correct_answer': game.correct_answer
        })
    
    # Store boss data in session
    session['boss_sequences'] = sequences
    session['boss_current'] = 0
    session['boss_start_time'] = datetime.now().timestamp()
    
    return jsonify({
        'sequences': sequences,
        'total_time': 30,
        'level': current_level
    })

@app.route('/api/boss/answer', methods=['POST'])
def check_boss_answer():
    """Check answer for current boss sequence"""
    data = request.get_json()
    answer = data.get('answer')
    
    try:
        answer = int(answer)
    except ValueError:
        return jsonify({'error': 'Invalid answer format'}), 400
    
    boss_sequences = session.get('boss_sequences', [])
    boss_current = session.get('boss_current', 0)
    
    if boss_current >= len(boss_sequences):
        return jsonify({'error': 'No active boss sequence'}), 400
    
    correct_answer = boss_sequences[boss_current]['correct_answer']
    is_correct = answer == correct_answer
    
    if is_correct:
        session['boss_current'] = boss_current + 1
        
        # Check if boss is defeated
        if session['boss_current'] >= 3:
            # Boss defeated! Award bonus
            bonus_bytes = 100
            session['bytes'] = session.get('bytes', 0) + bonus_bytes
            session['score'] = session.get('score', 0) + 500
            session['level'] = session.get('level', 1) + 1
            
            # Clear boss data
            session.pop('boss_sequences', None)
            session.pop('boss_current', None)
            session.pop('boss_start_time', None)
            
            return jsonify({
                'correct': True,
                'boss_defeated': True,
                'bonus_bytes': bonus_bytes,
                'message': '🎉 BOSS DEFEATED! +500 points, +100 bytes!',
                'new_level': session['level']
            })
        else:
            return jsonify({
                'correct': True,
                'boss_defeated': False,
                'progress': f"{session['boss_current']}/3",
                'message': f'Correct! {3 - session["boss_current"]} more to go!'
            })
    else:
        # Boss battle failed
        session.pop('boss_sequences', None)
        session.pop('boss_current', None)
        session.pop('boss_start_time', None)
        
        return jsonify({
            'correct': False,
            'boss_defeated': False,
            'game_over': True,
            'correct_answer': correct_answer,
            'message': 'Boss Battle Failed! Game Over.'
        })

@app.route('/api/answer', methods=['POST'])
def check_answer():
    data = request.get_json()
    answer = data.get('answer')
    mode = session.get('game_mode', 'classic')
    
    if not answer:
        return jsonify({'error': 'No answer provided'}), 400
    
    # Get correct answer and pattern type
    correct_answer = session.get('correct_answer')
    pattern_type = session.get('pattern_type', 'numeric')
    
    if correct_answer is None:
        return jsonify({'error': 'No active challenge'}), 400
    
    # Handle different answer types based on pattern
    if pattern_type in ['color', 'keyboard']:
        # String comparison (case-insensitive)
        is_correct = str(answer).strip().lower() == str(correct_answer).strip().lower()
    else:
        # Numeric comparison
        try:
            answer = int(answer)
            is_correct = answer == correct_answer
        except ValueError:
            return jsonify({'error': 'Invalid answer format'}), 400
        
    # Calculate time taken
    start_time = session.get('start_time')
    time_taken = datetime.now().timestamp() - start_time if start_time else 999
    
    # Update user stats
    user_stats = session.get('user_stats', {})
    if is_correct:
        # Calculate score based on time and mode
        time_bonus = int(200 / (time_taken + 1)) if mode != 'zen' else 100
        score_gain = time_bonus * session.get('level', 1) * GAME_MODES[mode]['score_multiplier']
        
        new_score = session.get('score', 0) + score_gain
        new_level = session.get('level', 1) + 1
        
        session['score'] = new_score
        session['level'] = new_level
        
        # Award currency (Bytes)
        bytes_earned = 10  # 10 bytes per correct answer
        session['bytes'] = session.get('bytes', 0) + bytes_earned
        
        # Initialize power-ups if not exists
        if 'power_ups' not in session:
            session['power_ups'] = {'time_freeze': 0, 'debugger': 0, 'skip': 0}
        
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
            'new_achievements': new_achievements,
            'bytes': session['bytes'],
            'power_ups': session['power_ups']
        })
    else:
        user_stats['current_streak'] = 0
        session['user_stats'] = user_stats
        
        # Save score to leaderboard if it's significant (e.g., > 0)
        final_score = session.get("score", 0)
        if final_score > 0:
            # For now, we use a placeholder name or the one from session if we had it
            # In a real flow, we'd ask for name after game over. 
            # For this iteration, let's assume we might get a name in the request or default to 'Anonymous'
            # But the current UI flow asks for name at start or end. 
            # Let's add a separate endpoint to submit score or handle it here if name provided.
            pass 

        return jsonify({
            'message': f'Game Over! Final Score: {final_score}',
            'game_over': True,
            'correct_answer': correct_answer
        })

@app.route('/api/reset', methods=['POST'])
def reset_game():
    session['score'] = 0
    session['level'] = 1
    session.pop('last_sequence', None)
    session.pop('correct_answer', None)
    return jsonify({'status': 'success', 'message': 'Game reset'})

@app.route('/api/shop/purchase', methods=['POST'])
def purchase_power_up():
    data = request.get_json()
    power_up = data.get('power_up')
    
    # Power-up prices
    prices = {
        'time_freeze': 50,
        'debugger': 75,
        'skip': 100
    }
    
    if power_up not in prices:
        return jsonify({'error': 'Invalid power-up'}), 400
    
    price = prices[power_up]
    current_bytes = session.get('bytes', 0)
    
    if current_bytes < price:
        return jsonify({'error': 'Not enough bytes'}), 400
    
    # Deduct bytes and add power-up
    session['bytes'] = current_bytes - price
    if 'power_ups' not in session:
        session['power_ups'] = {'time_freeze': 0, 'debugger': 0, 'skip': 0}
    session['power_ups'][power_up] = session['power_ups'].get(power_up, 0) + 1
    
    return jsonify({
        'status': 'success',
        'bytes': session['bytes'],
        'power_ups': session['power_ups']
    })

@app.route('/api/shop/status', methods=['GET'])
def shop_status():
    if 'bytes' not in session:
        session['bytes'] = 0
    if 'power_ups' not in session:
        session['power_ups'] = {'time_freeze': 0, 'debugger': 0, 'skip': 0}
    
    return jsonify({
        'bytes': session['bytes'],
        'power_ups': session['power_ups']
    })

@app.route('/api/submit_score', methods=['POST'])
def submit_score():
    data = request.get_json()
    name = data.get('name', 'Anonymous')
    score = session.get('score', 0)
    mode = session.get('game_mode', 'classic')
    
    if score > 0:
        update_leaderboard(name, score, mode)
        
    return jsonify({'status': 'success'})

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
    return jsonify(load_leaderboard())

@app.route('/api/last_answer')
def get_last_answer():
    return jsonify({
        'last_answer': session.get('correct_answer')
    })

@app.route('/api/battle/start', methods=['POST'])
def start_battle():
    # Placeholder for Battle Mode
    # In a real implementation, this would match players or start a bot game
    return jsonify({
        'status': 'started',
        'opponent': 'SequenceBot 3000',
        'message': 'Battle started! Solve sequences faster than the bot!'
    })

if __name__ == '__main__':
    app.run(debug=True, port=5001)