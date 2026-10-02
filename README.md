# Synapse - Chat Application Frontend

Synapse is a real-time chat application that I built using React. The frontend provides a simple interface for creating and joining chat rooms, sending messages, sharing files, and communicating with other users in real time.

This project was built to learn and work with real-time communication along with a Spring Boot backend.

## Features

- Create a chat room
- Join an existing chat room
- Real-time messaging
- Typing indicator
- View room members
- Share files and images
- Clear chat messages
- Leave a room
- Delete a room
- Responsive chat interface

## Tech Stack

- React
- Vite
- Tailwind CSS
- Axios
- STOMP
- SockJS
- React Router

## How it works

The frontend communicates with the Spring Boot backend in two ways.

REST APIs are used for operations such as:

- Creating a room
- Joining a room
- Getting room members
- Uploading files
- Managing rooms

WebSocket with STOMP is used for real-time features such as:

- Sending messages
- Receiving messages
- Typing indicators

The application connects to the backend and updates the chat without requiring the page to be refreshed.

## Project Structure

```text
chat-app-frontend/
│
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── ChatPage.jsx
│   │   ├── FloatingSidebar.jsx
│   │   └── JoinCreateChat.jsx
│   │
│   ├── config/
│   ├── context/
│   ├── services/
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
│
├── .gitignore
├── package.json
├── package-lock.json
├── tailwind.config.js
└── vite.config.js