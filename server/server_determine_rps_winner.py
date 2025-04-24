def server_determine_rps_winner(p1, p2):
    if p1 == p2:
        return 0
    wins = {('rock','scissors'), ('scissors','paper'), ('paper','rock')}
    return 1 if (p1, p2) in wins else 2
