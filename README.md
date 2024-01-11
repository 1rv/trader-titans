# Trader Titans

You can play the game [here](https://tradertitans.netlify.app/).

This project was inspired by trading game I played at Maroon Capital at UChicago, developed as my Winter Break 2023 project. We used an extremely clunky spreadsheet to play the game, whereas an online implementation that functions similarly to Kahoot or Quiplash would feel much smoother.

This is my first webapp I've written, much of the code should be refactored, and some of the game/server communication is somewhat clunky, but should be fixed relatively soon. Similarly, the graphics of this game are very much in progress.

![](./screenshots/admin1.png)
![](./screenshots/player1.png)
![](./screenshots/rules.png)

## Links
- Live Deployment via Heroku (server side) and [Netlify](https://tradertitans.netlify.app/)

## Project Details
This project is built with

- [React](https://reactjs.org)
- [Styled Components](https://styled-components.com)
- [Socket.IO](https://socket.io)


## Available Scripts

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app). Anything scripts you can run there you can run here.


## client setup

After installs, in the project directory, you can run:

```
npm start
```

Runs the app in the development mode.

Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## admin setup

After installs, navigate to the server directory. By default, nodemon is used, and runs on port 4000.

```
cd server
npm start
```
