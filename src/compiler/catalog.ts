import { TableSchema } from './types';

export const DEFAULT_STUDENTS_SCHEMA: TableSchema = {
  name: 'students',
  columns: [
    { name: 'roll_no', type: 'INT', description: 'Student roll number (Unique Key)' },
    { name: 'name', type: 'STRING', description: 'Student full name' },
    { name: 'marks', type: 'INT', description: 'Marks obtained (out of 100)' },
    { name: 'grade', type: 'STRING', description: 'Letter grade (A, B, C, D, F)' },
    { name: 'city', type: 'STRING', description: 'Hometown / City' },
    { name: 'age', type: 'INT', description: 'Age in years' }
  ]
};

export const DEFAULT_STUDENTS_CSV = `roll_no,name,marks,grade,city,age
101,Aarav Sharma,92,A,Delhi,20
102,Priya Patel,78,B,Mumbai,21
103,Rohan Verma,85,A,Bangalore,20
104,Sneha Rao,45,D,Hyderabad,22
105,Vikram Singh,62,C,Jaipur,21
106,Ananya Iyer,95,A,Chennai,19
107,Karan Malhotra,38,F,Delhi,22
108,Divya Nair,88,A,Kochi,20
109,Rahul Gupta,71,B,Pune,21
110,Meera Joshi,81,A,Ahmedabad,20`;

export function parseCSVData(csv: string): { columns: string[]; rows: Record<string, any>[] } {
  const lines = csv.trim().split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return { columns: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim());
  const rows: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: Record<string, any> = {};
    headers.forEach((h, idx) => {
      const val = values[idx] ?? '';
      // attempt parse number
      if (!isNaN(Number(val)) && val !== '') {
        row[h] = Number(val);
      } else {
        row[h] = val;
      }
    });
    rows.push(row);
  }

  return { columns: headers, rows };
}
