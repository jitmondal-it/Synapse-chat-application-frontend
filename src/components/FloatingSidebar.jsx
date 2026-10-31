import { useState } from "react";
import {
  MessageCircle,
  Search,
  Users,
  BriefcaseBusiness,
  Settings,
  User,
  MessagesSquare,
  Crown,
  X,
  Volume2,
  VolumeX,
  Download,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  LogOut,
  ArrowRight,
  Play,
  Zap,
} from "lucide-react";
import useChatContext from "../context/ChatContext";
import {
  getRoomMembers,
  createRoomApi,
  joinChatApi,
  leaveRoomApi,
} from "../services/RoomService";
import { playNotificationSound, exportChatTranscript } from "../config/helper";
import toast from "react-hot-toast";

// Deterministic avatar gradient
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

const menuItems = [
  { id: "chat", label: "New Chat", icon: MessageCircle },
  { id: "search", label: "Search", icon: Search },
  { id: "roommembers", label: "Room Members", icon: Users },
  { id: "aboutcreator", label: "About Creator", icon: BriefcaseBusiness },
];

const bottomItems = [
  { id: "settings", label: "Settings", icon: Settings },
  { id: "profile", label: "Profile", icon: User },
];

export default function FloatingSidebar({
  messages = [],
  onTriggerSearch,
  onInsertInput,
  onLeaveRoom,
  onClearChat,
  soundEnabled = true,
  setSoundEnabled,
  autoScroll = true,
  setAutoScroll,
  isDemoActive = false,
  onToggleDemo,
}) {
  const [open, setOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // null | "chat" | "roommembers" | "aboutcreator" | "settings" | "profile"
  const [copiedRoomId, setCopiedRoomId] = useState(false);

  // New Chat / Switch Room form state
  const [switchRoomMode, setSwitchRoomMode] = useState("join"); // "join" | "create"
  const [newRoomId, setNewRoomId] = useState("");
  const [switchingRoom, setSwitchingRoom] = useState(false);

  const {
    roomId,
    currentUser,
    roomMembers,
    roomCreator,
    setRoomId,
    setRoomMembers,
    setRoomCreator,
  } = useChatContext();

  // Handle action click from floating menu
  const handleAction = async (id) => {
    if (id === "search") {
      setActiveModal(null);
      if (onTriggerSearch) {
        onTriggerSearch();
      }
      return;
    }

    if (activeModal === id) {
      setActiveModal(null);
      return;
    }

    setActiveModal(id);

    // Refresh members on opening room members
    if (id === "roommembers") {
      try {
        const data = await getRoomMembers(roomId);
        if (data.members) setRoomMembers(data.members);
        if (data.createdBy) setRoomCreator(data.createdBy);
      } catch (err) {
        console.error("Failed to refresh room members:", err);
      }
    }
  };

  // Copy current Room ID
  const handleCopyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopiedRoomId(true);
      toast.success("Room ID copied to clipboard!");
      setTimeout(() => setCopiedRoomId(false), 2000);
    } catch {
      toast.error("Failed to copy Room ID");
    }
  };

  // Execute Switch / Create Room
  const handleSwitchRoomSubmit = async (e) => {
    e.preventDefault();
    if (!newRoomId.trim()) {
      toast.error("Please enter a room ID");
      return;
    }

    const targetRoom = newRoomId.trim();
    if (targetRoom === roomId) {
      toast("You are already in this room");
      setActiveModal(null);
      return;
    }

    setSwitchingRoom(true);
    const toastId = toast.loading(
      switchRoomMode === "create" ? "Creating new room..." : "Joining room..."
    );

    try {
      // Leave current room
      if (roomId && currentUser) {
        try {
          await leaveRoomApi(roomId, currentUser);
        } catch (e) {
          console.warn("Notice: could not leave previous room cleanly:", e);
        }
      }

      let roomData;
      if (switchRoomMode === "create") {
        roomData = await createRoomApi(targetRoom, currentUser);
        toast.success(`Created room #${roomData.roomId || targetRoom}`, {
          id: toastId,
        });
      } else {
        roomData = await joinChatApi(targetRoom, currentUser);
        toast.success(`Joined room #${roomData.roomId || targetRoom}`, {
          id: toastId,
        });
      }

      setRoomId(roomData.roomId || targetRoom);
      setRoomMembers(roomData.members || [currentUser]);
      setRoomCreator(roomData.createdBy || currentUser);
      setNewRoomId("");
      setActiveModal(null);
    } catch (err) {
      console.error("Switch room error:", err);
      const msg = err.response?.data || "Could not switch room";
      toast.error(typeof msg === "string" ? msg : "Failed to switch room", {
        id: toastId,
      });
    } finally {
      setSwitchingRoom(false);
    }
  };



  return (
    <div
      className="fixed right-5 top-1/2 z-40 -translate-y-1/2"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* =====================================================
          MAIN FLOATING DOCK
      ====================================================== */}
      <div
        className={`flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/90 shadow-[0_12px_45px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-all duration-300 ease-out ${
          open ? "w-52" : "w-14"
        }`}
      >
        {/* Synapse Brand Badge */}
        <div className="flex h-14 flex-row-reverse items-center justify-between border-b border-white/10">
          <div className="flex min-w-14 items-center justify-center">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 text-white shadow-[0_0_20px_rgba(34,211,238,0.35)] transition-all duration-300 hover:scale-105">
              <MessagesSquare size={21} strokeWidth={2.2} />
              <span className="absolute right-[6px] top-[6px] h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]" />
            </div>
          </div>

          <span
            className={`whitespace-nowrap font-bold tracking-wide text-white transition-all duration-300 ${
              open ? "ml-3.5 opacity-100" : "ml-0 opacity-0"
            }`}
          >
            Synapse
          </span>
        </div>

        {/* Main Menu Items */}
        <div className="flex flex-col gap-1 p-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModal === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleAction(item.id)}
                title={item.label}
                className={`group flex h-11 w-full flex-row-reverse items-center justify-between rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-300 hover:bg-white/10 hover:text-white hover:-translate-x-1"
                }`}
              >
                <div className="flex min-w-10 items-center justify-center">
                  <Icon
                    size={20}
                    className={`transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? "text-cyan-400" : ""
                    }`}
                  />
                </div>

                <span
                  className={`whitespace-nowrap text-sm font-medium transition-all duration-300 pl-2.5 ${
                    open ? "translate-x-0 opacity-100" : "translate-x-3 opacity-0"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="mx-3 border-t border-white/10" />

        {/* Bottom Menu Items */}
        <div className="flex flex-col gap-1 p-2">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModal === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleAction(item.id)}
                title={item.label}
                className={`group flex h-11 w-full flex-row-reverse items-center justify-between rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-400 hover:bg-white/10 hover:text-white hover:-translate-x-1"
                }`}
              >
                <div className="flex min-w-10 items-center justify-center">
                  <Icon
                    size={19}
                    className={`transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? "text-cyan-400" : ""
                    }`}
                  />
                </div>

                <span
                  className={`whitespace-nowrap text-sm transition-all duration-300 pl-2.5 ${
                    open ? "translate-x-0 opacity-100" : "translate-x-3 opacity-0"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================
          SIDEBAR MODALS & DRAWERS
      ====================================================== */}

      {/* 1. ROOM MEMBERS MODAL */}
      {activeModal === "roommembers" && (
        <div className="fixed right-20 top-1/2 z-50 -translate-y-1/2 w-80 rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-right-2 duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Users size={16} className="text-cyan-400" /> Room Members
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {roomMembers.length}{" "}
                {roomMembers.length === 1 ? "active person" : "active people"} in #{roomId}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X size={17} />
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
            {roomMembers.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No active members found
              </div>
            ) : (
              roomMembers.map((member, index) => {
                const isCreator = member === roomCreator;
                const isSelf = member === currentUser;
                const gradient = getAvatarGradient(member);

                return (
                  <div
                    key={`${member}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 transition-all hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-xs font-bold text-white shadow-sm`}
                      >
                        {member.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-white flex items-center gap-1">
                          {member}
                          {isSelf && (
                            <span className="text-[10px] text-cyan-400 font-normal">
                              (You)
                            </span>
                          )}
                        </p>
                        {isCreator && (
                          <span className="text-[10px] text-amber-400 font-medium">
                            Creator
                          </span>
                        )}
                      </div>
                    </div>

                    {isCreator && (
                      <Crown size={15} className="shrink-0 text-amber-400" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Copy Room ID footer action */}
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={handleCopyRoomId}
              className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {copiedRoomId ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedRoomId ? "Copied!" : "Copy Room ID"}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 2. NEW CHAT / SWITCH ROOM MODAL */}
      {activeModal === "chat" && (
        <div className="fixed right-20 top-1/2 z-50 -translate-y-1/2 w-80 rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-right-2 duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <MessageCircle size={16} className="text-cyan-400" /> Switch / New Chat
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Current: <strong className="text-slate-200">#{roomId}</strong>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X size={17} />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center rounded-xl bg-white/5 p-1 mb-3">
            <button
              type="button"
              onClick={() => setSwitchRoomMode("join")}
              className={`flex-1 rounded-lg py-1 text-xs font-medium transition-all ${
                switchRoomMode === "join"
                  ? "bg-cyan-500/20 text-cyan-300 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Join Room
            </button>
            <button
              type="button"
              onClick={() => setSwitchRoomMode("create")}
              className={`flex-1 rounded-lg py-1 text-xs font-medium transition-all ${
                switchRoomMode === "create"
                  ? "bg-cyan-500/20 text-cyan-300 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Create Room
            </button>
          </div>

          <form onSubmit={handleSwitchRoomSubmit} className="flex flex-col gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                Room ID
              </label>
              <input
                type="text"
                placeholder={switchRoomMode === "create" ? "e.g. dev-team-sync" : "Enter room ID..."}
                value={newRoomId}
                onChange={(e) => setNewRoomId(e.target.value)}
                autoFocus
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none ring-1 ring-cyan-500/20 focus:ring-cyan-400"
              />
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              You will join as <strong className="text-cyan-300">{currentUser}</strong> and leave #{roomId}.
            </p>

            <div className="mt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={switchingRoom || !newRoomId.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
              >
                <span>{switchRoomMode === "create" ? "Create" : "Join"}</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. ABOUT CREATOR MODAL */}
      {activeModal === "aboutcreator" && (
        <div className="fixed right-20 top-1/2 z-50 -translate-y-1/2 w-80 rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-right-2 duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <BriefcaseBusiness size={16} className="text-cyan-400" /> About Creator
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Developer & Architect</p>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X size={17} />
            </button>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 text-lg font-bold text-white shadow-[0_0_25px_rgba(34,211,238,0.35)]">
              JM
            </div>

            <h3 className="mt-3 text-base font-bold text-white">Jeet Mondal</h3>
            <p className="text-xs text-cyan-400 font-medium">Full Stack & Real-Time Web Developer</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Built Synapse as a high-performance, real-time encrypted collaborative chat platform powered by React, STOMP WebSockets, and Spring Boot.
            </p>

            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {["React", "Spring Boot", "WebSockets", "STOMP", "Tailwind CSS"].map((tech) => (
                <span
                  key={tech}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-300"
                >
                  {tech}
                </span>
              ))}
            </div>

            <div className="mt-4 flex w-full gap-2">
              <a
                href="https://j-m-portfolio-tau.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2 text-xs font-semibold text-white shadow-md hover:scale-105 active:scale-95 transition-all"
              >
                <span>Portfolio</span>
                <ExternalLink size={13} />
              </a>

              <a
                href="https://github.com/jitmondal-it"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 4. SETTINGS MODAL */}
      {activeModal === "settings" && (
        <div className="fixed right-20 top-1/2 z-50 -translate-y-1/2 w-80 rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-right-2 duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Settings size={16} className="text-cyan-400" /> Chat Settings
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Preferences & Tools</p>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X size={17} />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {/* Notification Sound Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
              <div className="flex items-center gap-2">
                {soundEnabled ? (
                  <Volume2 size={16} className="text-cyan-400" />
                ) : (
                  <VolumeX size={16} className="text-slate-500" />
                )}
                <div>
                  <p className="text-xs font-medium text-white">Chime Sound</p>
                  <p className="text-[10px] text-slate-400">Play tone on incoming messages</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  title="Test notification tone"
                  onClick={playNotificationSound}
                  className="rounded-lg bg-white/5 p-1 text-slate-400 hover:text-cyan-300 hover:bg-white/10"
                >
                  <Play size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setSoundEnabled && setSoundEnabled((prev) => !prev)}
                  className={`h-5 w-9 rounded-full transition-colors relative ${
                    soundEnabled ? "bg-cyan-500" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                      soundEnabled ? "translate-x-4" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Auto-Scroll Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
              <div>
                <p className="text-xs font-medium text-white">Auto-Scroll</p>
                <p className="text-[10px] text-slate-400">Scroll down on new message</p>
              </div>

              <button
                type="button"
                onClick={() => setAutoScroll && setAutoScroll((prev) => !prev)}
                className={`h-5 w-9 rounded-full transition-colors relative ${
                  autoScroll ? "bg-cyan-500" : "bg-slate-700"
                }`}
              >
                <span
                  className={`block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    autoScroll ? "translate-x-4" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Live Demo Simulator Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-2.5">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-violet-400" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-white">Demo Simulator</p>
                    <span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-violet-300">
                      Live
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">Simulate incoming team chat</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleDemo}
                className={`h-5 w-9 rounded-full transition-colors relative ${
                  isDemoActive ? "bg-amber-500" : "bg-slate-700"
                }`}
              >
                <span
                  className={`block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    isDemoActive ? "translate-x-4" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Export Chat Transcript */}
            <button
              type="button"
              onClick={() => {
                const ok = exportChatTranscript(roomId, messages);
                if (ok) {
                  toast.success("Chat transcript downloaded!");
                } else {
                  toast.error("No messages to export");
                }
              }}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-2.5 text-left hover:bg-white/[0.06] transition-all"
            >
              <div className="flex items-center gap-2">
                <Download size={16} className="text-emerald-400" />
                <div>
                  <p className="text-xs font-medium text-white">Export Conversation</p>
                  <p className="text-[10px] text-slate-400">Download formatted .txt history</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400">Export</span>
            </button>

            {/* Clear Chat Action */}
            {onClearChat && (
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  onClearChat();
                }}
                className="flex items-center justify-between rounded-xl border border-orange-500/20 bg-orange-500/10 p-2.5 text-left hover:bg-orange-500/20 transition-all text-orange-300"
              >
                <div className="flex items-center gap-2">
                  <Trash2 size={16} />
                  <div>
                    <p className="text-xs font-medium">Clear Chat Messages</p>
                    <p className="text-[10px] text-orange-300/70">Remove history for everyone</p>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. PROFILE MODAL */}
      {activeModal === "profile" && (
        <div className="fixed right-20 top-1/2 z-50 -translate-y-1/2 w-80 rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-right-2 duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <User size={16} className="text-cyan-400" /> User Profile
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Session Details</p>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X size={17} />
            </button>
          </div>

          <div className="flex flex-col items-center text-center">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${getAvatarGradient(
                currentUser
              )} text-2xl font-bold text-white shadow-lg`}
            >
              {currentUser?.charAt(0)?.toUpperCase()}
            </div>

            <h3 className="mt-3 text-base font-bold text-white flex items-center gap-1.5">
              <span>{currentUser}</span>
              <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                You
              </span>
            </h3>

            <div className="mt-3 flex w-full flex-col gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-left">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current Room</span>
                <span className="font-semibold text-white">#{roomId}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Role</span>
                <span className="font-semibold text-amber-400 flex items-center gap-1">
                  {currentUser === roomCreator ? (
                    <>
                      <Crown size={13} /> Room Creator
                    </>
                  ) : (
                    "Member"
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live & Connected
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveModal(null);
                if (onLeaveRoom) onLeaveRoom();
              }}
              className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-all"
            >
              <LogOut size={14} />
              <span>Leave Room</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}