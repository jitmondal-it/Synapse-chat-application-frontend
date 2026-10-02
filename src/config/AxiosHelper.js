import axios from "axios";
export const baseURL = "https://synapse-chat-application-backend.onrender.com";
export const httpClient = axios.create({
  baseURL: baseURL,
});
