import BASE_URL from "../screens/config";

const sendToServer = async (level, args) => {
  try {
    const message = args
      .map(a => (typeof a === "object" ? JSON.stringify(a) : a))
      .join(" ");

    await fetch(`${BASE_URL}/api/frontend-log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "app",
        message: `[${level}] ${message}`,
      }),
    });
  } catch (e) {
    // ignore
  }
};

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = (...args) => {
  sendToServer("LOG", args);
  originalLog(...args);
};

console.warn = (...args) => {
  sendToServer("WARN", args);
  originalWarn(...args);
};

console.error = (...args) => {
  sendToServer("ERROR", args);
  originalError(...args);
};