from collections import Counter

def print_summary(decisions):
    counts = Counter(d["action"] for d in decisions)
    print("\n=== Ringkasan Keputusan ===")
    for action, total in counts.items():
        print(f"{action}: {total}")