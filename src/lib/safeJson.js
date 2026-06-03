export async function safeJson(res) {
  const text = await res.text();
  if (!text || !text.trim()) return {};
  if (text.trim().startsWith('<')) throw new Error('backend_offline');
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error('Invalid JSON response from server');
  }
}
