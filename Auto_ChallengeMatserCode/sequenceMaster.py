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
        
    def generate_sequence(self):
        """Generate a cryptic sequence based on level and external factors"""
        self.sequence = []
        seed = int(hashlib.sha256(str(datetime.now()).encode()).hexdigest(), 16) % 1000
        random.seed(seed + self.level)
        base = random.randint(1, 10)
        rule_set = random.randint(0, 3)
        
        # Dynamic rule based on time and level
        time_factor = datetime.now().second % 5  # Changes every second
        
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
                    next_num = int(str(next_num)[::-1])  # Reverse digits
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
                
        else:  # Chaotic Blend
            self.sequence = [base]
            for i in range(5):
                if i % 3 == 0:
                    next_num = self.sequence[-1] * (self.level % 3 + 1)
                elif i % 3 == 1:
                    next_num = self.sequence[-1] + time_factor
                else:
                    next_num = self.sequence[-1] ** 2 % 100
                self.sequence.append(next_num)
            self.hint = "Three rules wrestle: multiply, add time, then square and trim."
                
        self.correct_answer = self.sequence[-1]
        self.sequence[-1] = '?'
        
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