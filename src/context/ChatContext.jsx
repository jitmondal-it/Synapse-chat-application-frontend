import { createContext, useContext, useState } from "react";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [roomId, setRoomId] = useState("");
  const [currentUser, setCurrentUser] = useState("");
  const [connected, setConnected] = useState(false);
  const [roomMembers, setRoomMembers] = useState([]);
  const [roomCreator, setRoomCreator] = useState("");

  return (
    <ChatContext.Provider
      value={{
        roomId,
        currentUser,
        connected,
        roomMembers,
        roomCreator,
        setRoomId,
        setCurrentUser,
        setConnected,
        setRoomMembers,
        setRoomCreator,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

const useChatContext = () => useContext(ChatContext);
export default useChatContext;
