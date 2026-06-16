import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Plus, X, Crown, Search, UserMinus, Link2 } from "lucide-react";
import Avatar from "../shared/Avatar";
import { useAuthStore } from "../../store/authStore";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { copyToClipboard } from "../../utils/helpers";

// ─── Create Group ──────────────────────────────────
export function CreateGroup() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [step, setStep]       = useState(1); // 1=select members, 2=group info
  const [search, setSearch]   = useState("");
  const [users, setUsers]     = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!search.trim()) { setUsers([]); return; }
    const t = setTimeout(async () => {
      const { data } = await api.get(`/search?q=${encodeURIComponent(search)}&types=users`);
      setUsers((data.results?.users || []).filter((u) => u._id !== user?._id));
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const toggle = (u) => {
    setSelected((s) => s.find((x) => x._id === u._id) ? s.filter((x) => x._id !== u._id) : [...s, u]);
  };

  const uploadAvatar = async (file) => {
    const fd = new FormData();
    fd.append("avatar", file);
    const { data } = await api.post("/groups/avatar", fd, { headers: { "Content-Type": "multipart/form-data" } });
    setAvatarUrl(data.url);
  };

  const createGroup = async () => {
    if (!groupName.trim()) { toast.error("Group name required"); return; }
    if (selected.length < 1) { toast.error("Add at least 1 member"); return; }
    setCreating(true);
    try {
      const { data } = await api.post("/groups", {
        name: groupName.trim(),
        description: groupDesc.trim(),
        memberIds: selected.map((u) => u._id),
        avatar: avatarUrl,
      });
      toast.success("Group created!");
      navigate(`/chat/${data.conversation._id}`, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create group");
    }
    setCreating(false);
  };

  return (
    <div className="app-shell">
      <header className="page-header">
        <button className="btn-icon" onClick={() => step === 1 ? navigate(-1) : setStep(1)}>
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold flex-1 ml-2" style={{ color: "var(--text-primary)" }}>
          {step === 1 ? "Add Members" : "New Group"}
        </h1>
        {step === 1 && selected.length > 0 && (
          <button
            className="flex items-center justify-center w-9 h-9 rounded-full"
            style={{ background: "var(--brand)" }}
            onClick={() => setStep(2)}
          >
            <span className="text-white text-lg">→</span>
          </button>
        )}
        {step === 2 && (
          <button
            className="text-sm font-semibold"
            style={{ color: "var(--brand)", background: "none", border: "none", cursor: "pointer" }}
            onClick={createGroup}
            disabled={creating}
          >
            {creating ? "Creating…" : "Create"}
          </button>
        )}
      </header>

      {step === 1 && (
        <div className="page-content-no-nav flex flex-col">
          {/* Selected chips */}
          {selected.length > 0 && (
            <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b" style={{ borderColor: "var(--border)" }}>
              {selected.map((u) => (
                <div key={u._id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
                  style={{ background: "var(--brand-light)" }}>
                  <span className="text-xs font-medium" style={{ color: "var(--brand)" }}>{u.firstName || u.username}</span>
                  <button onClick={() => toggle(u)}><X size={12} style={{ color: "var(--brand)" }} /></button>
                </div>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
              <Search size={16} style={{ color: "var(--text-muted)" }} />
              <input
                className="flex-1 bg-transparent outline-none text-sm"
                placeholder="Search people…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ color: "var(--text-primary)" }}
                autoFocus
              />
            </div>
          </div>

          {/* User list */}
          <div className="flex-1 overflow-y-auto">
            {users.map((u) => {
              const isSelected = !!selected.find((x) => x._id === u._id);
              return (
                <div key={u._id} className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  style={{ background: isSelected ? "var(--brand-light)" : "transparent" }}
                  onClick={() => toggle(u)}>
                  <Avatar src={u.avatar} name={u.firstName ? `${u.firstName} ${u.lastName}` : u.username} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{u.firstName} {u.lastName}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>@{u.username}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? "bg-brand" : ""}`}
                    style={{ borderColor: isSelected ? "var(--brand)" : "var(--border)" }}>
                    {isSelected && <span className="text-white text-xs">✓</span>}
                  </div>
                </div>
              );
            })}
            {search && users.length === 0 && (
              <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>No users found</p>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="page-content-no-nav flex flex-col px-6 pt-6 gap-6">
          {/* Group avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative cursor-pointer" onClick={() => fileRef.current?.click()}>
              {avatarUrl
                ? <img src={avatarUrl} className="w-24 h-24 rounded-full object-cover" alt="group" />
                : <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl"
                    style={{ background: "var(--brand-light)" }}>👥</div>
              }
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "var(--brand)", border: "2px solid var(--bg-primary)" }}>
                <Camera size={14} color="#fff" />
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
            </div>
          </div>

          {/* Name & Desc */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Group Name *</label>
              <input className="input-field" placeholder="e.g. Family, Work Team…" value={groupName} onChange={(e) => setGroupName(e.target.value)} maxLength={80} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Description</label>
              <textarea className="input-field" placeholder="What is this group about?" value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} rows={3} maxLength={200} style={{ resize: "none" }} />
            </div>
          </div>

          {/* Members preview */}
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Members ({selected.length + 1})</p>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "var(--brand-light)" }}>
                <span className="text-xs font-medium" style={{ color: "var(--brand)" }}>You <Crown size={10} className="inline" /></span>
              </div>
              {selected.map((u) => (
                <div key={u._id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "var(--bg-secondary)" }}>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{u.firstName || u.username}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Group Info / Settings ────────────────────────
export function GroupInfo({ groupId }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [group, setGroup] = useState(null);

  useEffect(() => {
    api.get(`/groups/${groupId}`).then(({ data }) => setGroup(data.group)).catch(() => navigate(-1));
  }, [groupId]);

  const isAdmin = group?.admins?.includes(user?._id);

  const generateInviteLink = async () => {
    const { data } = await api.post(`/groups/${groupId}/invite-link`);
    copyToClipboard(data.link);
    toast.success("Invite link copied!");
  };

  const removeMember = async (memberId) => {
    await api.delete(`/groups/${groupId}/members/${memberId}`);
    setGroup((g) => ({ ...g, members: g.members.filter((m) => m._id !== memberId) }));
    toast.success("Member removed");
  };

  if (!group) return <div className="flex-1 flex items-center justify-center"><p className="text-muted">Loading…</p></div>;

  return (
    <div className="app-shell">
      <header className="page-header">
        <button className="btn-icon" onClick={() => navigate(-1)}><ArrowLeft size={22} /></button>
        <h1 className="text-lg font-bold flex-1 ml-2" style={{ color: "var(--text-primary)" }}>Group Info</h1>
      </header>
      <div className="page-content-no-nav overflow-y-auto">
        <div className="flex flex-col items-center py-6 px-4">
          <Avatar src={group.avatar} name={group.name} size="2xl" />
          <h2 className="text-xl font-bold mt-3" style={{ color: "var(--text-primary)" }}>{group.name}</h2>
          <p className="text-sm mt-1 text-center" style={{ color: "var(--text-muted)", maxWidth: 280 }}>{group.description}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{group.members?.length} members</p>
        </div>

        {/* Invite link */}
        <div className="mx-4 mb-4">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "var(--bg-secondary)" }} onClick={generateInviteLink}>
            <Link2 size={18} style={{ color: "var(--brand)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--brand)" }}>Copy invite link</span>
          </button>
        </div>

        {/* Members */}
        <div className="mx-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Members</p>
          {isAdmin && (
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-2" style={{ background: "var(--bg-secondary)" }} onClick={() => navigate(`/group/${groupId}/add-members`)}>
              <Plus size={18} style={{ color: "var(--brand)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--brand)" }}>Add members</span>
            </button>
          )}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {group.members?.map((m, i) => {
              const isGroupAdmin = group.admins?.includes(m._id);
              return (
                <div key={m._id} className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < group.members.length - 1 ? "1px solid var(--border)" : "none", background: "var(--bg-primary)" }}>
                  <Avatar src={m.avatar} name={m.firstName ? `${m.firstName} ${m.lastName}` : m.username} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{m.firstName} {m.lastName}</p>
                      {isGroupAdmin && <Crown size={12} style={{ color: "var(--brand)" }} />}
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>@{m.username}</p>
                  </div>
                  {isAdmin && m._id !== user?._id && (
                    <button className="btn-icon" onClick={() => removeMember(m._id)}>
                      <UserMinus size={16} style={{ color: "var(--danger)" }} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Leave group */}
        <div className="mx-4 mt-4 mb-8">
          <button
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl"
            style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}
            onClick={async () => { await api.post(`/groups/${groupId}/leave`); navigate("/home"); toast.success("Left group"); }}
          >
            <X size={18} />
            <span className="text-sm font-semibold">Leave Group</span>
          </button>
        </div>
      </div>
    </div>
  );
}
