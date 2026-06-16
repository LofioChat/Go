import React from "react";
import { getInitials, generateAvatarColor } from "../../utils/helpers";

const sizeMap = {
  xs:  "w-7 h-7 text-[10px]",
  sm:  "w-8 h-8 text-xs",
  md:  "w-10 h-10 text-sm",
  lg:  "w-12 h-12 text-base",
  xl:  "w-16 h-16 text-xl",
  "2xl": "w-20 h-20 text-2xl",
  "3xl": "w-24 h-24 text-3xl",
};

export default function Avatar({
  src,
  name = "",
  size = "md",
  showOnline = false,
  isOnline = false,
  className = "",
}) {
  const initials = getInitials(name);
  const bgColor  = generateAvatarColor(name);
  const sizeClass = sizeMap[size] || sizeMap.md;

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizeClass} rounded-full object-cover`}
          onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
        />
      ) : null}
      <div
        className={`avatar ${sizeClass} font-semibold`}
        style={{ backgroundColor: bgColor, display: src ? "none" : "flex" }}
      >
        {initials}
      </div>
      {showOnline && isOnline && (
        <span
          className="absolute bottom-0 right-0 block w-2.5 h-2.5 rounded-full border-2"
          style={{ background: "var(--online)", borderColor: "var(--bg-primary)" }}
        />
      )}
    </div>
  );
}
