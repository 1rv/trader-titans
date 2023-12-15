import { MouseEventHandler } from 'react';
import { useState } from 'react';

import styled from 'styled-components';

import qIcon from '../../assets/question-mark.svg';
import xIcon from '../../assets/close.svg';


export default function Rules() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleRules = () => {
    setIsOpen(!isOpen);
  }

  return (
    <>
      <ButtonContainer src={qIcon} alt='' height='8%' width='8%' onClick={toggleRules} />
      {isOpen ? (
        <> 
          <RulesContainer>
            <p>Rules</p>
            <CloseButtonContainer src={xIcon} alt='' height='40' width='40' onClick={toggleRules} /> 
            <h3>Stage 0: Topic</h3>
            <h4>The admin will choose a topic of incomplete information, such as "How much cash is in my wallet?" or "What is the population of Mongolia?" or "What is my battery percentage?" Players will then pretend that the question is like a stock market.</h4>
            <h3>Stage 1: Bidding</h3>
            <h4>Players will take turns bidding down the 'spread'. You must bid 10% lower than the last bid. In general, the lower the spread gets, the more risk there is to win the bid.</h4>
            <h3>Stage 2: Market Making</h3>
            <h4>The player who won the bidding is the market maker. They will set a 'bid' price <code>x</code> and an 'ask' price <code>y</code>, where the spread <code>s</code> is such that <code> x + s = y.</code> The difference between bid and ask is the spread.</h4>
            <h3>Stage 3: Trading</h3>
            <h4>The remaining players will trade against the market maker, either 'selling' at price <code>x</code> or 'buying' at price <code>y</code>.</h4>
            <h3>Stage 4: Resolution</h3>
            <h4>The admin will enter the resolution price <code>r</code>, the <b>actual result of the question</b>. Sellers will purchase at price <code>r</code> and sell at <code>x</code>, and make profit when <code>r &lt; x</code>. Buyers will purchase at price <code>y</code> and sell at <code>r</code>, and make profit if <code> y &lt; r</code>, and therefore the market maker will take profit when the opposite happens. If <code>x &lt; r &lt; y</code>, no trader can make profit, and the market maker will win every trade! </h4>
          </RulesContainer>
        </>
      ) : (<> </>)}
    </>
  );
}

const ButtonContainer = styled.img`
  @media (min-width: 400px) {
    position: absolute;
    top: 4%;
    right: 2%;
    transition: transform .2s;
  }

  &:hover {
    transform: scale(1.5);
  }
`;

const CloseButtonContainer = styled.img`
  @media (min-width: 400px) {
    position: absolute;
    top: 2rem;
    right: 2rem;
    transition: transform .2s;
  }

  &:hover {
    transform: scale(1.5);
  }
`;


const RulesContainer = styled.div`
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  padding-inline: 2rem;
  width: 35rem;
  height: 45rem;
  z-index:100;

  p {
    font-size: 3rem;
    font-weight: 700;
    color: black;
    text-transform: uppercase;
    text-align: left;
    line-height: 0.5rem;
  }
  
  h3 {
    font-size: 1.5rem;
    font-weight: 700;
    color: black;
    text-transform: uppercase;
    text-align: left;
    line-height: 0.1rem;
  }
  h4 {
    font-size: 1rem;
    font-weight: 100;
    color: black;
    text-align: left;
  }
`;
