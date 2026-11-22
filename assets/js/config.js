/* Site settings — the only file you normally need to edit. */
window.SITE_CONFIG = Object.freeze({
  // Google Apps Script web-app URL (ends in /exec) that receives the Book a Demo form.
  // Leave empty until it is set up; the form will then ask people to email you instead.
  FORM_ENDPOINT: "https://script.google.com/macros/s/AKfycbxCZOMFDqlqrWAUwucdHQd7b81K4auVf0Jl96o7XVlXixPyPy6bvG4udQLQQA-dCHD1KA/exec",
  // Contact email shown when the form cannot be sent.
  CONTACT_EMAIL: "sara@saraautomates.com",
  // "Ask Sara Automates" chat. Leave both empty and the chat answers from the approved answers in chat.js.
  // CHAT_LOG_ENDPOINT: Apps Script web-app URL (ends in /exec) from chat-backend.gs — counts question topics in your Sheet.
  CHAT_LOG_ENDPOINT: "",
  // CHAT_ENDPOINT: the same /exec URL once the AI agent is switched on in chat-backend.gs.
  CHAT_ENDPOINT: ""
});
