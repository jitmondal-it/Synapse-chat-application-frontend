import { useState } from "react";

import {
  MessageCircle,
  Search,
  Users,
  Bot,
  Bell,
  Settings,
  User,
  MessagesSquare,
  Crown
} from "lucide-react";

import useChatContext from "../context/ChatContext";
import { getRoomMembers } from "../services/RoomService";

const menuItems = [
  {
    id: "chat",
    label: "New Chat",
    icon: MessageCircle,
  },
  {
    id: "search",
    label: "Search",
    icon: Search,
  },
  {
    id: "roommembers",
    label: "Room Members",
    icon: Users,
  },
  {
    id: "ai",
    label: "Synapse AI",
    icon: Bot,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
  },
];

const bottomItems = [
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
  },
  {
    id: "profile",
    label: "Profile",
    icon: User,
  },
];

export default function FloatingSidebar() {
  const [open, setOpen] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState([]);
  const [createdBy, setCreatedBy] = useState("");

  const { roomId } = useChatContext();

  const handleAction = async (id) => {
  console.log("Clicked:", id);

  if (id === "roommembers") {
    try {
      const data = await getRoomMembers(roomId);

      setMembers(data.members || []);
      setCreatedBy(data.createdBy || "");
      setShowMembers(true);
    } catch (error) {
      console.error("Failed to load room members:", error);
    }
  }
};

  return (
    <div
      className="fixed left-5 top-1/2 z-50 -translate-y-1/2"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div
        className={`
          flex flex-col
          overflow-hidden
          rounded-2xl
          border border-white/10
          bg-slate-900/90
          shadow-2xl
          backdrop-blur-xl
          transition-all
          duration-300
          ease-out
          ${open ? "w-52" : "w-14"}
        `}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-white/10">
          <div className="flex min-w-14 items-center justify-center">
            <div
  className="
    relative
    flex h-9 w-9 items-center justify-center
    rounded-xl
    bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600
    text-white
    shadow-[0_0_20px_rgba(34,211,238,0.35)]
    transition-all duration-300
    hover:scale-105
    hover:shadow-[0_0_28px_rgba(34,211,238,0.55)]
  "
>
  <MessagesSquare
    size={21}
    strokeWidth={2.2}
  />

  {/* Connection point */}
  <span
    className="
      absolute
      right-[6px]
      top-[6px]
      h-1.5
      w-1.5
      rounded-full
      bg-white
      shadow-[0_0_6px_rgba(255,255,255,0.9)]
    "
  />
</div>
          </div>

          <span
            className={`
              whitespace-nowrap font-bold text-white
              transition-all duration-300
              ${open ? "ml-2 opacity-100" : "ml-0 opacity-0"}
            `}
          >
            Synapse
          </span>
        </div>

        {/* Main menu */}
        <div className="flex flex-col gap-1 p-2">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleAction(item.id)}
                className="
                  group flex h-11 w-full items-center
                  rounded-xl
                  text-slate-300
                  transition-all duration-200
                  hover:bg-white/10
                  hover:text-white
                  hover:translate-x-1
                "
              >
                <div className="flex min-w-10 items-center justify-center">
                  <Icon
                    size={20}
                    className="transition-transform duration-200 group-hover:scale-110"
                  />
                </div>

                <span
                  className={`
                    whitespace-nowrap text-sm font-medium
                    transition-all duration-300
                    ${
                      open
                        ? "translate-x-0 opacity-100"
                        : "-translate-x-3 opacity-0"
                    }
                  `}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="mx-3 border-t border-white/10" />

        {/* Bottom menu */}
        <div className="flex flex-col gap-1 p-2">
          {bottomItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleAction(item.id)}
                className="
                  group flex h-11 w-full items-center
                  rounded-xl
                  text-slate-400
                  transition-all duration-200
                  hover:bg-white/10
                  hover:text-white
                  hover:translate-x-1
                "
              >
                <div className="flex min-w-10 items-center justify-center">
                  <Icon
                    size={19}
                    className="transition-transform duration-200 group-hover:scale-110"
                  />
                </div>

                <span
                  className={`
                    whitespace-nowrap text-sm
                    transition-all duration-300
                    ${
                      open
                        ? "translate-x-0 opacity-100"
                        : "-translate-x-3 opacity-0"
                    }
                  `}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
        {showMembers && (
    <div
      className="
        fixed left-20 top-1/2 -translate-y-1/2
        w-72
        rounded-2xl
        border border-white/10
        bg-slate-900/95
        p-4
        shadow-2xl
        backdrop-blur-xl
        animate-in
        fade-in
        slide-in-from-left-2
        duration-200
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">
            Room Members
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            {members.length} {members.length === 1 ? "member" : "members"}
          </p>
        </div>

        <button
          onClick={() => setShowMembers(false)}
          className="
            flex h-8 w-8 items-center justify-center
            rounded-lg
            text-slate-400
            transition
            hover:bg-white/10
            hover:text-white
          "
        >
          ×
        </button>
      </div>

      {/* Members */}
      <div className="flex flex-col gap-2">
        {members.map((member, index) => {
          const isCreator = member === createdBy;

          return (
            <div
              key={`${member}-${index}`}
              className="
                flex items-center gap-3
                rounded-xl
                border border-white/[0.06]
                bg-white/[0.04]
                px-3 py-2.5
                transition-all duration-200
                hover:bg-white/[0.08]
              "
            >
              <div
                className="
                  flex h-9 w-9 shrink-0
                  items-center justify-center
                  rounded-full
                  bg-gradient-to-br
                  from-cyan-400
                  to-blue-600
                  text-sm
                  font-bold
                  text-white
                "
              >
                {member.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {member}
                </p>

                {isCreator && (
                  <p className="text-[11px] text-cyan-400">
                    Creator
                  </p>
                )}
              </div>

              {isCreator && (
                <Crown
                  size={17}
                  strokeWidth={2}
                  className="text-cyan-400"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  )}
    </div>
  );
}