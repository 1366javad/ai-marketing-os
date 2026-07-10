export const INITIAL_ASSISTANT_MESSAGES = [
  {
    id: "assistant-welcome",
    role: "assistant",
    content:
      "Hi! I'm your AI assistant. Ask me anything about content creation, writing tips, or how to use the studio.",
  },
];

export const createMessage = (role, content) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  role,
  content,
});

export const buildConversationHistory = (messages) =>
  messages.map((message) => `${message.role}: ${message.content}`).join("\n");

export const buildAssistantPrompt = (messages) =>
  `You are a helpful AI content assistant. You help users with writing, content creation, and using the AI Content Studio app. Keep responses concise and helpful.\n\nConversation:\n${buildConversationHistory(
    messages,
  )}\n\nassistant:`;
