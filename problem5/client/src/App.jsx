import { useEffect, useState } from 'react';

const emptyForm = { date: '', reason: '', grant: 'no' };
const savedToken = localStorage.getItem('employeeToken');

async function request(url, options = {}) {
  const token = localStorage.getItem('employeeToken');
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Something went wrong.');
  return data;
}

function Login({ onLogin }) {
  const [form, setForm] = useState({ email: '2023040259@vnsgu.ac.in' });
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setError('');
    try { const data = await request('/api/auth/login', { method: 'POST', body: JSON.stringify(form) }); onLogin(data); }
    catch (err) { setError(err.message); }
  };
  return <main className="login-shell"><section className="login-panel"><div className="brand-mark">EH</div><p className="eyebrow">Employee login</p><h1>Welcome back.</h1><p className="muted">Enter your employee email to continue.</p><form onSubmit={submit} className="stack-form"><label>Email<input type="email" value={form.email} onChange={e => setForm({ email: e.target.value })} required /></label>{error && <p className="error">{error}</p>}<button className="primary-button">Sign in <span>→</span></button></form></section><aside className="login-art" /></main>;
}

function App() {
  const [token, setToken] = useState(savedToken);
  const [employee, setEmployee] = useState(null);
  const [page, setPage] = useState('profile');
  const [leaves, setLeaves] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { if (token) Promise.all([request('/api/employees/me'), request('/api/leaves')]).then(([profile, applications]) => { setEmployee(profile); setLeaves(applications); }).catch(() => logout()); }, [token]);
  const logout = () => { localStorage.removeItem('employeeToken'); setToken(null); setEmployee(null); };
  if (!token) return <Login onLogin={({ token: nextToken, employee: nextEmployee }) => { localStorage.setItem('employeeToken', nextToken); setToken(nextToken); setEmployee(nextEmployee); }} />;
  const submitLeave = async (event) => { event.preventDefault(); setError(''); setMessage(''); try { const leave = await request('/api/leaves', { method: 'POST', body: JSON.stringify(form) }); setLeaves([leave, ...leaves]); setForm(emptyForm); setMessage('Leave application added.'); } catch (err) { setError(err.message); } };
  return <div className="app-shell"><header className="topbar"><div className="topbar-inner"><div className="wordmark"><span>EH</span> Employee Hub</div><div className="user-menu"><div className="avatar">{employee?.name?.split(' ').map(part => part[0]).join('')}</div><div><strong>{employee?.name}</strong><small>{employee?.designation}</small></div><button className="logout-button" onClick={logout}>Log out</button></div></div></header><div className="layout"><aside className="sidebar"><p className="eyebrow">Home</p><button className={page === 'profile' ? 'nav-item active' : 'nav-item'} onClick={() => setPage('profile')}>Profile</button><button className={page === 'leave' ? 'nav-item active' : 'nav-item'} onClick={() => setPage('leave')}>Leave applications</button><div className="sidebar-footer">Employee ID: {employee?.empid}</div></aside><main className="content">{page === 'profile' ? <Profile employee={employee} /> : <LeavePage leaves={leaves} form={form} setForm={setForm} submitLeave={submitLeave} message={message} error={error} />}</main></div></div>;
}

function Profile({ employee }) { return <><div className="page-heading"><div><p className="eyebrow">Page 1 / Profile</p><h1>Employee profile</h1><p className="muted">Employee details from the administration system.</p></div></div><section className="profile-hero"><div className="large-avatar">{employee?.name?.split(' ').map(part => part[0]).join('')}</div><div><h2>{employee?.name}</h2><p>{employee?.designation} · {employee?.department}</p></div><span className="pill">Active employee</span></section><section className="detail-grid"><Detail label="Employee ID" value={employee?.empid} /><Detail label="Email address" value={employee?.email} /><Detail label="Department" value={employee?.department} /><Detail label="Designation" value={employee?.designation} /><Detail label="Basic salary" value={`₹${employee?.basicSalary?.toLocaleString()}`} /><Detail label="HRA" value={`₹${employee?.hra?.toLocaleString()}`} /><Detail label="DA" value={`₹${employee?.da?.toLocaleString()}`} /><Detail label="Gross salary" value={`₹${employee?.grossSalary?.toLocaleString()}`} /><Detail label="Joined on" value={new Date(employee?.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} /></section></>; }
function Detail({ label, value }) { return <div className="detail"><span>{label}</span><strong>{value}</strong></div>; }
function LeavePage({ leaves, form, setForm, submitLeave, message, error }) { return <><div className="page-heading"><div><p className="eyebrow">Page 2 / Time away</p><h1>Leave applications</h1><p className="muted">Submit a request and keep track of your applications.</p></div></div><div className="leave-grid"><section className="form-card"><div className="section-title"><span className="number">01</span><div><h2>New application</h2><p>Tell us when and why you need time away.</p></div></div><form onSubmit={submitLeave} className="stack-form"><label>Date<input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></label><label>Reason<textarea rows="4" placeholder="Add a short reason" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} required /></label><fieldset><legend>Can this request be granted?</legend><label className="radio-label"><input type="radio" name="grant" value="yes" checked={form.grant === 'yes'} onChange={e => setForm({ ...form, grant: e.target.value })} /> Yes</label><label className="radio-label"><input type="radio" name="grant" value="no" checked={form.grant === 'no'} onChange={e => setForm({ ...form, grant: e.target.value })} /> No</label></fieldset>{error && <p className="error">{error}</p>}{message && <p className="success">{message}</p>}<button className="primary-button">Add application <span>→</span></button></form></section><section className="list-card"><div className="section-title"><span className="number">02</span><div><h2>Application list</h2><p>{leaves.length} {leaves.length === 1 ? 'application' : 'applications'} submitted</p></div></div>{leaves.length ? <div className="application-list">{leaves.map(leave => <article className="application" key={leave._id}><div className="date-block"><strong>{new Date(leave.date).getDate()}</strong><span>{new Date(leave.date).toLocaleDateString(undefined, { month: 'short' })}</span></div><div><strong>{leave.reason}</strong><p>Requested on {new Date(leave.createdAt).toLocaleDateString()}</p></div><span className={leave.grant === 'yes' ? 'grant yes' : 'grant no'}>{leave.grant === 'yes' ? 'Granted' : 'Not granted'}</span></article>)}</div> : <div className="empty-state">No applications yet.<br /><span>Your submitted requests will appear here.</span></div>}</section></div></>; }

export default App;
