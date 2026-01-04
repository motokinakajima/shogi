class TimeManager {
  constructor(config) {
    this.mode = config.mode || 'sudden_death';
    this.initialTime = config.initialTime || 600000;
    this.byoyomiTime = config.byoyomiTime || 30000;
    this.fischerIncrement = config.fischerIncrement || 0;
    
    this.senteTimeLeft = this.initialTime;
    this.goteTimeLeft = this.initialTime;
    this.senteInByoyomi = false;
    this.goteInByoyomi = false;
    
    this.lastMoveTimestamp = null;
    this.currentPlayer = 'sente';
  }
  
  startTurn(player) {
    this.currentPlayer = player;
    this.lastMoveTimestamp = Date.now();
  }
  
  consumeTime() {
    if (!this.lastMoveTimestamp) return null;
    
    const elapsed = Date.now() - this.lastMoveTimestamp;
    const player = this.currentPlayer;
    
    if (player === 'sente') {
      if (this.senteInByoyomi) {
        if (elapsed > this.byoyomiTime) {
          return 'timeout';
        }
      } else {
        this.senteTimeLeft -= elapsed;
        if (this.senteTimeLeft <= 0) {
          if (this.mode === 'byoyomi') {
            this.senteInByoyomi = true;
            this.senteTimeLeft = 0;
          } else {
            return 'timeout';
          }
        }
      }
      
      if (this.mode === 'fischer' && !this.senteInByoyomi) {
        this.senteTimeLeft += this.fischerIncrement;
      }
    } else {
      if (this.goteInByoyomi) {
        if (elapsed > this.byoyomiTime) {
          return 'timeout';
        }
      } else {
        this.goteTimeLeft -= elapsed;
        if (this.goteTimeLeft <= 0) {
          if (this.mode === 'byoyomi') {
            this.goteInByoyomi = true;
            this.goteTimeLeft = 0;
          } else {
            return 'timeout';
          }
        }
      }
      
      if (this.mode === 'fischer' && !this.goteInByoyomi) {
        this.goteTimeLeft += this.fischerIncrement;
      }
    }
    
    return null;
  }
  
  getState() {
    const now = Date.now();
    const currentElapsed = this.lastMoveTimestamp ? now - this.lastMoveTimestamp : 0;
    
    let senteDisplay = this.senteTimeLeft;
    let goteDisplay = this.goteTimeLeft;
    
    if (this.currentPlayer === 'sente') {
      if (this.senteInByoyomi) {
        senteDisplay = Math.max(0, this.byoyomiTime - currentElapsed);
      } else {
        senteDisplay = Math.max(0, this.senteTimeLeft - currentElapsed);
      }
    } else if (this.currentPlayer === 'gote') {
      if (this.goteInByoyomi) {
        goteDisplay = Math.max(0, this.byoyomiTime - currentElapsed);
      } else {
        goteDisplay = Math.max(0, this.goteTimeLeft - currentElapsed);
      }
    }
    
    return {
      senteTimeLeft: Math.round(senteDisplay),
      goteTimeLeft: Math.round(goteDisplay),
      senteInByoyomi: this.senteInByoyomi,
      goteInByoyomi: this.goteInByoyomi,
      mode: this.mode,
      byoyomiTime: this.byoyomiTime
    };
  }
  
  serialize() {
    return {
      mode: this.mode,
      initialTime: this.initialTime,
      byoyomiTime: this.byoyomiTime,
      fischerIncrement: this.fischerIncrement,
      senteTimeLeft: this.senteTimeLeft,
      goteTimeLeft: this.goteTimeLeft,
      senteInByoyomi: this.senteInByoyomi,
      goteInByoyomi: this.goteInByoyomi,
      lastMoveTimestamp: this.lastMoveTimestamp,
      currentPlayer: this.currentPlayer
    };
  }
  
  static deserialize(data) {
    const tm = new TimeManager({
      mode: data.mode,
      initialTime: data.initialTime,
      byoyomiTime: data.byoyomiTime,
      fischerIncrement: data.fischerIncrement
    });
    tm.senteTimeLeft = data.senteTimeLeft;
    tm.goteTimeLeft = data.goteTimeLeft;
    tm.senteInByoyomi = data.senteInByoyomi;
    tm.goteInByoyomi = data.goteInByoyomi;
    tm.lastMoveTimestamp = data.lastMoveTimestamp;
    tm.currentPlayer = data.currentPlayer;
    return tm;
  }
  
  getTimeControl() {
    const minutes = Math.floor(this.initialTime / 60000);
    const byoyomiSeconds = Math.floor(this.byoyomiTime / 1000);
    
    if (this.mode === 'sudden_death') {
      return `分切れ負け`;
    } else if (this.mode === 'byoyomi') {
      return `分秒`;
    } else if (this.mode === 'fischer') {
      const increment = Math.floor(this.fischerIncrement / 1000);
      return `分+秒`;
    }
    return 'unknown';
  }
}

export default TimeManager;
