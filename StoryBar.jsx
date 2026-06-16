import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import Avatar from "../shared/Avatar";
import api from "../../utils/api";

export default function StoryBar() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stories, setStories] = useState([]);

  useEffect(() => {
    api.get("/stories").then(({ data }) => setStories(data.stories || [])).catch(() => {});
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 py-3 overflow-x-auto hide-scrollbar border-b"
      style={{ borderColor: "var(--border)" }}
    >
      {/* My Story */}
      <div
        className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
        onClick={() => navigate("/story/create")}
      >
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center"
            style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
            <Avatar src={user?.avatar} name={user?.name || user?.username} size="lg" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "var(--brand)", border: "2px solid var(--bg-primary)" }}>
            <Plus size={12} color="#fff" />
          </div>
        </div>
        <span className="text-xs text-center" style={{ color: "var(--text-muted)", maxWidth: 60 }}>My Status</span>
      </div>

      {/* Others' stories */}
      {stories.map((story) => {
        const seen = story.viewers?.includes(user?._id);
        return (
          <div
            key={story._id}
            className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
            onClick={() => navigate(`/story/${story._id}`)}
          >
            <div className={seen ? "story-ring-seen" : "story-ring"}>
              <div className="p-0.5 rounded-full" style={{ background: "var(--bg-primary)" }}>
                <Avatar src={story.user?.avatar} name={story.user?.name || story.user?.username} size="md" />
              </div>
            </div>
            <span className="text-xs text-center truncate" style={{ color: "var(--text-muted)", maxWidth: 60 }}>
              {story.user?.firstName || story.user?.username}
            </span>
          </div>
        );
      })}
    </div>
  );
}
