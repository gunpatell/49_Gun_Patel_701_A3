import { useEffect, useState } from 'react';

const emptyStudent = { rollNo: '', name: '', email: '', course: '', semester: 1 };

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed.');
  return data;
}

export default function App() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyStudent);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadStudents() { setStudents(await request('/api/students')); }
  useEffect(() => { loadStudents().catch(error => setError(error.message)); }, []);
  function updateField(event) { setForm({ ...form, [event.target.name]: event.target.value }); }
  function edit(student) { setEditingId(student.id); setForm({ ...student }); setError(''); }
  function cancel() { setEditingId(null); setForm(emptyStudent); }
  async function submit(event) {
    event.preventDefault(); setMessage(''); setError('');
    try {
      const url = editingId ? `/api/students/${editingId}` : '/api/students';
      await request(url, { method: editingId ? 'PUT' : 'POST', body: JSON.stringify({ ...form, semester: Number(form.semester) }) });
      cancel(); setMessage(editingId ? 'Student updated.' : 'Student added.'); await loadStudents();
    } catch (requestError) { setError(requestError.message); }
  }
  async function remove(id) {
    if (!window.confirm('Delete this student?')) return;
    try { await request(`/api/students/${id}`, { method: 'DELETE' }); setMessage('Student deleted.'); await loadStudents(); }
    catch (requestError) { setError(requestError.message); }
  }

  return <main className="page">
    <nav><a href="#add">Add Student</a><a href="#students">Display Students</a></nav>
    <h1>Student CRUD</h1>
    {message && <p className="success">{message}</p>}{error && <p className="error">{error}</p>}
    <section className="form-box" id="add"><h2>{editingId ? 'Edit Student' : 'Add Student'}</h2>
      <form onSubmit={submit}>{['rollNo', 'name', 'email', 'course'].map(field => <input key={field} name={field} type={field === 'email' ? 'email' : 'text'} placeholder={field === 'rollNo' ? 'Roll number' : field[0].toUpperCase() + field.slice(1)} value={form[field]} onChange={updateField} required />)}
        <input name="semester" type="number" min="1" max="12" value={form.semester} onChange={updateField} required /><button type="submit">{editingId ? 'Save Changes' : 'Add Student'}</button>{editingId && <button type="button" onClick={cancel}>Cancel</button>}
      </form>
    </section>
    <section id="students"><h2>Students ({students.length})</h2><table><thead><tr><th>Roll No</th><th>Name</th><th>Email</th><th>Course</th><th>Semester</th><th>Actions</th></tr></thead><tbody>{students.map(student => <tr key={student.id}><td>{student.rollNo}</td><td>{student.name}</td><td>{student.email}</td><td>{student.course}</td><td>{student.semester}</td><td><button onClick={() => edit(student)}>Edit</button> <button onClick={() => remove(student.id)}>Delete</button></td></tr>)}</tbody></table></section>
  </main>;
}