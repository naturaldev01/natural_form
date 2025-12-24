#!/usr/bin/env python3
"""
Parse CSV files and generate SQL INSERT statements for Supabase import.
Handles large base64-encoded image data in transformed_image_url column.
"""

import csv
import json
import os
from pathlib import Path

def parse_csv_file(filepath):
    """Parse a single CSV file and extract records."""
    records = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Extract only the fields we need
            record = {
                'id': row.get('id', '').strip(),
                'first_name': row.get('first_name', '').strip(),
                'last_name': row.get('last_name', '').strip(),
                'email': row.get('email', '').strip(),
                'phone': row.get('phone', '').strip(),
                'treatment_type': row.get('treatment_type', '').strip(),
                'original_image_url': row.get('original_image_url', '').strip(),
                'transformed_image_url': row.get('transformed_image_url', '').strip() if row.get('transformed_image_url') else None,
                'created_at': row.get('created_at', '').strip(),
            }
            
            # Only add if we have an id
            if record['id']:
                records.append(record)
    
    return records

def generate_sql_values(records):
    """Generate SQL INSERT statement for records."""
    if not records:
        return None
    
    values_list = []
    for r in records:
        # Escape single quotes in string values
        def escape(val):
            if val is None:
                return 'NULL'
            return "'" + str(val).replace("'", "''") + "'"
        
        # Handle transformed_image_url - it may be a huge base64 string or NULL
        transformed_url = r['transformed_image_url']
        if transformed_url and len(transformed_url) > 500:
            # If it's base64 data, set to NULL (we can't import huge base64)
            transformed_url_sql = 'NULL'
        elif transformed_url:
            transformed_url_sql = escape(transformed_url)
        else:
            transformed_url_sql = 'NULL'
        
        # Handle created_at
        created_at = r['created_at']
        if created_at:
            created_at_sql = escape(created_at)
        else:
            created_at_sql = 'NOW()'
        
        values = f"({escape(r['id'])}::uuid, {escape(r['first_name'])}, {escape(r['last_name'])}, {escape(r['email'])}, {escape(r['phone'])}, {escape(r['treatment_type'])}, {escape(r['original_image_url'])}, {transformed_url_sql}, {created_at_sql})"
        values_list.append(values)
    
    return values_list

def main():
    csv_dir = Path('/Users/oguzhan.sivri/Desktop/natural_form/csv_files')
    csv_files = list(csv_dir.glob('consultations_rows*.csv'))
    
    all_records = []
    
    for csv_file in csv_files:
        print(f"Parsing {csv_file.name}...")
        records = parse_csv_file(csv_file)
        print(f"  Found {len(records)} records")
        all_records.extend(records)
    
    print(f"\nTotal records: {len(all_records)}")
    
    # Remove duplicates by id
    seen_ids = set()
    unique_records = []
    for r in all_records:
        if r['id'] not in seen_ids:
            seen_ids.add(r['id'])
            unique_records.append(r)
    
    print(f"Unique records: {len(unique_records)}")
    
    # Generate SQL values
    values_list = generate_sql_values(unique_records)
    
    # Print sample
    if values_list:
        print("\n--- Sample record (first one) ---")
        print(values_list[0][:500] + "..." if len(values_list[0]) > 500 else values_list[0])
        
    # Save to JSON for easy use
    output = {
        'total_records': len(unique_records),
        'records': unique_records
    }
    
    with open('/Users/oguzhan.sivri/Desktop/natural_form/parsed_data.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"\nSaved parsed data to parsed_data.json")
    
    return unique_records

if __name__ == '__main__':
    records = main()

