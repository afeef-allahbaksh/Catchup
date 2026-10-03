import { chatHandler } from "../server/chatHandler.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  return chatHandler(req, res);
}
