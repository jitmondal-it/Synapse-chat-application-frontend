import React, { useEffect, useRef, useState, useMemo } from "react";
import useChatContext from "../context/ChatContext";
import { useNavigate } from "react-router";
import SockJS from "sockjs-client";
import { Stomp } from "@stomp/stompjs";
import toast from "react-hot-toast";
import { baseURL } from "../config/AxiosHelper";
import {
  getMessagess,
  clearChat,
  uploadFile,
  deleteRoom,
  getRoomMembers,
  leaveRoomApi,
} from "../services/RoomService";
import { timeAgo, playNotificationSound } from "../config/helper";
import {
  Paperclip,
  Send,
  LogOut,
  MessagesSquare,
  Trash2,
  Smile,
  MoreVertical,
  Copy,
  Check,
  Users,
  Search,
  X,
  Crown,
  FileText,
  Download,
  CheckCheck,
  Sparkles,
  Maximize2,
  AlertTriangle,
  Radio,
  Zap,
  FastForward,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import FloatingSidebar from "./FloatingSidebar";
import EmojiPicker from "emoji-picker-react";
import {
  DEMO_PERSONAS,
  getDemoScript,
  generateContextualDemoReply,
} from "../services/demoSimulator";

// Deterministic vibrant avatar gradient generator
const getAvatarGradient = (name = "") => {
  const gradients = [
    "from-cyan-500 to-blue-600",
    "from-indigo-500 to-purple-600",
    "from-violet-500 to-fuchsia-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-sky-400 to-indigo-500",
    "from-teal-400 to-cyan-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

const ChatPage = () => {
  const {
    roomId,
    currentUser,
    connected,
    roomMembers,
    roomCreator,
    setConnected,
    setRoomId,
    setCurrentUser,
    setRoomMembers,
    setRoomCreator,
  } = useChatContext();

  const navigate = useNavigate();

  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const chatBoxRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const actionMenuRef = useRef(null);

  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const [input, setInput] = useState("");
  const [stompClient, setStompClient] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Settings state (Sound & Auto-scroll)
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("synapse_sound") !== "false";
  });
  const [autoScroll, setAutoScroll] = useState(true);

  // Live Demo Simulator State
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [demoPaused, setDemoPaused] = useState(false);
  const [demoIndex, setDemoIndex] = useState(0);

  const demoTimerRef = useRef(null);
  const demoTypingTimerRef = useRef(null);
  const isDemoActiveRef = useRef(false);
  const demoPausedRef = useRef(false);
  const demoIndexRef = useRef(0);

  useEffect(() => {
    isDemoActiveRef.current = isDemoActive;
  }, [isDemoActive]);

  useEffect(() => {
    demoPausedRef.current = demoPaused;
  }, [demoPaused]);

  useEffect(() => {
    demoIndexRef.current = demoIndex;
  }, [demoIndex]);

  const demoScript = useMemo(
    () => getDemoScript(roomId, currentUser),
    [roomId, currentUser]
  );
  const nextPersonaName =
    demoScript[demoIndex % demoScript.length]?.sender || "Teammate";


  useEffect(() => {
    localStorage.setItem("synapse_sound", String(soundEnabled));
  }, [soundEnabled]);

  // Modals state
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    actionType: null, // "CLEAR" | "DELETE"
  });

  const [previewImage, setPreviewImage] = useState(null);

  // =========================================================
  // REDIRECT IF NOT CONNECTED
  // =========================================================
  useEffect(() => {
    if (!connected) {
      navigate("/");
    }
  }, [connected, roomId, currentUser, navigate]);

  // =========================================================
  // LOAD OLD MESSAGES
  // =========================================================
  useEffect(() => {
    async function loadMessages() {
      try {
        const fetchedMessages = await getMessagess(roomId);
        setMessages(fetchedMessages || []);
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    }

    if (connected && roomId) {
      loadMessages();
    }
  }, [connected, roomId]);

  // =========================================================
  // LOAD ROOM MEMBERS INITIALLY ON JOIN
  // =========================================================
  useEffect(() => {
    async function loadInitialMembers() {
      if (connected && roomId) {
        try {
          const data = await getRoomMembers(roomId);
          const membersList = Array.isArray(data.members) ? [...data.members] : [];
          if (currentUser && !membersList.includes(currentUser)) {
            membersList.push(currentUser);
          }
          setRoomMembers(membersList);
          if (data.createdBy) {
            setRoomCreator(data.createdBy);
          }
        } catch (error) {
          console.error("Error loading initial members:", error);
          if (currentUser) {
            setRoomMembers((prev) => (prev.length > 0 ? prev : [currentUser]));
          }
        }
      }
    }

    loadInitialMembers();
  }, [connected, roomId, currentUser, setRoomMembers, setRoomCreator]);

  // =========================================================
  // CLEANUP ON BROWSER / TAB CLOSE
  // =========================================================
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (roomId && currentUser) {
        const url = `${baseURL}/api/v1/rooms/${encodeURIComponent(roomId)}/leave?username=${encodeURIComponent(currentUser)}`;
        if (navigator.sendBeacon) {
          navigator.sendBeacon(url);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [roomId, currentUser]);

  // =========================================================
  // AUTO SCROLL
  // =========================================================
  useEffect(() => {
    if (!autoScroll || !chatBoxRef.current) return;

    chatBoxRef.current.scrollTo({
      top: chatBoxRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, typingUser, autoScroll]);

  // =========================================================
  // CLICK OUTSIDE HANDLERS (EMOJI & ACTION MENU)
  // =========================================================
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(event.target)
      ) {
        setShowActionMenu(false);
      }

    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // =========================================================
  // WEBSOCKET CONNECTION
  // =========================================================
  useEffect(() => {
    if (!connected) {
      return;
    }

    const sock = new SockJS(`${baseURL}/chat`);
    const client = Stomp.over(sock);

    // Disable verbose stomp logging in console for cleaner experience
    client.debug = () => {};

    let messageSubscription = null;
    let typingSubscription = null;

    client.connect({}, () => {
      setStompClient(client);

      messageSubscription = client.subscribe(
        `/topic/room/${roomId}`,
        (message) => {
          const newMessage = JSON.parse(message.body);

          // Ignore legacy reaction messages if received
          if (newMessage.messageType === "REACTION") {
            return;
          }

          // Handle real-time membership changes
          if (newMessage.messageType === "USER_JOINED") {
            setRoomMembers((prev) => {
              if (prev.includes(newMessage.sender)) return prev;
              return [...prev, newMessage.sender];
            });
          } else if (newMessage.messageType === "USER_LEFT") {
            setRoomMembers((prev) =>
              prev.filter((member) => member !== newMessage.sender)
            );
          }

          // Play chime sound if enabled and message is from another person
          if (
            soundEnabled &&
            newMessage.sender !== currentUser &&
            newMessage.messageType !== "USER_JOINED" &&
            newMessage.messageType !== "USER_LEFT"
          ) {
            playNotificationSound();
          }

          setMessages((prev) => [...prev, newMessage]);
        }
      );

      // Announce user joined to all active room members
      client.send(
        `/app/sendMessage/${roomId}`,
        {},
        JSON.stringify({
          sender: currentUser,
          content: `${currentUser} joined the room`,
          roomId: roomId,
          messageType: "USER_JOINED",
          timeStamp: new Date().toISOString(),
        })
      );

      typingSubscription = client.subscribe(
        `/topic/typing/${roomId}`,
        (message) => {
          const event = JSON.parse(message.body);

          if (event.typing && event.sender !== currentUser) {
            setTypingUser(event.sender);
          } else {
            setTypingUser("");
          }
        }
      );
    });

    return () => {
      if (messageSubscription) {
        messageSubscription.unsubscribe();
      }
      if (typingSubscription) {
        typingSubscription.unsubscribe();
      }
      if (client.connected) {
        client.disconnect();
      }
      setStompClient(null);
      setTypingUser("");
    };
  }, [roomId, connected, currentUser]);

  // =========================================================
  // TYPING STATUS
  // =========================================================
  const sendTypingStatus = (isTyping) => {
    if (!stompClient || !connected || !stompClient.connected) {
      return;
    }

    stompClient.send(
      `/app/typing/${roomId}`,
      {},
      JSON.stringify({
        sender: currentUser,
        typing: isTyping,
      })
    );
  };

  const handleTyping = (value) => {
    setInput(value);

    if (!value.trim()) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current) {
        sendTypingStatus(false);
        isTypingRef.current = false;
      }
      return;
    }

    if (!isTypingRef.current) {
      sendTypingStatus(true);
      isTypingRef.current = true;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false);
      isTypingRef.current = false;
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // =========================================================
  // DEMO SIMULATOR CONTROLS
  // =========================================================
  const scheduleNextDemo = (delay = 4500) => {
    if (demoTimerRef.current) {
      clearTimeout(demoTimerRef.current);
    }
    demoTimerRef.current = setTimeout(() => {
      if (isDemoActiveRef.current && !demoPausedRef.current) {
        triggerDemoMessage();
      }
    }, delay);
  };

  const triggerDemoMessage = (overrideItem = null) => {
    const script = getDemoScript(roomId, currentUser);
    const item = overrideItem || script[demoIndexRef.current % script.length];

    setTypingUser(item.sender);

    if (demoTypingTimerRef.current) {
      clearTimeout(demoTypingTimerRef.current);
    }

    demoTypingTimerRef.current = setTimeout(() => {
      setTypingUser((curr) => (curr === item.sender ? "" : curr));

      const newMsg = {
        id: `demo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        sender: item.sender,
        content: item.content,
        roomId: roomId,
        messageType: "CHAT",
        timeStamp: new Date().toISOString(),
        isDemo: true,
      };

      setMessages((prev) => [...prev, newMsg]);

      if (soundEnabled) {
        playNotificationSound();
      }

      if (!overrideItem) {
        setDemoIndex((prev) => prev + 1);
      }

      if (isDemoActiveRef.current && !demoPausedRef.current) {
        scheduleNextDemo(Math.floor(Math.random() * 2000) + 4000);
      }
    }, item.typingDelay || 1700);
  };

  const toggleDemoMode = () => {
    if (isDemoActive) {
      setIsDemoActive(false);
      setDemoPaused(false);
      if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
      if (demoTypingTimerRef.current) clearTimeout(demoTypingTimerRef.current);
      setTypingUser((curr) => {
        const personaNames = DEMO_PERSONAS.map((p) => p.name);
        return personaNames.includes(curr) ? "" : curr;
      });
      toast("Demo Simulator stopped", { icon: "⏹️" });
    } else {
      setIsDemoActive(true);
      setDemoPaused(false);

      setRoomMembers((prev) => {
        const personaNames = DEMO_PERSONAS.map((p) => p.name);
        const combined = [...prev];
        personaNames.forEach((name) => {
          if (!combined.includes(name)) combined.push(name);
        });
        return combined;
      });

      toast.success(
        "⚡ Live Demo Simulator active! Teammates will now chat in real time.",
        { duration: 4000 }
      );

      if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
      demoTimerRef.current = setTimeout(() => {
        triggerDemoMessage();
      }, 1200);
    }
  };

  const togglePauseDemo = () => {
    if (demoPaused) {
      setDemoPaused(false);
      toast.success("Demo resumed ▶");
      scheduleNextDemo(1500);
    } else {
      setDemoPaused(true);
      if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
      if (demoTypingTimerRef.current) clearTimeout(demoTypingTimerRef.current);
      setTypingUser("");
      toast("Demo paused ⏸");
    }
  };

  const clearDemoMessages = () => {
    setMessages((prev) => prev.filter((m) => !m.isDemo));
    toast.success("Demo messages cleared");
  };



  useEffect(() => {
    return () => {
      if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
      if (demoTypingTimerRef.current) clearTimeout(demoTypingTimerRef.current);
    };
  }, []);

  // =========================================================
  // SEND MESSAGE
  // =========================================================
  const sendMessage = async () => {
    if (input.trim()) {
      const userText = input.trim();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current) {
        sendTypingStatus(false);
        isTypingRef.current = false;
      }

      const message = {
        sender: currentUser,
        content: userText,
        roomId: roomId,
      };

      if (stompClient && stompClient.connected) {
        stompClient.send(
          `/app/sendMessage/${roomId}`,
          {},
          JSON.stringify(message)
        );
      } else {
        setMessages((prev) => [
          ...prev,
          {
            ...message,
            id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            timeStamp: new Date().toISOString(),
            messageType: "CHAT",
          },
        ]);
      }

      setInput("");
      setShowEmojiPicker(false);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);

      // Trigger contextual reply from simulated teammates if Demo Mode is active
      if (isDemoActiveRef.current) {
        if (demoTimerRef.current) {
          clearTimeout(demoTimerRef.current);
        }
        const reply = generateContextualDemoReply(
          userText,
          currentUser,
          roomId
        );
        setTimeout(() => {
          if (isDemoActiveRef.current) {
            triggerDemoMessage(reply);
          }
        }, 900);
      }
    }
  };

  // =========================================================
  // LOGOUT / LEAVE ROOM
  // =========================================================
  const handleLogout = async () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (stompClient && stompClient.connected) {
      if (isTypingRef.current) {
        sendTypingStatus(false);
        isTypingRef.current = false;
      }

      // Broadcast leave notification to room members
      try {
        stompClient.send(
          `/app/sendMessage/${roomId}`,
          {},
          JSON.stringify({
            sender: currentUser,
            content: `${currentUser} left the room`,
            roomId: roomId,
            messageType: "USER_LEFT",
            timeStamp: new Date().toISOString(),
          })
        );
      } catch (e) {
        console.warn("Could not send leave notification:", e);
      }

      stompClient.disconnect();
    }

    // Inform backend to remove user from room's members list
    try {
      await leaveRoomApi(roomId, currentUser);
    } catch (err) {
      console.warn("Backend leaveRoomApi error:", err);
    }

    setRoomMembers((prev) => prev.filter((m) => m !== currentUser));
    setConnected(false);
    setRoomId("");
    setCurrentUser("");
    navigate("/");
  };

  // =========================================================
  // CLEAR CHAT
  // =========================================================
  const executeClearChat = async () => {
    try {
      await clearChat(roomId);
      setMessages([]);
      toast.success("All messages cleared");
    } catch (error) {
      console.error("Error clearing chat:", error);
      toast.error("Failed to clear chat");
    } finally {
      setConfirmDialog({ isOpen: false, title: "", message: "", actionType: null });
    }
  };

  // =========================================================
  // DELETE ROOM
  // =========================================================
  const executeDeleteRoom = async () => {
    try {
      await deleteRoom(roomId);
      setMessages([]);
      setRoomId("");
      toast.success("Room deleted successfully");
      navigate("/");
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error("Failed to delete room");
    } finally {
      setConfirmDialog({ isOpen: false, title: "", message: "", actionType: null });
    }
  };

  // =========================================================
  // FILE UPLOAD
  // =========================================================
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const toastId = toast.loading("Uploading file...");

    try {
      const result = await uploadFile(roomId, file);

      const message = {
        sender: currentUser,
        content: "",
        roomId: roomId,
        messageType: "FILE",
        fileId: result.fileId,
        fileName: result.fileName,
        fileType: result.fileType,
      };

      if (stompClient && connected) {
        stompClient.send(
          `/app/sendMessage/${roomId}`,
          {},
          JSON.stringify(message)
        );
      }

      toast.success("File shared successfully", { id: toastId });
    } catch (error) {
      console.error("File upload failed:", error);
      toast.error("Failed to upload file", { id: toastId });
    }

    event.target.value = "";
  };

  // =========================================================
  // COPY ROOM ID
  // =========================================================
  const copyRoomIdToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopiedRoomId(true);
      toast.success("Room ID copied to clipboard!");
      setTimeout(() => setCopiedRoomId(false), 2000);
    } catch (err) {
      console.error("Copy failed", err);
      toast.error("Failed to copy Room ID");
    }
  };

  // =========================================================
  // LOAD ROOM MEMBERS
  // =========================================================
  const fetchMembers = async () => {
    setLoadingMembers(true);
    setShowMembersModal(true);
    try {
      const data = await getRoomMembers(roomId);
      if (data.members) setRoomMembers(data.members);
      if (data.createdBy) setRoomCreator(data.createdBy);
    } catch (err) {
      console.error("Failed to load room members:", err);
      toast.error("Could not fetch members");
    } finally {
      setLoadingMembers(false);
    }
  };

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(
      (m) =>
        m.content?.toLowerCase().includes(q) ||
        m.sender?.toLowerCase().includes(q) ||
        m.fileName?.toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[#070b14] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background ambient lighting effects */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-32 left-1/2 h-[450px] w-[650px] -translate-x-1/2 rounded-full bg-gradient-to-b from-cyan-500/10 via-blue-600/10 to-transparent blur-3xl" />
        <div className="absolute bottom-10 left-10 h-72 w-72 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute right-10 top-1/3 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
        <div
          className="absolute inset-0 bg-[url('/chat-doodles.png')] bg-[length:380px_380px] bg-repeat opacity-[0.035]"
          aria-hidden="true"
        />
      </div>

      {/* Floating desktop sidebar */}
      <div className="hidden sm:block">
        <FloatingSidebar
          messages={messages}
          onTriggerSearch={() => {
            setShowSearch(true);
            setTimeout(() => {
              const searchInput = document.querySelector('input[placeholder*="Search"]');
              searchInput?.focus();
            }, 50);
          }}
          onInsertInput={(text) => {
            setInput((prev) => (prev ? `${prev} ${text}` : text));
            setTimeout(() => {
              inputRef.current?.focus();
            }, 0);
          }}
          onLeaveRoom={handleLogout}
          onClearChat={() => {
            setConfirmDialog({
              isOpen: true,
              title: "Clear Chat History?",
              message:
                "This will permanently remove all messages in this room for everyone. This action cannot be undone.",
              actionType: "CLEAR",
            });
          }}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          autoScroll={autoScroll}
          setAutoScroll={setAutoScroll}
          isDemoActive={isDemoActive}
          onToggleDemo={toggleDemoMode}
        />
      </div>

      {/* =====================================================
          MODERN GLASS NAVBAR
      ====================================================== */}
      <header className="relative z-30 flex w-full flex-shrink-0 items-center justify-center px-3 pt-3 sm:px-6 sm:pt-4">
        <div className="flex w-full max-w-5xl items-center justify-between gap-2 rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.36)] backdrop-blur-2xl transition-all duration-300 sm:px-5 sm:py-3">
          {/* LEFT: Room branding & Room ID Badge */}
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
            <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 text-white shadow-[0_0_20px_rgba(34,211,238,0.35)] transition-transform hover:scale-105 sm:h-10 sm:w-10">
              <MessagesSquare size={19} strokeWidth={2.3} />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-500" />
              </span>
            </div>

            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase">
                  SYNAPSE
                </span>
                <span className="hidden h-1 w-1 rounded-full bg-slate-600 sm:inline-block" />
                <span className="hidden items-center gap-1 text-[10px] font-medium text-emerald-400 sm:inline-flex">
                  <Radio size={10} className="animate-pulse" /> Live
                </span>
              </div>

              {/* Interactive Copy Room ID Chip */}
              <button
                type="button"
                onClick={copyRoomIdToClipboard}
                title="Click to copy Room ID"
                className="group -ml-1 flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-left transition-all hover:bg-white/5 active:scale-95"
              >
                <span className="truncate text-sm font-semibold tracking-wide text-white transition-colors group-hover:text-cyan-300 sm:text-base sm:font-bold">
                  #{roomId}
                </span>
                {copiedRoomId ? (
                  <Check size={13} className="text-emerald-400" />
                ) : (
                  <Copy
                    size={13}
                    className="text-slate-400 transition-colors group-hover:text-cyan-300"
                  />
                )}
              </button>
            </div>
          </div>

          {/* CENTER: Inline Search Toggle */}
          <div className="hidden md:flex flex-1 items-center justify-center px-4">
            {showSearch ? (
              <div className="relative flex w-full max-w-xs items-center animate-in fade-in zoom-in-95 duration-150">
                <Search
                  size={15}
                  className="absolute left-3 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in conversation..."
                  autoFocus
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-1.5 pl-8 pr-8 text-xs text-white placeholder-slate-400 outline-none ring-1 ring-cyan-500/30 focus:ring-cyan-400/60"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setShowSearch(false);
                  }}
                  className="absolute right-2.5 text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowSearch(true)}
                className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-1.5 text-xs text-slate-400 transition-all hover:border-white/15 hover:bg-white/[0.06] hover:text-slate-200"
              >
                <Search size={14} />
                <span>Search messages</span>
                <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-400">
                  Ctrl+F
                </kbd>
              </button>
            )}
          </div>

          {/* RIGHT: User Profile & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Mobile search toggle */}
            <button
              type="button"
              onClick={() => setShowSearch((prev) => !prev)}
              aria-label="Toggle search"
              className={`flex h-8 w-8 items-center justify-center rounded-xl md:hidden transition-colors ${
                showSearch
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-slate-300 hover:bg-white/10"
              }`}
            >
              <Search size={16} />
            </button>

            {/* Room Members Button */}
            <button
              type="button"
              onClick={fetchMembers}
              title="View room members"
              className="flex h-8 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 text-xs font-medium text-slate-200 transition-all hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300 active:scale-95 sm:h-9 sm:px-3"
            >
              <Users size={15} />
              <span className="hidden sm:inline">Members</span>
            </button>

            {/* Live Demo Simulator Toggle Button */}
            <button
              type="button"
              onClick={toggleDemoMode}
              title={
                isDemoActive
                  ? "Demo Simulator Active — click to pause or stop"
                  : "Start Live Demo Simulator (Auto-simulate teammates for presentations)"
              }
              className={`flex h-8 sm:h-9 items-center gap-1.5 rounded-xl px-2.5 sm:px-3 text-xs font-semibold transition-all active:scale-95 ${
                isDemoActive
                  ? "border border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                  : "border border-violet-500/30 bg-violet-500/10 text-violet-300 hover:border-violet-500/50 hover:bg-violet-500/20 hover:text-white"
              }`}
            >
              <Zap
                size={14}
                className={
                  isDemoActive
                    ? "text-amber-400 animate-bounce"
                    : "text-violet-400"
                }
              />
              <span className="hidden sm:inline">
                {isDemoActive ? "Demo Active" : "Demo Mode"}
              </span>
              {isDemoActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>

            {/* Current user badge (Desktop) */}
            <div className="hidden lg:flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-1 pl-1.5 pr-3">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${getAvatarGradient(
                  currentUser
                )} text-xs font-bold text-white shadow-sm`}
              >
                {currentUser?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="max-w-[80px] truncate text-xs font-semibold text-slate-200">
                  {currentUser}
                </span>
                <span className="text-[9px] font-medium text-cyan-400/90 leading-none">
                  You
                </span>
              </div>
            </div>

            {/* Desktop Quick Actions */}
            <div className="hidden sm:flex items-center gap-1 border-l border-white/10 pl-2">
              <button
                type="button"
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    title: "Clear Chat History?",
                    message:
                      "This will permanently remove all messages in this room for everyone. This action cannot be undone.",
                    actionType: "CLEAR",
                  })
                }
                title="Clear all messages"
                className="group relative flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-orange-500/10 hover:text-orange-400 active:scale-95"
              >
                <Trash2 size={16} />
              </button>

              <button
                type="button"
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    title: "Delete Room?",
                    message: `Are you sure you want to permanently delete room #${roomId}? All chat history and files will be removed.`,
                    actionType: "DELETE",
                  })
                }
                title="Delete room"
                className="group relative flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-rose-500/10 hover:text-rose-400 active:scale-95"
              >
                <AlertTriangle size={16} />
              </button>

              <button
                type="button"
                onClick={handleLogout}
                title="Leave room"
                className="flex h-8 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 text-xs font-medium text-slate-300 transition-all hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300 active:scale-95"
              >
                <LogOut size={14} />
                <span>Leave</span>
              </button>
            </div>

            {/* Mobile 3-dot Action Menu */}
            <div className="relative sm:hidden" ref={actionMenuRef}>
              <button
                type="button"
                onClick={() => setShowActionMenu((prev) => !prev)}
                aria-label="Open menu"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-300 transition-all hover:bg-white/10 active:scale-95"
              >
                <MoreVertical size={16} />
              </button>

              {showActionMenu && (
                <div className="absolute right-0 top-10 z-50 w-48 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-white/10 mb-1">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">
                      Signed in as
                    </p>
                    <p className="truncate text-xs font-bold text-white">
                      {currentUser}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowActionMenu(false);
                      fetchMembers();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10"
                  >
                    <Users size={15} className="text-cyan-400" />
                    <span>Room Members</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowActionMenu(false);
                      toggleDemoMode();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/10"
                  >
                    <Zap size={15} />
                    <span>{isDemoActive ? "Stop Demo Mode" : "Start Demo Mode"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowActionMenu(false);
                      setConfirmDialog({
                        isOpen: true,
                        title: "Clear Chat?",
                        message: "Are you sure you want to clear all messages?",
                        actionType: "CLEAR",
                      });
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-orange-300 transition-colors hover:bg-orange-500/10"
                  >
                    <Trash2 size={15} />
                    <span>Clear chat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowActionMenu(false);
                      setConfirmDialog({
                        isOpen: true,
                        title: "Delete Room?",
                        message: "Are you sure you want to permanently delete this room?",
                        actionType: "DELETE",
                      });
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/10"
                  >
                    <AlertTriangle size={15} />
                    <span>Delete room</span>
                  </button>

                  <div className="my-1 border-t border-white/10" />

                  <button
                    type="button"
                    onClick={() => {
                      setShowActionMenu(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10"
                  >
                    <LogOut size={15} />
                    <span>Leave room</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile search bar dropdown */}
        {showSearch && (
          <div className="w-full max-w-5xl mt-2 px-1 md:hidden animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="relative flex items-center">
              <Search
                size={15}
                className="absolute left-3 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                autoFocus
                className="w-full rounded-xl border border-white/10 bg-slate-900/90 py-2 pl-9 pr-8 text-xs text-white placeholder-slate-400 outline-none backdrop-blur-xl ring-1 ring-cyan-500/30"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setShowSearch(false);
                }}
                className="absolute right-3 text-slate-400 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* =====================================================
          CHAT MESSAGE STREAM
      ====================================================== */}
      <main
        ref={chatBoxRef}
        className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden px-3 pt-8 pb-28 sm:px-6 sm:pt-10 sm:pb-32 sm:pr-20 lg:pr-24 scroll-smooth"
      >
        <div className="mx-auto flex w-full max-w-4xl flex-col">
          {/* Floating Demo Simulator Control Strip */}
          {isDemoActive && (
            <div className="mx-auto mb-3 flex w-full max-w-xl items-center justify-between gap-2 rounded-2xl border border-amber-500/30 bg-slate-900/95 px-3 py-2 shadow-[0_8px_30px_rgba(245,158,11,0.2)] backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                  <Zap size={14} className="animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">Live Demo Simulator</span>
                    <span
                      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                        demoPaused
                          ? "bg-slate-700 text-slate-300"
                          : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {demoPaused ? "Paused" : "Simulating"}
                    </span>
                  </div>
                  <p className="truncate text-[10px] text-slate-400">
                    Next: <strong className="text-cyan-300">{nextPersonaName}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Trigger Next Msg */}
                <button
                  type="button"
                  onClick={() => triggerDemoMessage()}
                  title="Trigger next message immediately"
                  className="flex items-center gap-1 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 active:scale-95 transition-all"
                >
                  <FastForward size={13} />
                  <span className="hidden sm:inline">Next Msg</span>
                </button>

                {/* Pause / Resume */}
                <button
                  type="button"
                  onClick={togglePauseDemo}
                  title={demoPaused ? "Resume simulation" : "Pause simulation"}
                  className="flex h-7 w-7 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 active:scale-95 transition-all"
                >
                  {demoPaused ? (
                    <Play size={13} className="text-emerald-400" />
                  ) : (
                    <Pause size={13} />
                  )}
                </button>

                {/* Clear Demo Messages */}
                <button
                  type="button"
                  onClick={clearDemoMessages}
                  title="Clear demo messages"
                  className="flex h-7 w-7 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-orange-400 hover:bg-orange-500/10 active:scale-95 transition-all"
                >
                  <RotateCcw size={13} />
                </button>

                {/* Stop Simulation */}
                <button
                  type="button"
                  onClick={toggleDemoMode}
                  title="Stop simulation"
                  className="flex h-7 w-7 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 active:scale-95 transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
          {/* EMPTY STATE */}
          {filteredMessages.length === 0 && (
            <div className="my-auto flex flex-col items-center justify-center py-16 text-center">
              <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.25)] backdrop-blur-xl">
                <Sparkles size={30} className="animate-pulse" />
              </div>

              <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                {searchQuery ? "No matching messages" : `Welcome to #${roomId}`}
              </h2>

              <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-400 sm:text-sm">
                {searchQuery
                  ? `No messages matched "${searchQuery}". Clear search to view conversation.`
                  : "This encrypted conversation has started. Be the first to share an idea, image, or greeting!"}
              </p>

              {!searchQuery && (
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {["👋 Hello everyone!", "🚀 Ready to collaborate", "⚡ Synapse connected"].map(
                    (starter, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setInput(starter);
                          inputRef.current?.focus();
                        }}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs text-slate-300 transition-all hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-200 active:scale-95"
                      >
                        {starter}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* MESSAGE LIST */}
          <div className="flex flex-col gap-3.5">
            {filteredMessages.map((message, index) => {
              // System announcement: User Joined
              if (message.messageType === "USER_JOINED") {
                return (
                  <div
                    key={`sys-join-${index}`}
                    className="flex w-full justify-center my-1.5 animate-in fade-in duration-200"
                  >
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 shadow-sm backdrop-blur-md">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>
                        <strong className="font-semibold text-emerald-200">
                          {message.sender}
                        </strong>{" "}
                        joined the room
                      </span>
                    </span>
                  </div>
                );
              }

              // System announcement: User Left
              if (message.messageType === "USER_LEFT") {
                return (
                  <div
                    key={`sys-leave-${index}`}
                    className="flex w-full justify-center my-1.5 animate-in fade-in duration-200"
                  >
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-300 shadow-sm backdrop-blur-md">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      <span>
                        <strong className="font-semibold text-rose-200">
                          {message.sender}
                        </strong>{" "}
                        left the room
                      </span>
                    </span>
                  </div>
                );
              }

              const isCurrentUser = message.sender === currentUser;
              const senderColor = getAvatarGradient(message.sender);
              const messageKey =
                message.id ||
                (message.timeStamp
                  ? `${message.sender}_${message.timeStamp}`
                  : `msg-${index}`);

              // Check if previous message was from same sender for visual grouping
              const prevMessage = filteredMessages[index - 1];
              const isContinuation =
                prevMessage && prevMessage.sender === message.sender;

              // Pure emoji detection
              const isEmojiOnly =
                Boolean(message.content) &&
                /^[\p{Emoji}\p{Emoji_Component}\s]+$/u.test(message.content) &&
                /\p{Emoji}/u.test(message.content);

              return (
                <div
                  key={messageKey}
                  id={`msg-${messageKey}`}
                  data-msg-key={messageKey}
                  data-msg-id={message.id || message._id || ""}
                  data-msg-sender={message.sender || ""}
                  data-msg-content={typeof message.content === "string" ? message.content.slice(0, 40) : ""}
                  className={`group relative flex w-full animate-[messageIn_0.22s_ease-out] ${
                    isCurrentUser ? "justify-end" : "justify-start"
                  } ${isContinuation ? "mt-1" : "mt-2.5"}`}
                >
                  <div
                    className={`flex items-end gap-2.5 max-w-[85%] sm:max-w-[70%] ${
                      isCurrentUser ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {/* Avatar */}
                    {!isContinuation ? (
                      <div
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${senderColor} text-xs font-bold text-white shadow-md`}
                        title={message.sender}
                      >
                        {message.sender?.charAt(0)?.toUpperCase()}
                      </div>
                    ) : (
                      <div className="w-8 flex-shrink-0" />
                    )}

                    {/* Bubble Content Column */}
                    <div className="flex flex-col">
                      {/* Sender name for other users */}
                      {!isCurrentUser && !isContinuation && (
                        <div className="mb-1 flex items-center gap-1.5 pl-1">
                          <span className="text-[11px] font-semibold tracking-wide text-cyan-400">
                            {message.sender}
                          </span>
                          {DEMO_PERSONAS.find((p) => p.name === message.sender)?.role && (
                            <span className="rounded-md border border-cyan-500/25 bg-cyan-500/10 px-1.5 py-0.2 text-[9px] font-medium text-cyan-300">
                              {DEMO_PERSONAS.find((p) => p.name === message.sender).role}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Bubble Content Card */}
                      <div
                        className={`relative overflow-hidden px-4 py-2.5 shadow-lg transition-all ${
                          isCurrentUser
                            ? "rounded-2xl rounded-br-xs border border-blue-400/25 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-[0_4px_18px_rgba(37,99,235,0.22)]"
                            : "rounded-2xl rounded-bl-xs border border-white/10 bg-slate-900/85 text-slate-100 shadow-[0_4px_18px_rgba(0,0,0,0.2)] backdrop-blur-md"
                        }`}
                      >
                        {/* FILE MESSAGE */}
                        {message.messageType === "FILE" ? (
                          message.fileType?.startsWith("image/") ? (
                            <div className="mt-1 flex flex-col gap-1.5">
                              <div className="group/img relative overflow-hidden rounded-xl border border-white/10 bg-black/40">
                                <img
                                  src={`${baseURL}/api/v1/rooms/files/${message.fileId}`}
                                  alt={message.fileName || "Uploaded image"}
                                  onClick={() =>
                                    setPreviewImage(
                                      `${baseURL}/api/v1/rooms/files/${message.fileId}`
                                    )
                                  }
                                  className="max-h-[300px] w-auto max-w-full cursor-zoom-in rounded-xl object-cover transition-transform duration-300 group-hover/img:scale-[1.02]"
                                  loading="lazy"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewImage(
                                      `${baseURL}/api/v1/rooms/files/${message.fileId}`
                                    )
                                  }
                                  aria-label="Enlarge image"
                                  className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur-md opacity-0 transition-opacity group-hover/img:opacity-100 hover:bg-black/80"
                                >
                                  <Maximize2 size={13} />
                                </button>
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-1">
                                <span className="max-w-[180px] truncate text-[11px] text-slate-300">
                                  {message.fileName}
                                </span>
                                <a
                                  href={`${baseURL}/api/v1/rooms/files/${message.fileId}`}
                                  download={message.fileName}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Download image"
                                  className="text-cyan-400 hover:text-cyan-200"
                                >
                                  <Download size={14} />
                                </a>
                              </div>
                            </div>
                          ) : (
                            /* Non-image File Card */
                            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-2.5">
                              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
                                <FileText size={18} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-white">
                                  {message.fileName || "Attachment"}
                                </p>
                                <p className="text-[10px] text-slate-400 uppercase">
                                  {message.fileType?.split("/")[1] || "Document"}
                                </p>
                              </div>
                              <a
                                href={`${baseURL}/api/v1/rooms/files/${message.fileId}`}
                                download={message.fileName}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-200 transition-colors hover:bg-white/15 hover:text-white"
                                title="Download file"
                              >
                                <Download size={14} />
                              </a>
                            </div>
                          )
                        ) : (
                          /* Text Message */
                          <p
                            className={`break-words whitespace-pre-wrap leading-relaxed ${
                              isEmojiOnly
                                ? "py-1 text-3xl sm:text-4xl"
                                : "text-sm sm:text-[14.5px]"
                            }`}
                          >
                            {message.content}
                          </p>
                        )}

                        {/* Timestamp & status footer */}
                        <div
                          className={`mt-1 flex items-center gap-1.5 text-[10px] ${
                            isCurrentUser
                              ? "justify-end text-blue-200/70"
                              : "justify-start text-slate-400"
                          }`}
                        >
                          <span>{timeAgo(message.timeStamp)}</span>
                          {isCurrentUser && (
                            <CheckCheck
                              size={12}
                              className="text-cyan-300/80"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* TYPING INDICATOR */}
          {typingUser && (
            <div className="mt-3 flex items-center gap-2 pl-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${getAvatarGradient(
                  typingUser
                )} text-[10px] font-bold text-white shadow-sm`}
              >
                {typingUser.charAt(0).toUpperCase()}
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-xs border border-white/10 bg-slate-900/80 px-3 py-1.5 backdrop-blur-md">
                <span className="text-xs text-slate-300">
                  <strong className="font-semibold text-cyan-400">
                    {typingUser}
                  </strong>{" "}
                  is typing
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400" />
                </span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* =====================================================
          MODERN FLOATING COMPOSER DOCK
      ====================================================== */}
      <footer className="relative z-30 flex w-full flex-shrink-0 items-center justify-center px-3 pb-3 sm:px-6 sm:pb-5">
        {/* Soft bottom fade gradient */}
        <div className="pointer-events-none fixed inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#070b14] via-[#070b14]/85 to-transparent" />

        <div className="relative flex w-full max-w-3xl items-center gap-1.5 rounded-2xl border border-white/10 bg-slate-900/90 p-1.5 shadow-[0_12px_45px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-all duration-200 focus-within:border-cyan-500/50 focus-within:ring-2 focus-within:ring-cyan-500/20 sm:rounded-full sm:p-2 sm:gap-2">
          {/* File attachment trigger */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach image or file"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl sm:rounded-full text-slate-400 transition-all hover:bg-white/10 hover:text-cyan-300 hover:rotate-[-8deg] active:scale-95"
          >
            <Paperclip size={19} />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Message Input */}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            type="text"
            placeholder={`Message #${roomId}...`}
            className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-slate-100 placeholder-slate-400 outline-none sm:px-3 sm:text-[15px]"
          />

          {/* Emoji Picker trigger */}
          <div className="relative" ref={emojiPickerRef}>
            <button
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              aria-label="Insert emoji"
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl sm:rounded-full transition-all active:scale-95 ${
                showEmojiPicker
                  ? "bg-cyan-500/20 text-cyan-300"
                  : "text-slate-400 hover:bg-white/10 hover:text-amber-300"
              }`}
            >
              <Smile size={20} />
            </button>

            {/* Emoji popover */}
            {showEmojiPicker && (
              <div className="absolute bottom-12 right-0 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl backdrop-blur-2xl">
                  <EmojiPicker
                    onEmojiClick={(emojiData) => {
                      setInput((prev) => prev + emojiData.emoji);
                      inputRef.current?.focus();
                    }}
                    theme="dark"
                    searchPlaceholder="Search emoji..."
                    width={Math.min(320, window.innerWidth - 32)}
                    height={380}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={sendMessage}
            type="button"
            disabled={!input.trim()}
            title="Send message (Enter)"
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl sm:rounded-full transition-all duration-200 ${
              input.trim()
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95"
                : "bg-white/5 text-slate-500 cursor-not-allowed"
            }`}
          >
            <Send size={17} className={input.trim() ? "translate-x-0.5" : ""} />
          </button>
        </div>
      </footer>

      {/* =====================================================
          ROOM MEMBERS MODAL
      ====================================================== */}
      {showMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Room Members
                </h3>
                <p className="text-xs text-slate-400">
                  {roomMembers.length}{" "}
                  {roomMembers.length === 1 ? "person" : "people"} in #{roomId}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowMembersModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
              {loadingMembers ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Loading members...
                </div>
              ) : roomMembers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No members found
                </div>
              ) : (
                roomMembers.map((member, index) => {
                  const isCreator = member === roomCreator;
                  const isSelf = member === currentUser;
                  const gradient = getAvatarGradient(member);

                  return (
                    <div
                      key={`${member}-${index}`}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-2.5 transition-colors hover:bg-white/[0.06]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-xs font-bold text-white shadow-sm`}
                        >
                          {member.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="truncate text-xs font-semibold text-white">
                            {member} {isSelf && <span className="text-cyan-400 font-normal">(You)</span>}
                          </p>
                          {isCreator && (
                            <span className="text-[10px] font-medium text-amber-400">
                              Room Creator
                            </span>
                          )}
                        </div>
                      </div>

                      {isCreator && (
                        <Crown
                          size={16}
                          className="flex-shrink-0 text-amber-400"
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowMembersModal(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          CUSTOM CONFIRMATION DIALOG (CLEAR / DELETE)
      ====================================================== */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                  confirmDialog.actionType === "DELETE"
                    ? "bg-rose-500/20 text-rose-400"
                    : "bg-orange-500/20 text-orange-400"
                }`}
              >
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-base font-bold text-white">
                {confirmDialog.title}
              </h3>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-slate-300">
              {confirmDialog.message}
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setConfirmDialog({
                    isOpen: false,
                    title: "",
                    message: "",
                    actionType: null,
                  })
                }
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmDialog.actionType === "CLEAR") {
                    executeClearChat();
                  } else if (confirmDialog.actionType === "DELETE") {
                    executeDeleteRoom();
                  }
                }}
                className={`rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-lg transition-all ${
                  confirmDialog.actionType === "DELETE"
                    ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/30"
                    : "bg-orange-600 hover:bg-orange-500 shadow-orange-600/30"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          IMAGE FULLSCREEN LIGHTBOX PREVIEW
      ====================================================== */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-lg animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center"
          >
            <div className="absolute -top-12 right-0 flex items-center gap-2">
              <a
                href={previewImage}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20"
                title="Download full image"
              >
                <Download size={17} />
              </a>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20"
                title="Close preview"
              >
                <X size={18} />
              </button>
            </div>

            <img
              src={previewImage}
              alt="Fullscreen preview"
              className="max-h-[85vh] max-w-[85vw] rounded-2xl border border-white/10 object-contain shadow-2xl"
            />
          </div>
        </div>
      )}


    </div>
  );
};

export default ChatPage;
