/**
 * Generate deterministic color index from organization name hash
 */
export const getOrgColorIndex = (orgName: string): number => {
  const normalized = orgName.toLowerCase().trim()
  let hash = normalized.length
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i)
    hash = hash | 0
  }
  return Math.abs(hash)
}

export const ORG_AVATAR_COLORS = [
  "bg-blue-500 text-white",
  "bg-green-500 text-white",
  "bg-purple-500 text-white",
  "bg-pink-500 text-white",
  "bg-orange-500 text-white",
  "bg-teal-500 text-white",
  "bg-indigo-500 text-white",
  "bg-red-500 text-white",
  "bg-yellow-500 text-gray-900",
  "bg-cyan-500 text-white",
]
