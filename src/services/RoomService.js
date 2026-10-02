import { httpClient } from "../config/AxiosHelper";


export const createRoomApi = async (roomDetail, username) => {
  const response = await httpClient.post(
    `/api/v1/rooms?username=${encodeURIComponent(username)}`,
    roomDetail,
    {
      headers: {
        "Content-Type": "text/plain",
      },
    }
  );

  return response.data;
};

export const joinChatApi = async (roomId, username) => {
  const response = await httpClient.get(
    `/api/v1/rooms/${encodeURIComponent(roomId)}?username=${encodeURIComponent(username)}`
  );

  return response.data;
};

export const getMessagess = async (roomId, size = 50, page = 0) => {
  const response = await httpClient.get(
    `/api/v1/rooms/${roomId}/messages?size=${size}&page=${page}`
  );
  return response.data;
};

export const clearChat = async (roomId) => {
  const response = await httpClient.delete(
    `/api/v1/rooms/${roomId}/messages`
  );

  return response.data;
};

export const uploadFile = async (roomId, file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await httpClient.post(
        `/api/v1/rooms/${roomId}/files`,
        formData
    );

    return response.data;
};

export const deleteRoom = async (roomId) => {
  const response = await httpClient.delete(`/api/v1/rooms/${roomId}`);
  return response.data;
};

export const getRoomMembers = async (roomId) => {
  const response = await httpClient.get(
    `/api/v1/rooms/${encodeURIComponent(roomId)}/members`
  );

  return response.data;
};