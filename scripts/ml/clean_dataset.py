import json
import re

DATASET_PATH = "zet/dataset.json"

def clean_dataset():
    print(f"Loading {DATASET_PATH}...")
    with open(DATASET_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    cleaned_data = []
    
    # Regex to catch markers like [06.000,060,120.06] at the start of a block
    # We will use split to break the text apart.
    split_pattern = re.compile(r'(\[\d{2}\.\d{3},\d{3},\d{3}\.\d{2}\])')

    glue_count = 0
    
    for row in data:
        text = row.get("text", "")
        # If there are multiple markers, they are usually inside the text
        markers = split_pattern.findall(text)
        
        if len(markers) > 0 and split_pattern.search(text).start() > 0:
            # This means the text starts normally, but has markers deep inside.
            glue_count += 1
            
            parts = split_pattern.split(text)
            
            # parts will look like: 
            # [ "Initial text... ", "[06.090...]", " New text...", "[06.000...]", " More text... " ]
            
            # The first item is the original row before any split marks
            first_text = parts[0].strip()
            if first_text:
                new_row = row.copy()
                new_row['text'] = first_text
                cleaned_data.append(new_row)
            
            # Remaining parts are paired: (Marker, Text)
            for i in range(1, len(parts), 2):
                marker = parts[i]
                chunk_text = parts[i+1].strip() if i+1 < len(parts) else ""
                
                if chunk_text:
                    new_chunk = row.copy()
                    # Assign the new tag we found!
                    new_chunk['tag'] = marker
                    new_chunk['text'] = chunk_text
                    cleaned_data.append(new_chunk)
                    
        else:
            # Normal row
            cleaned_data.append(row)

    print(f"Found {glue_count} glued entries.")
    print(f"Original size: {len(data)}")
    print(f"New size: {len(cleaned_data)}")

    with open(DATASET_PATH, 'w', encoding='utf-8') as f:
        json.dump(cleaned_data, f, ensure_ascii=False, indent=2)
    print("Dataset cleaned and saved successfully.")

if __name__ == "__main__":
    clean_dataset()
