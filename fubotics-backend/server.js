// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Firebase Admin (Firestore) ---
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const messagesCollection = db.collection("messages");

// --- Gemini Setup ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-flash-latest",
});

// Helper: convert Firestore docs to plain objects
async function getAllMessages() {
  const snapshot = await messagesCollection
    .orderBy("createdAt", "asc")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// GET /api/messages – full history
app.get("/api/messages", async (req, res) => {
  try {
    const messages = await getAllMessages();
    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/message – user sends message, AI replies
app.post("/api/message", async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Text is required" });
  }

  try {
    // 1. Save user message
    await messagesCollection.add({
      role: "user",
      content: text,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Get full history (including this message)
    const history = await getAllMessages();

    // 3. Convert history to Gemini "contents" format
    const contents = history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // 4. Call Gemini
    const result = await model.generateContent({
      contents,
    });

    const aiReply = result.response.text() || "I couldn't generate a response.";

    // 5. Save AI message
    await messagesCollection.add({
      role: "assistant",
      content: aiReply,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 6. Return updated history
    const updatedMessages = await getAllMessages();
    res.json(updatedMessages);
  } catch (err) {
    console.error("Error handling message:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
