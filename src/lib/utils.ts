export const getInitials = (name: string): string => {
  if (!name) return "";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + (words[1]?.[0] || "")).toUpperCase();
};

export const getProductColor = (name: string): string => {
  const colors = [
    "from-blue-500 to-indigo-600 text-white",
    "from-emerald-500 to-teal-600 text-white",
    "from-violet-500 to-purple-600 text-white",
    "from-pink-500 to-rose-600 text-white",
    "from-amber-500 to-orange-600 text-white",
    "from-cyan-500 to-blue-600 text-white",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export const hasImage = (imagePath: string | null | undefined): boolean => {
  if (!imagePath) return false;
  return !imagePath.includes("photo-1546069901-ba9599a7e63c");
};
