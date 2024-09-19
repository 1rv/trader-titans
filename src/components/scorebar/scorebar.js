import styled from 'styled-components';
import { formatScore } from '../../utils/formatting.js'

export default function Scorebar(props) {
  return (
    <>
      <ScorebarContainer>
        <span style={{display: 'inline-block', float:'left', color:'black', verticalAlign:'center', marginTop:'0.1em', marginLeft: '0.3em', fontSize:'1.3em', whiteSpace: 'nowrap'}}>Score: {formatScore(props.scr)}</span>
        <span style={{display: 'inline-block', float:'right', textAlign:'right', color:'black', verticalAlign:'center', marginTop:'0.1em', marginRight: '0.3em', fontSize:'1.3em', fontWeight:'700', whiteSpace: 'nowrap'}}>{props.usn}</span>
      </ScorebarContainer>
    </>
  )
}

// default height should be 3rem... 10 for testing
const ScorebarContainer = styled.div`
  height: 2em;
  width: 100%;
  position: fixed;
  z-index: 1;
  bottom: 0;
  left : 0;
  background-color: #d8dee9;
  overflow-x: hidden;
  overflow-y: hidden;
  flex-direction: row;
  align-itmes: center;
`;
