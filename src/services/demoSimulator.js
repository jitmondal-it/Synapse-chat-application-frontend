/**
 * Synapse Live Demo Simulator
 * 
 * Provides simulated real-time team collaboration for portfolio demonstrations,
 * live interviews, and feature showcases. Simulates teammates typing, joining,
 * and sending natural collaborative messages with contextual replies.
 */

export const DEMO_PERSONAS = [
  {
    name: "Elena Rostova",
    role: "Lead Architect",
    avatarGradient: "from-purple-500 to-indigo-600",
  },
  {
    name: "Marcus Vance",
    role: "Frontend Engineer",
    avatarGradient: "from-cyan-500 to-blue-600",
  },
  {
    name: "Aria Chen",
    role: "Product & UX",
    avatarGradient: "from-emerald-500 to-teal-600",
  },
];

/**
 * Scripted natural conversation sequences tailored to current room
 */
export const getDemoScript = (roomId, currentUser = "You") => [
  {
    sender: "Elena Rostova",
    content: `Hey everyone! Just joined #${roomId}. Running initial diagnostics on our real-time WebSocket pipelines.`,
    typingDelay: 1500,
  },
  {
    sender: "Marcus Vance",
    content: `WebSocket latency is clocking in under 24ms ⚡. UI event loop and micro-animations feel ultra responsive!`,
    typingDelay: 1900,
  },
  {
    sender: "Aria Chen",
    content: `Loving the dark glassmorphic styling! The contrast and typing indicator look stunning. Great work @${currentUser} 👏`,
    typingDelay: 1700,
  },
  {
    sender: "Elena Rostova",
    content: `Pushed our payload compression optimizations. Encrypted packet transmission verified. Ready for the live demo review! 🚀`,
    typingDelay: 2100,
  },
  {
    sender: "Marcus Vance",
    content: `Check this out: searching messages, toggling sound chimes, and instant exports all sync in real time without page reload.`,
    typingDelay: 2000,
  },
  {
    sender: "Aria Chen",
    content: `Collaborating in #${roomId} is seamless. Let me know if you want me to test file uploads or concurrency scenarios!`,
    typingDelay: 1800,
  },
  {
    sender: "Elena Rostova",
    content: `All green across the board! Synapse is live, resilient, and ready for production showcase ✨`,
    typingDelay: 2200,
  },
];

/**
 * Generates an intelligent, natural reply to whatever message the user just typed
 */
export const generateContextualDemoReply = (userMessage = "", currentUser = "You", roomId = "room") => {
  const text = (userMessage || "").toLowerCase();

  if (text.includes("hi") || text.includes("hello") || text.includes("hey") || text.includes("sup")) {
    return {
      sender: "Marcus Vance",
      content: `Hey @${currentUser}! Great to have you collaborating with us in #${roomId}. The room is running live.`,
      typingDelay: 1400,
    };
  }

  if (
    text.includes("pr") ||
    text.includes("review") ||
    text.includes("code") ||
    text.includes("commit") ||
    text.includes("bug")
  ) {
    return {
      sender: "Elena Rostova",
      content: `Looking at your latest commit right now @${currentUser}! Code structure looks clean, modular, and performant. Approving PR now 👍`,
      typingDelay: 1800,
    };
  }

  if (
    text.includes("design") ||
    text.includes("ui") ||
    text.includes("ux") ||
    text.includes("theme") ||
    text.includes("color") ||
    text.includes("style")
  ) {
    return {
      sender: "Aria Chen",
      content: `The dark glassmorphism and cyan neon accents really stand out @${currentUser}. Terrific aesthetics and layout! ✨`,
      typingDelay: 1600,
    };
  }

  if (
    text.includes("performance") ||
    text.includes("speed") ||
    text.includes("fast") ||
    text.includes("latency") ||
    text.includes("fps")
  ) {
    return {
      sender: "Marcus Vance",
      content: `Sub-25ms round-trip latency verified across STOMP sockets. Zero dropped frames on message arrival! ⚡`,
      typingDelay: 1500,
    };
  }

  if (
    text.includes("thanks") ||
    text.includes("thank you") ||
    text.includes("great") ||
    text.includes("awesome") ||
    text.includes("cool") ||
    text.includes("nice")
  ) {
    return {
      sender: "Aria Chen",
      content: `Anytime @${currentUser}! Teamwork makes the dream work 🎉 Let's keep this momentum going!`,
      typingDelay: 1300,
    };
  }

  // Fallback realistic responses
  const fallbacks = [
    {
      sender: "Elena Rostova",
      content: `Solid point, @${currentUser}! Logging that note for our #${roomId} milestones.`,
    },
    {
      sender: "Marcus Vance",
      content: `Got it, @${currentUser}! Verified that in our current session state. Syncing smoothly.`,
    },
    {
      sender: "Aria Chen",
      content: `Noted @${currentUser}! Everything in this room is updating in real time.`,
    },
  ];

  return {
    ...fallbacks[Math.floor(Math.random() * fallbacks.length)],
    typingDelay: 1500,
  };
};
