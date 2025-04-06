import React, { useEffect, useState } from "react";
import axios from "axios";
import io from "socket.io-client";
import { Toaster, toast } from "react-hot-toast";

const socket = io("http://localhost:5000");

function App() {
  const [authForm, setAuthForm] = useState({ username: "", email: "", password: "" });
  const [form, setForm] = useState({ title: "", content: "" });
  const [notes, setNotes] = useState([]);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);

  const fetchNotes = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/notes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotes(res.data);
    } catch (err) {
      toast.error("Failed to fetch notes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;

    fetchNotes();

    const handleNoteUpdate = () => fetchNotes();
    socket.on("noteUpdate", handleNoteUpdate);

    return () => socket.off("noteUpdate", handleNoteUpdate);
  }, [token]);

  const signup = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/auth/register", authForm);
      toast.success("Signup successful!");
      setAuthForm({ username: "", email: "", password: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Signup failed.");
    }
  };

  const login = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", authForm);
      const { token } = res.data;
      localStorage.setItem("token", token);
      setToken(token);
      toast.success("Login successful!");
      setAuthForm({ username: "", email: "", password: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        const res = await axios.put(`http://localhost:5000/api/notes/${editId}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Note updated!");
        setNotes((prev) =>
          prev.map((note) => (note._id === editId ? res.data : note))
        );
      } else {
        const res = await axios.post("http://localhost:5000/api/notes", form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Note added!");
        setNotes((prev) => [res.data, ...prev]);
      }
      socket.emit("noteEvent", {});
      setForm({ title: "", content: "" });
      setEditId(null);
    } catch (error) {
      toast.error("Something went wrong.");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    toast("Logged out!");
  };

  const handleEdit = (note) => {
    setEditId(note._id);
    setForm({ title: note.title, content: note.content });
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/notes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotes((prev) => prev.filter((note) => note._id !== id));
      socket.emit("noteEvent", {});
      toast.success("Note deleted.");
    } catch (err) {
      toast.error("Delete failed.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <Toaster position="top-center" />

      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-10">📝 Real-time Notes App</h1>

        {!token ? (
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <form onSubmit={signup} className="bg-white p-6 rounded-xl shadow space-y-4">
              <h2 className="text-2xl font-semibold">Sign Up</h2>
              <input
                type="text"
                placeholder="Username"
                className="w-full p-2 border rounded"
                value={authForm.username}
                onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full p-2 border rounded"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full p-2 border rounded"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                required
              />
              <button
                type="submit"
                className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
              >
                Signup
              </button>
            </form>

            <form onSubmit={login} className="bg-white p-6 rounded-xl shadow space-y-4">
              <h2 className="text-2xl font-semibold">Login</h2>
              <input
                type="email"
                placeholder="Email"
                className="w-full p-2 border rounded"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full p-2 border rounded"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                required
              />
              <button
                type="submit"
                className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
              >
                Login
              </button>
            </form>
          </div>
        ) : (
          <>
            <form
              onSubmit={handleSubmit}
              className="bg-white p-6 rounded-xl shadow mb-8 max-w-3xl mx-auto"
            >
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Note title"
                  className="w-full p-3 border rounded"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
                <textarea
                  placeholder="Write your note..."
                  className="w-full p-3 border rounded"
                  rows={4}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  required
                ></textarea>
                <button
                  type="submit"
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                >
                  {editId ? "✏️ Update Note" : "➕ Add Note"}
                </button>
              </div>
            </form>

            <div className="flex justify-between items-center max-w-6xl mx-auto mb-4">
              <h2 className="text-2xl font-semibold">Your Notes</h2>
              <button
                onClick={logout}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>

            {loading ? (
              <p className="text-center">Loading notes...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {notes.map((note) => (
                  <div key={note._id} className="bg-white p-5 rounded-xl shadow relative">
                    <h3 className="text-lg font-bold">{note.title}</h3>
                    <p className="mt-2 text-sm text-gray-700">{note.content}</p>
                    <p className="text-xs text-gray-400 mt-3">
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        onClick={() => handleEdit(note)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(note._id)}
                        className="text-red-500 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
