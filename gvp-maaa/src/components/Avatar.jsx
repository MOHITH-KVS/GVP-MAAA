const getInitials = (name) => {
  if (!name) return "?";
  const parts = String(name).trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAvatarColor = (name) => {
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-green-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];

  const safeName = String(name || "?");
  let hash = 0;
  for (let i = 0; i < safeName.length; i++) {
    hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

const Avatar = ({ name, sizeClass = "w-12 h-12 text-lg", dotClass = "w-3 h-3" }) => {
  return (
    <div className="relative inline-block group cursor-pointer">
      <div
        className={`
          ${sizeClass} rounded-full flex items-center justify-center
          text-white font-semibold
          transition-all duration-300 ease-in-out
          transform
          group-hover:scale-110
          group-hover:shadow-xl
          ${getAvatarColor(name)}
        `}
      >
        {getInitials(name)}
      </div>

      <span
        className={`absolute bottom-0 right-0 ${dotClass} bg-green-500 border-2 border-white rounded-full`}
      ></span>
    </div>
  );
};

export default Avatar;
