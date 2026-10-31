export function timeAgo(date) {
  if (!date) return "";
  const now = new Date();
  const past = new Date(date);
  const secondsAgo = Math.floor((now - past) / 1000);

  if (Number.isNaN(secondsAgo) || secondsAgo < 10) return "just now";
  if (secondsAgo < 60) return `${secondsAgo}s ago`;
  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return `${hoursAgo}h ago`;
  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo < 30) return `${daysAgo}d ago`;
  const monthsAgo = Math.floor(daysAgo / 30);
  if (monthsAgo < 12) return `${monthsAgo}mo ago`;
  const yearsAgo = Math.floor(monthsAgo / 12);
  return `${yearsAgo}y ago`;
}

let sharedAudioCtx = null;
function getSharedAudioContext() {
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        sharedAudioCtx = new AudioCtx();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
  } catch (e) {
    return null;
  }
}

// Gentle pleasant Web Audio chime for new incoming messages
export function playNotificationSound() {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (err) {
    console.debug("Audio notification suppressed:", err);
  }
}

// Formatted transcript download for chat messages
export function exportChatTranscript(roomId, messages = []) {
  if (!messages || messages.length === 0) {
    return false;
  }

  let transcript = `========================================================\n`;
  transcript += `           SYNAPSE CHAT TRANSCRIPT\n`;
  transcript += `Room: #${roomId}\n`;
  transcript += `Exported At: ${new Date().toLocaleString()}\n`;
  transcript += `Total Messages: ${messages.length}\n`;
  transcript += `========================================================\n\n`;

  messages.forEach((msg) => {
    const time = msg.timeStamp
      ? new Date(msg.timeStamp).toLocaleString()
      : "Unknown time";

    if (msg.messageType === "USER_JOINED") {
      transcript += `[${time}] >>> ${msg.sender} joined the room <<<\n\n`;
    } else if (msg.messageType === "USER_LEFT") {
      transcript += `[${time}] <<< ${msg.sender} left the room <<<\n\n`;
    } else if (msg.messageType === "FILE") {
      transcript += `[${time}] ${msg.sender}: [FILE: ${msg.fileName || "attachment"} (${msg.fileType || "unknown"})]\n\n`;
    } else {
      transcript += `[${time}] ${msg.sender}:\n${msg.content || ""}\n`;
    }
    transcript += `\n`;
  });

  const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `synapse-chat-${roomId}-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return true;
}
