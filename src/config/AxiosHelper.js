import axios from "axios";
export const baseURL = "https://synapse-chat-application-backend.onrender.com";
//export const baseURL = "http://localhost:8080"
export const httpClient = axios.create({
  baseURL: baseURL,
});

