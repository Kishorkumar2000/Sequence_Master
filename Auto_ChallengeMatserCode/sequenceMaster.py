import random
import time
import hashlib
from datetime import datetime

class SequenceMasterV2:
    def __init__(self):
        self.score = 0
        self.level = 1
        self.sequence = []
        self.hint = ""
        self.correct_answer = None
        self.custom_seed = None
        self.pattern_history = []
        
    def set_seed(self, seed):
        """Set a custom seed for deterministic sequence generation"""
        self.custom_seed = seed
        
    def get_seed(self):
        """Get seed based on custom seed or current time"""
        if self.custom_seed is not None:
            return self.custom_seed
        return int(hashlib.sha256(str(datetime.now()).encode()).hexdigest(), 16) % 1000
        
    def generate_sequence(self):
        """Generate a cryptic sequence based on level and external factors"""
        self.sequence = []
        seed = self.get_seed()
        random.seed(seed + self.level)
        
        # Ensure we don't repeat recent patterns
        rule_set = random.randint(0, 7)  # Extended pattern types
        while rule_set in self.pattern_history[-3:]:  # Avoid last 3 patterns
            rule_set = random.randint(0, 7)
        self.pattern_history.append(rule_set)
        
        base = random.randint(1, 10)
        time_factor = datetime.now().second % 5
        
        if rule_set == 0:  # Twisted Arithmetic
            diff = (self.level % 3 + 1) * time_factor
            self.sequence = [base]
            for i in range(5):
                next_num = self.sequence[-1] + diff
                if i % 2 == 0:
                    next_num = next_num * (self.level % 2 + 1)
                self.sequence.append(next_num)
            self.hint = "The difference dances with time, and every other step doubles or stays."
                
        elif rule_set == 1:  # Mirrored Geometric
            ratio = (self.level % 4 + 1) if time_factor < 3 else 2
            self.sequence = [base]
            for i in range(5):
                next_num = self.sequence[-1] * ratio
                if str(next_num)[::-1].isdigit():
                    next_num = int(str(next_num)[::-1])
                self.sequence.append(next_num)
            self.hint = "Growth reflects itself, but only when it can see its own face."
                
        elif rule_set == 2:  # Wordplay Numbers
            num_words = ["zero", "one", "two", "three", "four", "five", "six"]
            start_idx = random.randint(0, 3)
            self.sequence = [start_idx]
            for i in range(5):
                word = num_words[self.sequence[-1]]
                next_num = (len(word) + self.level) % 7
                if time_factor > 2:
                    next_num = (next_num + self.sequence[-1]) % 7
                self.sequence.append(next_num)
            self.hint = "Numbers speak in letters, and their lengths lead the way."
                
        elif rule_set == 3:  # Fibonacci Twist
            self.sequence = [base]
            second = base + self.level
            self.sequence.append(second)
            for i in range(4):
                next_num = self.sequence[-1] + self.sequence[-2]
                if i % 2 == 0:
                    next_num = next_num % (50 * self.level)  # Keep numbers manageable
                self.sequence.append(next_num)
            self.hint = "Each step looks back twice, but sometimes needs to stay grounded."
            
        elif rule_set == 4:  # Prime Dance
            def next_prime(n):
                while True:
                    n += 1
                    if all(n % i != 0 for i in range(2, int(n ** 0.5) + 1)):
                        return n
                        
            self.sequence = [base]
            current = base
            for _ in range(5):
                if len(self.sequence) % 2 == 0:
                    current = next_prime(current)
                else:
                    current = current * 2 - 1
                self.sequence.append(current)
            self.hint = "Primes lead the dance, but take breaks to double back."
            
        elif rule_set == 5:  # Digital Root Pattern
            def digital_root(n):
                while n > 9:
                    n = sum(int(d) for d in str(n))
                return n
                
            self.sequence = [base]
            for i in range(5):
                next_num = self.sequence[-1] * (i + 2)
                next_num = digital_root(next_num) * self.level
                self.sequence.append(next_num)
            self.hint = "When numbers grow too large, they find their root and grow again."
            
        elif rule_set == 6:  # Binary Pattern
            self.sequence = [base]
            for i in range(5):
                binary = bin(self.sequence[-1])[2:]  # Convert to binary string
                rotated = binary[1:] + binary[0]  # Rotate binary digits
                next_num = int(rotated, 2) + self.level
                self.sequence.append(next_num)
            self.hint = "The binary dance: rotate and grow."
            
        else:  # Chaotic Blend with Level Complexity
            self.sequence = [base]
            for i in range(5):
                if i % 3 == 0:
                    next_num = self.sequence[-1] * (self.level % 3 + 1)
                elif i % 3 == 1:
                    next_num = self.sequence[-1] + time_factor
                else:
                    next_num = (self.sequence[-1] ** 2 % 100) + self.level
                self.sequence.append(next_num)
            self.hint = "Three rules wrestle: multiply, add time, then square and grow."
                
        self.correct_answer = self.sequence[-1]
        self.sequence[-1] = '?'
        
    def get_difficulty_rating(self):
        """Calculate the difficulty rating of the current sequence"""
        # Base difficulty on pattern type and level
        base_difficulty = self.level * 0.5
        pattern_difficulty = {
            0: 1,    # Twisted Arithmetic
            1: 1.2,  # Mirrored Geometric
            2: 1.5,  # Wordplay Numbers
            3: 1.8,  # Fibonacci Twist
            4: 2,    # Prime Dance
            5: 1.7,  # Digital Root
            6: 1.9,  # Binary Pattern
            7: 2.2   # Chaotic Blend
        }
        return base_difficulty * pattern_difficulty[self.pattern_history[-1]]
        
    def get_learning_tip(self):
        """Get a learning tip based on the current pattern"""
        tips = {
            0: "Look for arithmetic patterns that alternate between operations.",
            1: "Practice reading numbers backwards and identifying geometric growth.",
            2: "Strengthen the connection between numbers and their word representations.",
            3: "Study the Fibonacci sequence and its variations.",
            4: "Learn to recognize prime numbers and their patterns.",
            5: "Practice calculating digital roots of numbers.",
            6: "Convert numbers to binary and observe patterns.",
            7: "Break down complex patterns into simpler steps."
        }
        return tips[self.pattern_history[-1]]
        
    def get_pattern_name(self):
        """Get the name of the current pattern type"""
        names = {
            0: "Twisted Arithmetic",
            1: "Mirrored Geometric",
            2: "Wordplay Numbers",
            3: "Fibonacci Twist",
            4: "Prime Dance",
            5: "Digital Root",
            6: "Binary Pattern",
            7: "Chaotic Blend"
        }
        return names[self.pattern_history[-1]]
        
    def display_sequence(self):
        """Display sequence and hint"""
        print(f"\nLevel {self.level} - Score: {self.score}")
        print("Sequence:", " ".join(str(x) for x in self.sequence))
        print(f"Hint: {self.hint}")
        
    def play(self):
        """Main game loop with anti-automation"""
        print("Welcome to Sequence Master V2: The Cryptic Progression!")
        print("Solve the sequence using the hint. Time and level twist the rules.")
        print("Type 'quit' to end.\n")
        
        while True:
            self.generate_sequence()
            start_time = time.time()
            self.display_sequence()
            
            # Anti-automation: Randomize input prompt
            prompt = random.choice(["Enter the missing number: ", 
                                  "What completes it? ",
                                  "Solve the riddle: "])
            answer = input(prompt).strip()
            
            if answer.lower() == 'quit':
                print(f"\nGame Over! Final Score: {self.score}")
                break
                
            try:
                answer = int(answer)
                time_taken = time.time() - start_time
                
                # Score only if answered within 20s and correct
                if answer == self.correct_answer and time_taken < 20:
                    self.score += int(200 / (time_taken + 1)) * self.level
                    self.level += 1
                    print("Correct! Next challenge awaits...")
                else:
                    print(f"Wrong or too slow! Answer was {self.correct_answer}")
                    print(f"Final Score: {self.score}")
                    break
                    
            except ValueError:
                print("Numbers only, please!")
                
if __name__ == "__main__":
    game = SequenceMasterV2()
    game.play()