import React, { useEffect, useRef, useState } from "react";
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
} from "../services/RoomService";
import { timeAgo } from "../config/helper";
import {
  Paperclip,
  Send,
  LogOut,
  MessagesSquare,
  Trash2,
  Smile,
  MoreVertical,
} from "lucide-react";
import FloatingSidebar from "./FloatingSidebar";
import EmojiPicker from "emoji-picker-react";

const ChatPage = () => {
  const {
    roomId,
    currentUser,
    connected,
    setConnected,
    setRoomId,
    setCurrentUser,
  } = useChatContext();

  const navigate = useNavigate();

  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const chatBoxRef = useRef(null);

  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const [input, setInput] = useState("");
  const [stompClient, setStompClient] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);

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
        const messages = await getMessagess(roomId);
        setMessages(messages);
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    }

    if (connected && roomId) {
      loadMessages();
    }
  }, [connected, roomId]);

  // =========================================================
  // AUTO SCROLL
  // =========================================================

  useEffect(() => {
    if (!chatBoxRef.current) return;

    chatBoxRef.current.scrollTo({
      top: chatBoxRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, typingUser]);

  // =========================================================
  // WEBSOCKET CONNECTION
  // =========================================================

  useEffect(() => {
    if (!connected) {
      return;
    }

    const sock = new SockJS(`${baseURL}/chat`);
    const client = Stomp.over(sock);

    let messageSubscription = null;
    let typingSubscription = null;

    client.connect({}, () => {
      console.log("WebSocket connected");

      setStompClient(client);

      // -----------------------------------------------------
      // MESSAGE SUBSCRIPTION
      // -----------------------------------------------------

      messageSubscription = client.subscribe(
        `/topic/room/${roomId}`,
        (message) => {
          console.log("Message received:", message.body);

          const newMessage = JSON.parse(message.body);

          setMessages((prev) => [...prev, newMessage]);
        },
      );

      // -----------------------------------------------------
      // TYPING SUBSCRIPTION
      // -----------------------------------------------------

      typingSubscription = client.subscribe(
        `/topic/typing/${roomId}`,
        (message) => {
          const event = JSON.parse(message.body);

          if (event.typing && event.sender !== currentUser) {
            setTypingUser(event.sender);
          } else {
            setTypingUser("");
          }
        },
      );
    });

    // -------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------

    return () => {
      console.log("Cleaning WebSocket connection");

      if (messageSubscription) {
        messageSubscription.unsubscribe();
      }

      if (typingSubscription) {
        typingSubscription.unsubscribe();
      }

      if (client.connected) {
        client.disconnect(() => {
          console.log("WebSocket disconnected");
        });
      }

      setStompClient(null);
      setTypingUser("");
    };
  }, [roomId, connected, currentUser]);

  // =========================================================
  // SEND TYPING STATUS
  // =========================================================

  const sendTypingStatus = (isTyping) => {
    if (!stompClient || !connected) {
      return;
    }

    if (!stompClient.connected) {
      return;
    }

    stompClient.send(
      `/app/typing/${roomId}`,
      {},
      JSON.stringify({
        sender: currentUser,
        typing: isTyping,
      }),
    );
  };

  // =========================================================
  // HANDLE TYPING
  // =========================================================

  const handleTyping = (value) => {
    setInput(value);

    // User removed all text
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

    // Send "typing: true" only once
    if (!isTypingRef.current) {
      sendTypingStatus(true);
      isTypingRef.current = true;
    }

    // Reset timer every time user types
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // If user stops typing for 1.5 seconds
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false);
      isTypingRef.current = false;
    }, 1500);
  };

  // =========================================================
  // CLEAN TYPING TIMER
  // =========================================================

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // =========================================================
  // SEND MESSAGE
  // =========================================================

  const sendMessage = async () => {
    if (stompClient && connected && input.trim()) {
      console.log(input);

      // Stop typing immediately
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (isTypingRef.current) {
        sendTypingStatus(false);
        isTypingRef.current = false;
      }

      const message = {
        sender: currentUser,
        content: input,
        roomId: roomId,
      };

      stompClient.send(
        `/app/sendMessage/${roomId}`,
        {},
        JSON.stringify(message),
      );

      setInput("");

      // Keep focus on input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  // =========================================================
  // LOGOUT / LEAVE ROOM
  // =========================================================

  function handleLogout() {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (stompClient && stompClient.connected) {
      if (isTypingRef.current) {
        sendTypingStatus(false);
        isTypingRef.current = false;
      }

      stompClient.disconnect();
    }

    setConnected(false);
    setRoomId("");
    setCurrentUser("");

    navigate("/");
  }

  // =========================================================
  // CLEAR CHAT
  // =========================================================

  const handleClearChat = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all messages from this chat ?",
    );

    if (!confirmed) return;

    try {
      await clearChat(roomId);

      setMessages([]);

      toast.success("Chat cleared successfully");
    } catch (error) {
      console.error("Error clearing chat:", error);
      toast.error("Failed to clear chat");
    }
  };

  // =========================================================
  // DELETE ROOM
  // =========================================================

  const handleDeleteRoom = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete the room "${roomId}"? This will also delete all messages and uploaded files.`,
    );

    if (!confirmed) return;

    try {
      await deleteRoom(roomId);

      setMessages([]);
      setRoomId("");

      toast.success("Room deleted successfully");

      navigate("/");
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error("Failed to delete room");
    }
  };

  // =========================================================
  // FILE UPLOAD
  // =========================================================

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];

    if (!file) return;

    try {
      // Upload actual file to MongoDB GridFS
      const result = await uploadFile(roomId, file);

      console.log("File uploaded:", result);

      // Create file message
      const message = {
        sender: currentUser,
        content: "",
        roomId: roomId,
        messageType: "FILE",
        fileId: result.fileId,
        fileName: result.fileName,
        fileType: result.fileType,
      };

      // Send file message through WebSocket
      if (stompClient && connected) {
        stompClient.send(
          `/app/sendMessage/${roomId}`,
          {},
          JSON.stringify(message),
        );
      }

      toast.success("File sent successfully");
    } catch (error) {
      console.error("File upload failed:", error);
      toast.error("Failed to upload file");
    }

    event.target.value = "";
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen bg-[#050914] text-white ">
     <div className="hidden sm:block">
      <FloatingSidebar />
     </div>
      

      {/* =====================================================
          FLOATING NAVBAR
      ====================================================== */}

      <div
        className="
          fixed
          top-4
          left-1/2
          -translate-x-1/2
          z-50

          w-[calc(100%-16px)]
          sm:w-[780px]
          lg:w-[920px]

          min-h-[64px]
          h-auto
          px-2 sm:px-5
          py-2

          grid
          grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]
          items-center
          gap-1 sm:gap-2

          bg-white/90
          backdrop-blur-2xl

          border
          border-white/60

          shadow-[0_10px_35px_rgba(0,0,0,0.12),0_4px_20px_rgba(56,189,248,0.14)]

          transition-all
          duration-300

          "
      >
        {/* =================================================
            LEFT : ROOM
        ================================================== */}

        <div className="col-start-1 flex items-center min-w-0">
          <div
            className="
              h-8 w-8
              sm:h-10 sm:w-10
              flex-shrink-0
              rounded-lg sm:rounded-xl
              bg-gradient-to-br
              from-blue-500
              to-indigo-600
              flex
              items-center
              justify-center
              shadow-[0_4px_14px_rgba(59,130,246,0.28)]
            "
          >
            <MessagesSquare
              size={18}
              strokeWidth={2.2}
              className="text-white"
            />
          </div>

          <div className="ml-3 min-w-0">
            <p
              className="
                text-[9px]
                uppercase
                tracking-[0.18em]
                font-semibold
                text-gray-400
              "
            >
              Room
            </p>

            <p
              className="
                text-sm
                font-semibold
                text-gray-800
                truncate

                max-w-[90px]
                sm:max-w-[150px]
              "
            >
              #{roomId}
            </p>
          </div>
        </div>

        {/* =================================================
            CENTER : SYNAPSE
        ================================================== */}

        <div className="hidden sm:flex items-center justify-center">
          <div className="text-center">
            <h1
              className="
                text-[17px]
                font-bold
                tracking-[0.22em]
                text-gray-800
                leading-none
              "
            >
              SYNAPSE
            </h1>

            <p
              className="
                mt-1
                text-[7px]
                font-medium
                tracking-[0.32em]
                text-gray-400
              "
            >
              CONNECT • CHAT • SHARE
            </p>
          </div>
        </div>

        {/* =================================================
            RIGHT : USER + ACTIONS
        ================================================== */}

        <div
          className="
           col-start-3
            flex
            items-center
            justify-end
            justify-self-end
            gap-2
          "
        >
          {/* User */}

          <div
            className="
              hidden
              md:flex
              items-center
              gap-2
              pr-2
            "
          >
            <div
              className="
                relative
                h-9 w-9
                flex-shrink-0

                rounded-full

                bg-gradient-to-br
                from-blue-500
                to-indigo-600

                flex
                items-center
                justify-center

                text-xs
                font-bold
                text-white

                shadow-md
              "
            >
              {currentUser?.charAt(0)?.toUpperCase()}

              <span
                className="
                  absolute
                  right-0
                  bottom-0

                  h-2.5
                  w-2.5

                  rounded-full
                  bg-green-400

                  border-2
                  border-white
                "
              />
            </div>

            <div className="max-w-[90px]">
              <p
                className="
                  text-[9px]
                  uppercase
                  tracking-wider
                  text-gray-400
                "
              >
                Online
              </p>

              <p
                className="
                  text-xs
                  font-semibold
                  text-gray-800
                  truncate
                "
              >
                {currentUser}
              </p>
            </div>
          </div>

          {/* Divider */}

          <div className="hidden sm:block h-7 w-px bg-gray-200" />

          {/* Mobile Action Menu */}
          <div className="relative sm:hidden">
            <button
              type="button"
              onClick={() => setShowActionMenu((prev) => !prev)}
              aria-label="Open chat actions"
              aria-expanded={showActionMenu}
              className="
              h-9 w-9
              flex items-center justify-center
              rounded-xl
              bg-gray-100
              text-gray-600
              border border-gray-200
              transition-all duration-200
              hover:bg-gray-200
              active:scale-95
            "
            >
              <MoreVertical size={20} />
            </button>

            {showActionMenu && (
              <div
              className="
              absolute
              right-0
              top-12
              z-[100]
              w-44
              overflow-hidden
              rounded-xl
              border border-gray-200
              bg-white
              p-1.5
              shadow-[0_12px_35px_rgba(0,0,0,0.20)]
              animate-[messageIn_0.2s_ease-out]
            "
              >
                {/* Leave Room */}
                <button
                  type="button"
                  onClick={() => {
                    setShowActionMenu(false);
                    handleLogout();
                  }}
                  className="
                flex w-full items-center gap-3
                rounded-lg px-3 py-2.5
                text-sm font-medium text-gray-700
                transition-colors
                hover:bg-gray-100
                active:bg-gray-200
              "
                >
                  <LogOut size={17} />
                  <span>Leave room</span>
                </button>

                {/* Clear Chat */}
                <button
                  type="button"
                  onClick={() => {
                    setShowActionMenu(false);
                    handleClearChat();
                  }}
                  className="
                flex w-full items-center gap-3
                rounded-lg px-3 py-2.5
                text-sm font-medium text-orange-600
                transition-colors
                hover:bg-orange-50
                active:bg-orange-100
              "
                >
                  <Trash2 size={17} />
                  <span>Clear chat</span>
                </button>

                {/* Delete Room */}
                <button
                  type="button"
                  onClick={() => {
                    setShowActionMenu(false);
                    handleDeleteRoom();
                  }}
                  className="
          flex w-full items-center gap-3
          rounded-lg px-3 py-2.5
          text-sm font-medium text-red-600
          transition-colors
          hover:bg-red-50
          active:bg-red-100
        "
                >
                  <Trash2 size={17} />
                  <span>Delete room</span>
                </button>
              </div>
            )}
          </div>

          {/* Leave */}
          <button
            type="button"
            onClick={handleLogout}
            title="Leave room"
            className="
              group

              h-9
              px-3
              hidden sm:flex
              rounded-xl

              flex
              items-center
              justify-center
              gap-2

              bg-gray-100
              text-gray-500

              border
              border-gray-200

              text-xs
              font-medium

              transition-all
              duration-200

              hover:bg-red-50
              hover:border-red-200
              hover:text-red-500
            "
          >
            <LogOut
              size={15}
              className="
                transition-transform
                duration-200
                group-hover:-translate-x-0.5
              "
            />

            <span className="hidden lg:block">Leave</span>
          </button>

          {/* Clear Chat */}

          <button
            type="button"
            onClick={handleClearChat}
            className="
              group
              relative
              h-9 w-9
              rounded-xl
              flex items-center justify-center
              hidden sm:flex

              bg-orange-50
              text-orange-500
              border border-orange-100

              cursor-pointer

              transition-all
              duration-200
              ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]

              hover:bg-orange-500
              hover:text-white
              hover:border-orange-500
              hover:shadow-[0_8px_20px_rgba(249,115,22,0.22)]
            "
          >
            <span
              className="
                pointer-events-none
                absolute
                left-1/2
                -translate-x-1/2

                top-0
                -translate-y-1/2

                whitespace-nowrap

                rounded-md
                bg-orange-500
                px-2.5
                py-1.5

                text-[11px]
                font-semibold
                text-white

                opacity-0
                scale-90

                shadow-[0_8px_18px_rgba(249,115,22,0.20)]

                transition-all
                duration-300
                ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]

                group-hover:-top-9
                group-hover:translate-y-0
                group-hover:opacity-100
                group-hover:scale-100

                z-50
              "
            >
              Clear chat
              <span
                className="
                  absolute
                  left-1/2
                  bottom-[-3px]
                  -translate-x-1/2
                  h-2
                  w-2
                  rotate-45
                  bg-orange-500
                "
              />
            </span>

            <Trash2
              size={16}
              className="
                transition-transform
                duration-300
                ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]

                group-hover:scale-110
              "
              aria-hidden="true"
            />
            <span className="sr-only">Clear chat</span>
          </button>

          {/* Delete Room */}

          <button
            type="button"
            onClick={handleDeleteRoom}
            className="
              group
              relative
              h-9 w-9
              rounded-xl
              flex items-center justify-center
              hidden sm:flex

              bg-red-50
              text-red-400
              border border-red-100

              cursor-pointer

              transition-all
              duration-200
              ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]

              hover:bg-red-500
              hover:text-white
              hover:border-red-500
              hover:shadow-[0_8px_20px_rgba(239,68,68,0.22)]
            "
          >
            <span
              className="
                pointer-events-none
                absolute
                left-1/2
                -translate-x-1/2

                top-0
                -translate-y-1/2

                whitespace-nowrap

                rounded-md
                bg-red-500
                px-2.5
                py-1.5

                text-[11px]
                font-semibold
                text-white

                opacity-0
                scale-90

                shadow-[0_8px_18px_rgba(239,68,68,0.20)]

                transition-all
                duration-300
                ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]

                group-hover:-top-9
                group-hover:translate-y-0
                group-hover:opacity-100
                group-hover:scale-100

                z-50
              "
            >
              Delete room
              <span
                className="
                  absolute
                  left-1/2
                  bottom-[-3px]
                  -translate-x-1/2
                  h-2
                  w-2
                  rotate-45
                  bg-red-500
                "
              />
            </span>

            <Trash2
              size={16}
              className="
                transition-transform
                duration-300
                ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]

                group-hover:scale-110
              "
            />
          </button>
        </div>
      </div>

      {/* =====================================================
          CHAT AREA
      ====================================================== */}

      <main
        ref={chatBoxRef}
        className="
          relative

          pt-[100px]
          pb-[180px]

          px-4 sm:px-6

          w-[calc(100%-24px)]
          sm:w-[calc(100%-40px)]
          max-w-5xl

          mx-auto

          h-screen

          overflow-y-auto
          overflow-x-hidden

          border-x
          border-white/[0.06]

          bg-[#080c16]

          bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.10),transparent_38%),radial-gradient(circle_at_0%_50%,rgba(56,189,248,0.04),transparent_30%),radial-gradient(circle_at_100%_70%,rgba(99,102,241,0.04),transparent_30%)]
        "
      >
        {/* Doodle Background */}
        <div
          className="
            absolute
            inset-0
            pointer-events-none
            bg-[url('/chat-doodles.png')]
            bg-repeat
            bg-[length:420px_420px]
            opacity-[0.12]
            z-0
          "
        />

        {/* =================================================
            MESSAGES
        ================================================== */}

        {messages.map((message, index) => {
          const isCurrentUser = message.sender === currentUser;

          return (
            <div
            key={index}
            className={`
              flex
              relative
              z-10
              w-full
              animate-[messageIn_0.25s_ease-out]
              ${isCurrentUser ? "justify-end" : "justify-start"}
              mb-5
            `}
            >
              <div
                className={`
                  flex
                  items-end
                  gap-2
                  max-w-[80%]
                  sm:max-w-[65%]
                  ${isCurrentUser ? "flex-row-reverse" : "flex-row"}
                `}
              >
                {/* Avatar */}

                <div
                  className="
                    flex-shrink-0
                    h-9 w-9
                    rounded-full

                    bg-gradient-to-br
                    from-blue-500
                    to-purple-600

                    flex
                    items-center
                    justify-center

                    text-xs
                    font-bold

                    shadow-lg
                  "
                >
                  {message.sender?.charAt(0)?.toUpperCase()}
                </div>

                {/* Message Bubble */}

                <div
                  className={`
                    px-4 py-3
                    rounded-2xl
                    shadow-lg
                    border

                    ${
                      isCurrentUser
                        ? `
                          bg-[#2563eb]
                          border-blue-400/20
                          rounded-br-md
                        `
                        : `
                          bg-[#111827]
                          border-white/10
                          rounded-bl-md
                        `
                    }
                  `}
                >
                  {/* Sender */}

                  <p
                    className={`
                      text-xs
                      font-semibold
                      mb-1

                      ${isCurrentUser ? "text-blue-100" : "text-blue-400"}
                    `}
                  >
                    {message.sender}
                  </p>

                  {/* Content */}

                  {message.messageType === "FILE" ? (
                    message.fileType?.startsWith("image/") ? (
                      <div className="mt-2">
                        <img
                          src={`${baseURL}/api/v1/rooms/files/${message.fileId}`}
                          alt={message.fileName}
                          className="
                            max-w-[240px]
                            sm:max-w-[320px]
                            max-h-[320px]

                            rounded-xl

                            object-cover

                            border
                            border-white/10

                            shadow-md

                            cursor-pointer

                            hover:opacity-90

                            transition-opacity
                          "
                        />

                        <p
                          className="
                            text-xs
                            text-white/70
                            mt-2
                            break-all
                          "
                        >
                          {message.fileName}
                        </p>
                      </div>
                    ) : (
                      <a
                        href={`${baseURL}/api/v1/rooms/files/${message.fileId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="
                          mt-2

                          flex
                          items-center
                          gap-2

                          text-sm

                          text-blue-200

                          hover:text-white

                          underline

                          break-all
                        "
                      >
                        <Paperclip size={15} />
                        {message.fileName}
                      </a>
                    )
                  ) : (
                    <p
                      className={`
                        leading-relaxed
                        break-words
                        whitespace-pre-wrap
                        text-white
                        ${
                          /^[\p{Emoji}\p{Emoji_Component}\s]+$/u.test(message.content) &&
                          /\p{Emoji}/u.test(message.content)
                            ? "text-3xl"
                            : "text-sm sm:text-[15px]"
                        }
                      `}
                    >
                      {message.content}
                    </p>
                  )}

                  {/* Time */}

                  <p
                    className={`
                      text-[10px]
                      mt-1.5

                      ${isCurrentUser ? "text-blue-100/70" : "text-gray-500"}
                    `}
                  >
                    {timeAgo(message.timeStamp)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {/* =================================================
            TYPING INDICATOR
        ================================================== */}

        {typingUser && (
          <div className="flex items-center gap-2 mb-4 px-2">
            {/* Avatar */}

            <div
              className="
                flex
                h-8
                w-8
                flex-shrink-0

                items-center
                justify-center

                rounded-full

                bg-gradient-to-br
                from-blue-500
                to-purple-600

                text-[10px]
                font-bold
                text-white

                shadow-md
              "
            >
              {typingUser.charAt(0).toUpperCase()}
            </div>

            {/* Typing Bubble */}

            <div
              className="
                flex
                items-center
                gap-2

                rounded-2xl
                rounded-bl-md

                border
                border-white/10

                bg-[#111827]

                px-3
                py-2

                shadow-lg
              "
            >
              <span
                className="
                  text-xs
                  text-slate-400
                "
              >
                {typingUser} is typing
              </span>

              {/* Animated dots */}

              <span className="flex items-center gap-1">
                <span
                  className="
                    h-1.5
                    w-1.5
                    rounded-full
                    bg-blue-400

                    animate-bounce

                    [animation-delay:-0.3s]
                  "
                />

                <span
                  className="
                    h-1.5
                    w-1.5
                    rounded-full
                    bg-blue-400

                    animate-bounce

                    [animation-delay:-0.15s]
                  "
                />

                <span
                  className="
                    h-1.5
                    w-1.5
                    rounded-full
                    bg-blue-400

                    animate-bounce
                  "
                />
              </span>
            </div>
          </div>
        )}
      </main>

      {/* =====================================================
          MESSAGE COMPOSER
      ====================================================== */}

      <div
        className="
          fixed
          bottom-0
          left-0

          z-40

          w-full

          pb-5
          pt-3
          px-4

          bg-gradient-to-t
          from-[#050914]
          via-[#050914]/95
          to-transparent
        "
      >
        <div
          className="
            max-w-3xl
            mx-auto

            flex
            items-center
            gap-2

            p-2

            rounded-full

            bg-[#e4e4e7]

            text-[#3f3f46]

            ring-1
            ring-zinc-400

            shadow-[0_8px_30px_rgba(0,0,0,0.35)]

            transition-all
            duration-300

            focus-within:ring-2
            focus-within:ring-blue-500

            focus-within:shadow-[0_0_25px_rgba(59,130,246,0.2)]
          "
        >
          {/* =================================================
              MESSAGE INPUT
          ================================================== */}

          <input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              handleTyping(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendMessage();
              }
            }}
            type="text"
            placeholder="Type your message..."
            className="
              flex-1
              min-w-0

              bg-transparent

              outline-none
              border-none

              px-4
              py-3

              text-sm
              sm:text-base

              text-zinc-700

              placeholder:text-zinc-500
            "
          />

          {/* =================================================
              ATTACHMENT
          ================================================== */}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="
              flex-shrink-0
              h-11
              w-11
              rounded-full
              flex
              items-center
              justify-center
              bg-zinc-200
              text-zinc-600
              ring-1
              ring-zinc-300
              transition-all
              duration-300
              hover:bg-zinc-300
              hover:text-blue-600
              hover:rotate-[-8deg]
              hover:shadow-md
            "
          >
            <Paperclip size={20} />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-black/10 transition"
          >
            <Smile size={25} />
          </button>

          <div
          className={`absolute bottom-20 right-0 z-50 origin-bottom-right transition-all duration-300 ease-out ${
          showEmojiPicker
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-2 pointer-events-none"
        }`}
        >
        <EmojiPicker
        onEmojiClick={(emojiData) => {
          setInput((prev) => prev + emojiData.emoji);
          setShowEmojiPicker(false);
        }}
        theme="dark"
        width={Math.min(300, window.innerWidth - 32)}
        height={350}
      />
</div>

          {/* =================================================
              SEND BUTTON
          ================================================== */}

          <button
            onClick={sendMessage}
            type="button"
            className="
              group

              flex-shrink-0

              h-11
              w-11

              rounded-full

              flex
              items-center
              justify-center

              bg-[#2563eb]

              text-white

              shadow-[0_4px_12px_rgba(37,99,235,0.4)]

              transition-all
              duration-300

              hover:bg-[#1d4ed8]

              hover:scale-105

              hover:shadow-[0_6px_20px_rgba(37,99,235,0.55)]

              active:scale-95
            "
          >
            <Send
              size={19}
              className="
                transition-transform
                duration-300

                group-hover:translate-x-0.5
                group-hover:-translate-y-0.5
              "
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
