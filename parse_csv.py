import csv
import json

devices = []
couples = []
pairs = []

with open('/Users/madhur/Downloads/2026 New Devices Serial Number - Sheet1.csv', 'r') as f:
    reader = csv.DictReader(f)
    print("Parsing CSV...")
