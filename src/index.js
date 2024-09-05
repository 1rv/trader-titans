import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

import { ChakraProvider } from '@chakra-ui/react'

import { extendTheme } from "@chakra-ui/react";


import SocketContext from "./socket";
//import * as io from 'socket.io-client';
import io from 'socket.io-client'

const theme = extendTheme({
  styles: {
    global: {
      h1: {
        fontSize: '3xl',
        fontWeight: 'bold',
      },
      h2: {
        fontSize: '2xl',
        fontWeight: 'bold',
      },
      h3: {
        fontSize: 'lg'
      },
      h4: {
        fontSize: 'md'
      }
    }
  }
});

const socket = io(
  process.env.NODE_ENV === 'production' ? `${process.env.REACT_APP_SERVER_URL}` : 'http://localhost:4000',
  { autoConnect : false },
);

const sessionID = sessionStorage.getItem("sessionID");
if (sessionID) {
  socket.auth = {sessionID};
}

socket.connect();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <SocketContext.Provider value={socket}>
    <ChakraProvider theme = {theme}>
      <App />
    </ChakraProvider>
  </SocketContext.Provider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
