import { useEffect, useState } from "react";
import { ShieldCheck, Edit2, Trash2 } from "lucide-react";

export default function AdminList() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  // Fetch admin users
  useEffect(() => {
    fetch("/api/users?role=admin")
      .then(res => res.json())
      .then(data => {
        setAdmins(data.users || []);
        setLoading(false);
      });
  }, []);

  // Delete admin handler
  const handleDelete = async (_id: string) => {
    if (!confirm("Are you sure you want to delete this admin?")) return;
    const res = await fetch(`/api/users?_id=${_id}`, { method: "DELETE" });
    if (res.ok) {
      setAdmins(admins.filter(a => a._id !== _id));
    }
  };

  // Start editing
  const startEdit = (admin: any) => {
    setEditId(admin._id);
    setEditName(admin.name || "");
    setEditEmail(admin.email || "");
  };

  // Save edit
  const handleUpdate = async () => {
    if (!editId) return;
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: editId, name: editName, email: editEmail }),
    });
    if (res.ok) {
      setAdmins(admins.map(a => (a._id === editId ? { ...a, name: editName, email: editEmail } : a)));
      setEditId(null);
    }
  };

  // Activate/Deactivate admin
  const handleStatus = async (_id: string, status: string) => {
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id, status }),
    });
    if (res.ok) {
      setAdmins(admins.map(a => (a._id === _id ? { ...a, status } : a)));
    }
  };

  // Filter admins by search
  const filteredAdmins = admins.filter(
    a =>
      a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div>Loading...</div>;

  return (
    <div className="bg-white rounded-xl p-8 max-w-4xl mx-auto mt-6 shadow">
      <h2 className="text-2xl font-bold mb-1">Admin List</h2>
      <p className="text-gray-500 mb-4">Manage existing admin accounts</p>
      <input
        className="w-full border rounded px-3 py-2 mb-6"
        placeholder="Search admins by name or email..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div className="space-y-4">
        {filteredAdmins.map(admin => (
          <div key={admin._id} className="flex items-center bg-gray-50 rounded-lg px-6 py-4 justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 rounded-full p-3">
                <ShieldCheck className="text-blue-400" />
              </div>
              <div>
                {editId === admin._id ? (
                  <div className="flex gap-2 items-center">
                    <input
                      className="border px-1 rounded"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Name"
                    />
                    <input
                      className="border px-1 rounded"
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      placeholder="Email"
                    />
                    <button className="text-green-600 underline" onClick={handleUpdate}>Save</button>
                    <button className="text-gray-600 underline" onClick={() => setEditId(null)}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <div className="font-semibold text-lg">{admin.name}</div>
                    <div className="text-gray-500 text-sm">{admin.email}</div>
                    <div className="flex gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${admin.status === "active" ? "bg-black text-white" : "bg-gray-200 text-gray-700"}`}>
                        {admin.status || "active"}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-200 text-gray-700">
                        {admin.role === "admin" && admin.type ? admin.type : "Manager"}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
                        {(admin.permissions?.length || 1) + " permissions"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-gray-500 text-xs mr-4">
                Last login: {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : "-"}
              </div>
              {admin.status === "active" ? (
                <button
                  className="bg-red-50 text-red-600 px-4 py-1 rounded border border-red-200 mr-2"
                  onClick={() => handleStatus(admin._id, "inactive")}
                >
                  Deactivate
                </button>
              ) : (
                <button
                  className="bg-green-50 text-green-600 px-4 py-1 rounded border border-green-200 mr-2"
                  onClick={() => handleStatus(admin._id, "active")}
                >
                  Activate
                </button>
              )}
              <button
                className="p-2 rounded hover:bg-gray-200"
                onClick={() => startEdit(admin)}
                title="Edit"
              >
                <Edit2 size={16} />
              </button>
              <button
                className="p-2 rounded hover:bg-gray-200"
                onClick={() => handleDelete(admin._id)}
                title="Delete"
              >
                <Trash2 size={16} className="text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
