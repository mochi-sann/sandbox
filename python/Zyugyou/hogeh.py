def get_min_max_avg_sum(list):
    return {
        "min": min(list),  "max": max(list), "avg":  sum(list)/len(list),  "sum": sum(list)}


print(get_min_max_avg_sum([1, 2, 3, 4, 5, 6]))
