import { useState } from 'react';
import { useApp } from '../../store/AppContext.jsx';

const blank = { name: '', regNo: '', class: 'BSE-4A' };

export default function StudentManager() {
  const { students, results, addStudent, updateStudent, deleteStudent, pushToast } = useApp();
  const [draft, setDraft] = useState(null); // null | {id?,name,regNo,class}

  function save() {
    if (!draft.name.trim() || !draft.regNo.trim()) { pushToast({ type: 'error', title: 'Name and Reg # required' }); return; }
    const dup = students.find((s) => s.regNo.trim().toLowerCase() === draft.regNo.trim().toLowerCase() && s.id !== draft.id);
    if (dup) { pushToast({ type: 'error', title: 'Duplicate Reg #', msg: `Already used by ${dup.name}.` }); return; }
    if (draft.id) { updateStudent(draft); pushToast({ type: 'success', title: 'Student updated' }); }
    else { addStudent(draft); pushToast({ type: 'success', title: 'Student added', msg: draft.name }); }
    setDraft(null);
  }

  return (
    <div className="tab-view">
      <div className="section-head spread">
        <div><h2>Students</h2><p>Class roster. New registration numbers are also auto-added when you grade a sheet.</p></div>
        <button className="btn btn--primary" onClick={() => setDraft({ ...blank })}>+ New student</button>
      </div>

      {draft && (
        <div className="card">
          <h3 className="card__title">{draft.id ? 'Edit student' : 'New student'}</h3>
          <div className="grid grid--3 mt-2">
            <div className="field"><label>Name</label><input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Full name" /></div>
            <div className="field"><label>Registration #</label><input className="input" value={draft.regNo} onChange={(e) => setDraft({ ...draft, regNo: e.target.value })} placeholder="2022-BSE-000" /></div>
            <div className="field"><label>Class</label><input className="input" value={draft.class} onChange={(e) => setDraft({ ...draft, class: e.target.value })} /></div>
          </div>
          <div className="row mt-2">
            <button className="btn btn--primary" onClick={save}>Save</button>
            <button className="btn btn--ghost" onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table--scroll">
          <table className="table">
            <thead><tr><th>Name</th><th>Reg No</th><th>Class</th><th>Graded</th><th></th></tr></thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td className="mono muted">{s.regNo}</td>
                  <td>{s.class || '—'}</td>
                  <td className="muted">{results.filter((r) => (r.regNo || '').toLowerCase() === (s.regNo || '').toLowerCase()).length}</td>
                  <td className="row" style={{ gap: 6 }}>
                    <button className="btn btn--sm" onClick={() => setDraft({ ...s })}>Edit</button>
                    <button className="btn btn--sm btn--danger" onClick={() => { deleteStudent(s.id); pushToast({ type: 'info', title: 'Student removed' }); }}>✕</button>
                  </td>
                </tr>
              ))}
              {!students.length && <tr><td colSpan="5" className="muted center">No students yet — add one or grade a sheet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
