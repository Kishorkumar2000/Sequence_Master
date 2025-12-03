import unittest
import json
import os
import sys

# Add parent directory and app directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'Auto_ChallengeMatserCode'))

from Auto_ChallengeMatserCode.app import app, load_leaderboard, save_leaderboard
from Auto_ChallengeMatserCode.sequenceMaster import SequenceMasterV2

class TestSequenceMaster(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        
        # Backup leaderboard
        self.leaderboard_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'Auto_ChallengeMatserCode', 'data', 'leaderboard.json')
        if os.path.exists(self.leaderboard_path):
            with open(self.leaderboard_path, 'r') as f:
                self.leaderboard_backup = f.read()
        else:
            self.leaderboard_backup = "[]"
            
        # Reset leaderboard for tests
        save_leaderboard([])

    def tearDown(self):
        # Restore leaderboard
        with open(self.leaderboard_path, 'w') as f:
            f.write(self.leaderboard_backup)

    def test_config_loading(self):
        """Test that game config is loaded correctly"""
        game = SequenceMasterV2()
        self.assertIsNotNone(game.patterns_config)
        self.assertTrue(len(game.patterns_config) > 0)
        
    def test_leaderboard_persistence(self):
        """Test leaderboard save and load"""
        initial = load_leaderboard()
        self.assertEqual(len(initial), 0)
        
        # Set session score
        with self.app.session_transaction() as sess:
            sess['score'] = 100
            sess['game_mode'] = 'classic'
        
        # Submit a score
        response = self.app.post('/api/submit_score', 
                               json={'name': 'TestPlayer'})
        self.assertEqual(response.status_code, 200)
        
        # Check loaded
        updated = load_leaderboard()
        self.assertEqual(len(updated), 1)
        self.assertEqual(updated[0]['name'], 'TestPlayer')
        self.assertEqual(updated[0]['score'], 100)

    def test_game_flow(self):
        """Test starting a game and getting a challenge"""
        # Set mode
        self.app.post('/api/mode', json={'mode': 'classic'})
        
        # Get challenge
        response = self.app.get('/api/challenge')
        data = json.loads(response.data)
        
        self.assertIn('sequence', data)
        self.assertIn('hint', data)
        self.assertIn('level', data)
        
    def test_battle_endpoint(self):
        """Test battle mode endpoint"""
        response = self.app.post('/api/battle/start')
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'started')

if __name__ == '__main__':
    unittest.main()
