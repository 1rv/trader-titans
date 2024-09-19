import { useState, useEffect } from 'react';
import { Button, Input, Heading, Text } from '@chakra-ui/react';

import { formatScore } from '../../utils/formatting.js'

import SocketContext from "../../socket";
import React from 'react';

import toast from 'react-hot-toast';

//import loading circle

export default function Admin(props) {
  //import socket
  const socket = React.useContext(SocketContext);

  //0: setting topic/start round, 1: waiting for bidding, 2: waiting for players to setline/trade, 3: resolving price, 4: leaderboard
  //access admin's userID with props.id
  //props.room for old room
  const [adminState, setAdminState] = useState(0);
  const [topic, setTopic] = useState(''); //local
  const [marketMaker, setMarketMaker] = useState('');
  const [spread, setSpread] = useState(Number.MAX_SAFE_INTEGER);
  const [waitingFor, setWaitingFor] = useState('');
  const [marketString, setMarketString] = useState('');
  const [traderString, setTraderString] = useState('');
  const [resolvePrice, setResolvePrice] = useState('');
  const [topFive, setTopFive] = useState([]);
  const [roundStats, setRoundStats] = useState([]); //[buys, sells, mmPnL]

  
  socket.emit("requestRoom", props.room);


  if(props.behind) {
    socket.emit('getGameData', props.id);
    props.setBehind(false);
  }

  useEffect(() => {
    socket.on('giveGameData', (gameData) => {
      const gameState = gameData.state;
      // props.setRoom(gameData.room);
      //'setting-topic', 'bidding-down-spread', 
      //'market-maker-setting-line', 'trading', 'round-stats'
      switch(gameState) {
        case 'setting-topic':
          setAdminState(0)
          break;
        case 'bidding-down-spread':
          setTopic(gameData.topic);
          setSpread(gameData.spread);
          setMarketMaker(gameData.marketMakerUsername);
          setAdminState(1);
          break;
        case 'market-maker-setting-line':
          setWaitingFor('Waiting for Market Maker...');
          setAdminState(2);
          break;
        case 'trading':
          setWaitingFor('Waiting for Traders...');
          setMarketString("Market: "+ formatScore(gameData.bidPrice) + "@" + formatScore(gameData.askPrice));
          //TODO: figure out why setBidPrice not working
          setTraderString(gameData.tradesCt + " out of " + gameData.traderCt + " trades processed");
          setAdminState(2);
          break;
        case 'round-stats':
          setTopFive(gameData.topFive);
          setRoundStats([gameData.buys, gameData.sells, gameData.mmdiff]);
          setMarketMaker(gameData.marketMaker);
          setAdminState(3);
          break;
        default:
          //problem
          console.log(gameData);
          return;
      }
    });

    //change states and update display data upon server instruction
    socket.on('startBiddingAdmin', () => {
      console.log('tried to set admin state to 1');
      setAdminState(1);
    });
    socket.on('startLineSettingAdmin', () => {
      setWaitingFor('Waiting for Market Maker...');
      setAdminState(2);
    });

    socket.on('bidAccepted', (newSpread, userID, username) => {
      console.log('gotbidaccepted');
      setMarketMaker(username);
      setSpread(newSpread);
    });

    socket.on('lineSetAdmin', (bid, ask) => {
      setWaitingFor('Waiting for Traders...');
      setMarketString("Market: "+ String(bid)+ "@" + String(ask));
    });
    socket.on('tradeRecievedAdmin', (tradesCt, traderCt) => {
      setTraderString(tradesCt + " out of " + traderCt + " trades processed");
    });
    socket.on('roundResultsAdmin', (topFive, roundStats, marketMaker) => {
      setTopFive(topFive);
      setRoundStats(roundStats);
      setAdminState(3);
      setMarketMaker(marketMaker);
    });

    socket.on('restartRoundAdmin', () => {
      setTopic('');
      setMarketMaker('');
      setSpread(Number.MAX_SAFE_INTEGER);
      setAdminState(0);
      setTraderString('');
      setMarketString('')
    });
    
  }, [socket]);



  const startBidding = () => {
    socket.emit('startBidding', props.id, topic);
    //socket.on('startBiddingAdmin', () => {
    //  setAdminState(1);
    //});
  }

  const startLineSetting = () => {
    if(!marketMaker) {
      toast.error('no market maker');
      return;
    }
    socket.emit('startLineSetting', props.id);
    //socket.on('startLineSettingAdmin', () => {
    //  setWaitingFor('Waiting for Market Maker...');
    //  setAdminState(2);
    //});
  }

  const tradingDone = () => {
    if(resolvePrice.length === 0) {
      toast.error('no resolve price');
      return;
    }

    let rp = parseFloat(resolvePrice);
    if (!isNaN(rp)) {
      socket.emit('tradingDone', rp, props.id);
    } else {
      toast.error('resolve price not a number');
    }
  }

  const restartRound = () => {
    socket.emit('restartRound', props.id);
  }

  var display;

  //0: setting topic/start round, 1: waiting for bidding, 2: waiting for players to setline/trade, 3: leaderboard
  if (adminState === 0) {
    display = 
      <>
        <Heading as='h1' size='4xl' noOfLines={1} p='50px'>Topic:</Heading>
        <Input size='lg' variant='outline' width='250px' _placeholder={{color: '#D8DEE9'}} id="topic" type="text" placeholder="topic" autoFocus={true} value={topic} onChange={e=> setTopic(e.target.value)}/>
        <Button size = 'md' width='125px' variant="solid" colorScheme = 'blue' onClick = {startBidding}>Start Bidding</Button>
      </>
  } else if (adminState === 1) {
    //socket.on('bidAccepted', (newSpread, username) => {
    //  console.log('gotbidaccepted');
    //  setMarketMaker(username);
    //  setSpread(newSpread);
    //});
    display = 
      <>
        <Heading as='h1' size='4xl' noOfLines={3} p='50px'>Topic: {topic}</Heading>
        <Heading as='h2' size='2xl' noOfLines={1} p='30px'>Spread: <code>{spread === 9007199254740991 ? '-' : spread}</code></Heading> 
        <Heading as='h2' size='2xl' noOfLines={1} p='10px'>By: <code>{marketMaker}</code></Heading>
        <Button size='md' width='125px' variant='solid' colorScheme='blue' onClick = {startLineSetting} mb='50px'>End Bidding</Button>
      </>
  } else if (adminState === 2) {
    //socket.on('lineSetAdmin', (bid, ask) => {
    //  setBidPrice(bid);
    //  setAskPrice(ask);
    //  setWaitingFor('Waiting for Traders...');
    //  setMarketString("Market: "+ String(bid)+ "@" + String(ask));
    //});
    //socket.on('tradeRecievedAdmin', (tradesCt, traderCt) => {
    //  setTraderString(tradesCt + " out of " + traderCt + " trades processed");
    //});
    //socket.on('roundResultsAdmin', (topFive, roundStats) => {
    //  setTopFive(topFive);
    //  setRoundStats(roundStats);
    //  setAdminState(3);
    //});
    display = 
      <>
        <Heading as='h1' size='4xl' noOfLines={3} p='50px'>Topic: {topic}</Heading>
        <Heading as='h2' size='2xl' noOfLines={1} p='30px'>{waitingFor}</Heading>
        <Heading as='h3' size='lg' noOfLines={1} p='10px'>{marketString}</Heading>
        <Heading as='h3' size='lg' noOfLines={1} p='10px'>{traderString}</Heading>
        <Input size='lg' variant='outline' width='250px' _placeholder={{color: '#D8DEE9'}} id="Resolve Price" type="text" placeholder="Resolve Price" autoFocus={true} onChange={e=> setResolvePrice(e.target.value)}/> 
        <Button size='md' width='125px' variant="solid" colorScheme='blue' onClick = {tradingDone}>Resolve</Button>
      </>
  } else if (adminState === 3) {
    //socket.on('restartRoundAdmin', () => {
    //  setTopic('');
    //  setMarketMaker('');
    //  setSpread(Number.MAX_SAFE_INTEGER);
    //  setAdminState(0);
    //  setTraderString('');
    //  setMarketString('')
    //});
    //there must be a better way of doing this

    let roundData = <>
      <Heading as='h2' size='2xl' noOfLines={1} p='20px'>Round Stats:</Heading>
      buys: {roundStats[0]}
      <br></br>
      sells: {roundStats[1]}
      <br></br>
      <Text p='20px'> Market Maker ({marketMaker}) PnL: {formatScore(roundStats[2])} </Text>
      <br></br>
      <Button size='md' width='125px' variant="solid" colorScheme='purple' onClick = {restartRound}>Next Round</Button>
    </>

    let scoreDisp = <>
      {topFive.map((player, index) => (
        <div key={index}>
          {player.username}: {formatScore(player.score)}
          <br></br>
        </div>
      ))}
    </>
    display = <>
      <Heading as='h1' size='4xl' noOfLines={1} p='50px'>Leaderboard</Heading>
      {scoreDisp}
      {roundData}
    </>
  }

  return (
    display
  )
}
