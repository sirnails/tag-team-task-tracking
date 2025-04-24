import time
import logging

# Refactored timer management into a class for better organization
class ServerTimerManager:
    @staticmethod
    def validate_timer_state(timer_state):
        total_time = timer_state.get('totalTime', 25 * 60)
        if not isinstance(total_time, (int, float)) or total_time <= 0:
            total_time = 25 * 60
            timer_state['totalTime'] = total_time
            
        return timer_state
        
    @staticmethod
    def update_running_timer(timer_state, current_time):
        end_time = timer_state.get('endTime')
        save_needed = False
        
        if end_time is None or not isinstance(end_time, (int, float)) or end_time <= 0:
            total_time = timer_state.get('totalTime', 25 * 60)
            if not isinstance(total_time, (int, float)) or total_time <= 0:
                total_time = 25 * 60
                timer_state['totalTime'] = total_time
                
            timer_state['endTime'] = current_time + total_time
            timer_state['elapsedTime'] = 0
            save_needed = True
            return timer_state, save_needed
            
        time_left = max(0, end_time - current_time)
        
        total_time = timer_state.get('totalTime', 25 * 60)
        if not isinstance(total_time, (int, float)) or total_time <= 0:
            total_time = 25 * 60
            timer_state['totalTime'] = total_time
            
        timer_state['elapsedTime'] = total_time - time_left
        
        if time_left <= 0:
            timer_state['isRunning'] = False
            timer_state['endTime'] = None
            timer_state['elapsedTime'] = 0
            save_needed = True
            
        return timer_state, save_needed
    
    @staticmethod
    def handle_timer_update(timer_state, new_state, room=None):
        save_needed = False
        
        if 'isRunning' in new_state:
            timer_state['isRunning'] = new_state['isRunning']
            
            if new_state['isRunning']:
                if 'totalTime' in new_state:
                    total_time = new_state['totalTime']
                    if not isinstance(total_time, (int, float)) or total_time <= 0:
                        total_time = 25 * 60
                    
                    timer_state['totalTime'] = total_time
                else:
                    timer_state['totalTime'] = 25 * 60
                    
                end_time = time.time() + timer_state['totalTime']
                timer_state['endTime'] = end_time
                timer_state['elapsedTime'] = 0
                
                if room:
                    logging.info(f"Timer started in room {room} - end time: {end_time}")
                save_needed = True
            else:
                timer_state['endTime'] = None
                timer_state['elapsedTime'] = 0
                
                if room:
                    logging.info(f"Timer stopped in room {room}")
                save_needed = True
        
        if 'endTime' in new_state:
            end_time = new_state['endTime']
            if isinstance(end_time, (int, float)) and end_time > 0:
                timer_state['endTime'] = end_time
                if room:
                    logging.info(f"End time set directly in room {room}: {end_time}")
                save_needed = True
            else:
                logging.warning(f"Ignoring invalid endTime: {end_time}")
            
        if 'elapsedTime' in new_state:
            elapsed_time = new_state['elapsedTime']
            if isinstance(elapsed_time, (int, float)) and elapsed_time >= 0:
                timer_state['elapsedTime'] = elapsed_time
                save_needed = True
        
        return timer_state, save_needed
