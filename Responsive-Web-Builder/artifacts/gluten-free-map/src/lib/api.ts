export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
