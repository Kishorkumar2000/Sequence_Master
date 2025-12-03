"""
Code Breaker Mode - Pattern Generator
Generates visual, keyboard, and debug patterns for variety
"""
import random

class CodeBreakerPatterns:
    
    @staticmethod
    def generate_color_pattern(level):
        """Generate a color sequence pattern"""
        colors = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange']
        
        if level <= 3:
            # Simple alternating
            pattern = [colors[0], colors[1]] * 2
            answer = colors[0]
            hint = "Colors alternate between two choices"
        else:
            # Repeating sequence
            seq_len = min(3, 2 + level // 5)
            pattern = random.sample(colors, seq_len) * 2
            answer = pattern[0]
            hint = f"The pattern repeats every {seq_len} colors"
        
        return {
            'type': 'color',
            'sequence': pattern,
            'answer': answer,
            'hint': hint
        }
    
    @staticmethod
    def generate_keyboard_pattern(level):
        """Generate a keyboard layout pattern"""
        # QWERTY rows
        rows = [
            ['Q', 'W', 'E', 'R', 'T', 'Y'],
            ['A', 'S', 'D', 'F', 'G', 'H'],
            ['Z', 'X', 'C', 'V', 'B', 'N']
        ]
        
        row = random.choice(rows)
        if level <= 3:
            # Simple sequential
            start = random.randint(0, len(row) - 4)
            pattern = row[start:start+3]
            answer = row[start+3]
            hint = "Follow the keyboard layout left to right"
        else:
            # Skip pattern
            skip = 2 if level > 5 else 1
            start = random.randint(0, len(row) - 4)
            pattern = [row[start + i*skip] for i in range(3) if start + i*skip < len(row)]
            answer = row[start + 3*skip] if start + 3*skip < len(row) else row[-1]
            hint = f"Keys skip by {skip} on the keyboard"
        
        return {
            'type': 'keyboard',
            'sequence': pattern,
            'answer': answer,
            'hint': hint
        }
    
    @staticmethod
    def generate_debug_pattern(level):
        """Generate a 'find the error' pattern"""
        # Create a correct sequence with one wrong element
        base = list(range(2, 12, 2))  # [2, 4, 6, 8, 10]
        
        # Insert an error
        error_pos = random.randint(1, len(base) - 2)
        base[error_pos] = base[error_pos] + random.choice([1, 3, -1])
        
        return {
            'type': 'debug',
            'sequence': base,
            'answer': error_pos,  # The INDEX of the wrong number
            'hint': f"One number doesn't fit the pattern. Which position (0-{len(base)-1})?"
        }
    
    @staticmethod
    def generate_pattern(level):
        """Generate a random Code Breaker pattern"""
        pattern_type = random.choice(['color', 'keyboard', 'debug'])
        
        if pattern_type == 'color':
            return CodeBreakerPatterns.generate_color_pattern(level)
        elif pattern_type == 'keyboard':
            return CodeBreakerPatterns.generate_keyboard_pattern(level)
        else:
            return CodeBreakerPatterns.generate_debug_pattern(level)
