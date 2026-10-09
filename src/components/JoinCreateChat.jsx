import { useState } from "react";
//import chatIcon from "../assets/chat.png";
import { MessageCircle, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { createRoomApi, joinChatApi } from "../services/RoomService";
import useChatContext from "../context/ChatContext";
import { useNavigate } from "react-router";
const JoinCreateChat = () => {

  const [isCreateRoom, setIsCreateRoom] = useState(false);
  const [detail, setDetail] = useState({
    roomId: "",
    userName: "",
  });

  const { roomId, userName, setRoomId, setCurrentUser, setConnected } =
    useChatContext();
  const navigate = useNavigate();

  function handleFormInputChange(event) {
    setDetail({
      ...detail,
      [event.target.name]: event.target.value,
    });
  }

  function validateForm() {
    if (detail.roomId === "" || detail.userName === "") {
      toast.error("Invalid Input !!");
      return false;
    }
    return true;
  }

  async function joinChat() {
    if (validateForm()) {
      //join chat

      try {
        const room = await joinChatApi(detail.roomId,detail.userName);
        toast.success("joined..");
        setCurrentUser(detail.userName);
        setRoomId(room.roomId);
        setConnected(true);
        navigate("/chat");
      } catch (error) {
        if (error.status == 400) {
          toast.error(error.response.data);
        } else {
          toast.error("Error in joining room");
        }
        console.log(error);
      }
    }
  }


  async function createRoom() {
    if (validateForm()) {
      //create room
      console.log(detail);
      // call api to create room on backend
      try {
        const response = await createRoomApi(detail.roomId,detail.userName);
        console.log(response);
        toast.success("Room Created Successfully !!");
        //join the room
        setCurrentUser(detail.userName);
        setRoomId(response.roomId);
        setConnected(true);

        navigate("/chat");

        //forward to chat page...
      } catch (error) {
        console.log(error);
        if (error.status == 400) {
          toast.error("Room  already exists !!");
        } else {
          toast("Error in creating room");
        }
      }
    }
  }

  return (
  <div
  className="min-h-screen w-full flex items-center justify-center px-4
    bg-[#111111]
    bg-[linear-gradient(32deg,rgba(8,8,8,0.74)_30px,transparent)]
    bg-[size:60px_60px]
    bg-[-5px_-5px]
  "
>



    <div className="flex w-full max-w-[400px] flex-col items-center">

      {/* ================= MODE SWITCH ================= */}

      <div
      className="
        relative
        flex
        items-center
        w-full
        max-w-[400px]
        h-[56px]
        p-1
        mb-7
        rounded-full
        border-2
        border-[#323232]
        bg-white
        shadow-[4px_4px_#323232]
      "
    >
  {/* Sliding active background */}
  <div
    className={`
      absolute
      top-1
      left-1

      h-[48px]
      w-[calc(50%-4px)]

      rounded-full

      bg-[#323232]

      transition-transform
      duration-500
      ease-in-out

      ${
        isCreateRoom
          ? "translate-x-full"
          : "translate-x-0"
      }
    `}
  />

  {/* JOIN ROOM */}
  <button
    type="button"
    onClick={() => setIsCreateRoom(false)}
    className={`
      relative
      z-10

      flex-1
      min-w-0
      h-[48px]

      rounded-full

      text-sm
      font-bold

      transition-colors
      duration-300

      ${
        !isCreateRoom
          ? "text-white"
          : "text-[#323232]"
      }
    `}
  >
    Join Room
  </button>

  {/* CREATE ROOM */}
  <button
    type="button"
    onClick={() => setIsCreateRoom(true)}
    className={`
      relative
      z-10

     flex-1
      min-w-0
      h-[48px]

      rounded-full

      text-sm
      font-bold

      transition-colors
      duration-300

      ${
        isCreateRoom
          ? "text-white"
          : "text-[#323232]"
      }
    `}
  >
    Create Room
  </button>
</div>


      {/* ================= FLIP CARD ================= */}

      <div
        className="
        w-full
        max-w-[400px]
        h-[480px]
        [perspective:1200px]
      "
      >

        <div
          className={`
            relative
            w-full
            h-full

            transition-transform
            duration-700
            ease-in-out

            [transform-style:preserve-3d]

            ${
              isCreateRoom
                ? "[transform:rotateY(180deg)]"
                : "[transform:rotateY(0deg)]"
            }
          `}
        >

          {/* =================================================
              JOIN ROOM
          ================================================= */}

          <div
            className="
              absolute
              inset-0

              flex
              flex-col
              justify-center
              items-center

              px-5
              sm:px-10

              rounded-2xl

              border-2
              border-[#323232]

              bg-[#d3d6db]

              shadow-[6px_6px_#323232]

              [backface-visibility:hidden]
            "
          >

            {/* Icon */}
          <div
            className="
              flex
              items-center
              justify-center

              w-16
              h-16

              mb-4

              rounded-2xl

              bg-[#323232]

              shadow-[4px_4px_#2d8cf0]
            "
          >
            <MessageCircle
              size={32}
              strokeWidth={2.5}
              className="text-white"
            />
          </div>


            {/* Heading */}
            <h1
              className="
                mb-1

                text-[32px]
                font-black

                text-[#323232]

                text-center
              "
            >
              Join Room
            </h1>


            <p
              className="
                mb-6

                text-base
                font-medium

                text-[#666]

                text-center
              "
            >
              Enter your details to join a conversation
            </p>


            <form
              className="w-full flex flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                joinChat();
              }}
            >

              {/* Name */}
              <input
                name="userName"
                type="text"
                placeholder="Your name"

                value={detail.userName}
                onChange={handleFormInputChange}

                className="
                  w-full
                  h-14

                  rounded-xl

                  border-2
                  border-[#323232]

                  bg-white

                  shadow-[4px_4px_#323232]

                  px-5
                  

                  text-[15px]
                  font-semibold

                  text-[#323232]

                  outline-none

                  placeholder:text-[#777]

                  transition-all

                  focus:border-[#2d8cf0]
                  focus:shadow-[5px_5px_#2d8cf0]
                "
              />


              {/* Room ID */}
              <input
                name="roomId"
                type="text"
                placeholder="Room ID"

                value={detail.roomId}
                onChange={handleFormInputChange}

                className="
                  w-full
                  h-14

                  rounded-xl

                  border-2
                  border-[#323232]

                  bg-white

                  shadow-[4px_4px_#323232]

                  px-4

                  text-[15px]
                  font-semibold

                  text-[#323232]

                  outline-none

                  placeholder:text-[#777]

                  transition-all

                  focus:border-[#2d8cf0]
                  focus:shadow-[5px_5px_#2d8cf0]
                "
              />


              {/* Join Button */}
              <button
                type="submit"

                className="
                  w-full
                  h-14

                  mt-2

                  rounded-xl

                  border-2
                  border-[#323232]

                  bg-[#323232]

                  text-white

                  text-[16px]
                  font-bold

                  shadow-[4px_4px_#2d8cf0]

                  transition-all

                  hover:-translate-y-1
                  hover:shadow-[6px_6px_#2d8cf0]

                  active:translate-x-[3px]
                  active:translate-y-[3px]
                  active:shadow-none
                "
              >
                Join Room →
              </button>

            </form>

          </div>


          {/* =================================================
              CREATE ROOM
          ================================================= */}

          <div
            className="
              absolute
              inset-0

              flex
              flex-col
              justify-center
              items-center

              px-5
              sm:px-10

              rounded-2xl

              border-2
              border-[#323232]

              bg-[#d3d6db]

              shadow-[6px_6px_#323232]

              [backface-visibility:hidden]

              [transform:rotateY(180deg)]
            "
          >

            {/* Icon */}
            <div
              className="
                flex
                items-center
                justify-center

                w-16
                h-16

                mb-4

                rounded-2xl

                bg-[#323232]

                shadow-[4px_4px_#f97316]
              "
            >
              <Plus
                size={32}
                strokeWidth={2.5}
                className="text-white"
              />
            </div>


            {/* Heading */}
            <h1
              className="
                mb-1

                text-[28px]
                font-black

                text-[#323232]

                text-center
              "
            >
              Create Room
            </h1>


            <p
              className="
                mb-6

                text-sm
                font-medium

                text-[#666]

                text-center
              "
            >
              Create a new room and invite your friends
            </p>


            <form
              className="w-full flex flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                createRoom();
              }}
            >

              {/* Name */}
              <input
                name="userName"
                type="text"
                placeholder="Your name"

                value={detail.userName}
                onChange={handleFormInputChange}

                className="
                  w-full
                  h-12

                  rounded-xl

                  border-2
                  border-[#323232]

                  bg-white

                  shadow-[4px_4px_#323232]

                  px-4

                  text-[15px]
                  font-semibold

                  text-[#323232]

                  outline-none

                  placeholder:text-[#777]

                  transition-all

                  focus:border-[#f97316]
                  focus:shadow-[5px_5px_#f97316]
                "
              />


              {/* New Room ID */}
              <input
                name="roomId"
                type="text"
                placeholder="New Room ID"

                value={detail.roomId}
                onChange={handleFormInputChange}

                className="
                  w-full
                  h-12

                  rounded-xl

                  border-2
                  border-[#323232]

                  bg-white

                  shadow-[4px_4px_#323232]

                  px-4

                  text-[15px]
                  font-semibold

                  text-[#323232]

                  outline-none

                  placeholder:text-[#777]

                  transition-all

                  focus:border-[#f97316]
                  focus:shadow-[5px_5px_#f97316]
                "
              />


              {/* Create Button */}
              <button
                type="submit"

                className="
                  w-full
                  h-12

                  mt-2

                  rounded-xl

                  border-2
                  border-[#323232]

                  bg-[#323232]

                  text-white

                  text-[16px]
                  font-bold

                  shadow-[4px_4px_#f97316]

                  transition-all

                  hover:-translate-y-1
                  hover:shadow-[6px_6px_#f97316]

                  active:translate-x-[3px]
                  active:translate-y-[3px]
                  active:shadow-none
                "
              >
                Create Room →
              </button>

            </form>

          </div>

        </div>
      </div>

    </div>
  </div>
); }

export default JoinCreateChat;
