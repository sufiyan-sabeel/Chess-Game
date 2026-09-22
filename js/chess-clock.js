class ChessClock {
    constructor() {
        this.TIME_CONTROLS = {
            '1+0':   { minutes: 1,  increment: 0  },
            '2+1':   { minutes: 2,  increment: 1  },
            '3+0':   { minutes: 3,  increment: 0  },
            '3+2':   { minutes: 3,  increment: 2  },
            '5+0':   { minutes: 5,  increment: 0  },
            '5+3':   { minutes: 5,  increment: 3  },
            '10+0':  { minutes: 10, increment: 0  },
            '10+5':  { minutes: 10, increment: 5  },
            '15+10': { minutes: 15, increment: 10 },
            '30+0':  { minutes: 30, increment: 0  },
        };

        this.whiteTime = 0;
        this.blackTime = 0;
        this.activeColor = null;
        this.running = false;
        this.paused = false;
        this.gameStarted = false;
        this.gameEnded = false;
        this.moveCount = 0;
        this.increment = 0;

        this._intervalId = null;
        this._lastTick = 0;
        this._selectedControl = '5+3';

        this._whiteEl = null;
        this._blackEl = null;
        this._whiteLabelEl = null;
        this._blackLabelEl = null;
        this._onTimeout = null;

        this._audioCtx = null;
    }

    bindDOM(whiteClockId, blackClockId, whiteLabelId, blackLabelId) {
        this._whiteEl = document.getElementById(whiteClockId);
        this._blackEl = document.getElementById(blackClockId);
        this._whiteLabelEl = whiteLabelId ? document.getElementById(whiteLabelId) : null;
        this._blackLabelEl = blackLabelId ? document.getElementById(blackLabelId) : null;
    }

    setOnTimeout(callback) {
        this._onTimeout = callback;
    }

    setSelectedControl(controlKey) {
        if (this.TIME_CONTROLS[controlKey]) {
            this._selectedControl = controlKey;
        }
    }

    getSelectedControl() {
        return this._selectedControl;
    }

    getControlSettings(key) {
        return this.TIME_CONTROLS[key || this._selectedControl];
    }

    startGame() {
        const tc = this.getControlSettings();
        this.whiteTime = tc.minutes * 60 * 1000;
        this.blackTime = tc.minutes * 60 * 1000;
        this.increment = tc.increment * 1000;
        this.activeColor = 'white';
        this.running = true;
        this.paused = false;
        this.gameStarted = true;
        this.gameEnded = false;
        this.moveCount = 0;

        this._lastTick = performance.now();
        this._startInterval();
        this._playSound('game-start');
        this._render();
    }

    onMoveCompleted(color) {
        if (!this.running || this.gameEnded) return;
        if (color !== this.activeColor) return;

        this.moveCount++;

        if (this.activeColor === 'white') {
            this.whiteTime = Math.max(0, this.whiteTime + this.increment);
        } else {
            this.blackTime = Math.max(0, this.blackTime + this.increment);
        }

        this._switchActive();
        this._render();
    }

    _switchActive() {
        this.activeColor = this.activeColor === 'white' ? 'black' : 'white';
        this._lastTick = performance.now();
    }

    pause() {
        if (!this.running || this.gameEnded) return;
        this._tick();
        this.paused = true;
        this.running = false;
        this._stopInterval();
        this._render();
    }

    resume() {
        if (!this.paused || this.gameEnded) return;
        this.paused = false;
        this.running = true;
        this._lastTick = performance.now();
        this._startInterval();
        this._render();
    }

    reset() {
        const tc = this.getControlSettings();
        this.whiteTime = tc.minutes * 60 * 1000;
        this.blackTime = tc.minutes * 60 * 1000;
        this.activeColor = 'white';
        this.running = false;
        this.paused = false;
        this.gameStarted = false;
        this.gameEnded = false;
        this.moveCount = 0;
        this._stopInterval();
        this._render();
    }

    stop() {
        this.running = false;
        this.paused = false;
        this.gameEnded = true;
        this._stopInterval();
    }

    forceStop() {
        this._stopInterval();
        this.running = false;
        this.paused = false;
        this.gameEnded = true;
        this.activeColor = null;
    }

    getRemaining(color) {
        return color === 'white' ? this.whiteTime : this.blackTime;
    }

    getFormatted(color) {
        return this._formatTime(this.getRemaining(color));
    }

    _formatTime(ms) {
        if (ms <= 0) return '00:00';
        const totalSeconds = Math.ceil(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    }

    _tick() {
        if (!this.running || this.gameEnded || !this.activeColor) return;

        const now = performance.now();
        const elapsed = now - this._lastTick;
        this._lastTick = now;

        if (this.activeColor === 'white') {
            this.whiteTime -= elapsed;
            if (this.whiteTime <= 0) {
                this.whiteTime = 0;
                this._handleTimeout('white');
                return;
            }
        } else {
            this.blackTime -= elapsed;
            if (this.blackTime <= 0) {
                this.blackTime = 0;
                this._handleTimeout('black');
                return;
            }
        }

        this._render();
    }

    _handleTimeout(color) {
        this.stop();
        this._playSound('timeout');
        this._render();
        if (this._onTimeout) {
            this._onTimeout(color);
        }
    }

    _startInterval() {
        this._stopInterval();
        this._intervalId = setInterval(() => this._tick(), 50);
    }

    _stopInterval() {
        if (this._intervalId !== null) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
    }

    _render() {
        if (!this._whiteEl || !this._blackEl) return;

        this._whiteEl.textContent = this._formatTime(this.whiteTime);
        this._blackEl.textContent = this._formatTime(this.blackTime);

        const wParent = this._whiteEl.closest('.clock-container');
        const bParent = this._blackEl.closest('.clock-container');

        if (wParent) {
            wParent.classList.toggle('clock-active', this.activeColor === 'white' && this.running);
            wParent.classList.toggle('clock-inactive', this.activeColor !== 'white' || !this.running);
            wParent.classList.toggle('clock-warning', this.whiteTime > 0 && this.whiteTime <= 30000 && this.activeColor === 'white');
            wParent.classList.toggle('clock-timeout', this.whiteTime <= 0);
        }
        if (bParent) {
            bParent.classList.toggle('clock-active', this.activeColor === 'black' && this.running);
            bParent.classList.toggle('clock-inactive', this.activeColor !== 'black' || !this.running);
            bParent.classList.toggle('clock-warning', this.blackTime > 0 && this.blackTime <= 30000 && this.activeColor === 'black');
            bParent.classList.toggle('clock-timeout', this.blackTime <= 0);
        }

        if (this._whiteLabelEl) {
            this._whiteLabelEl.classList.toggle('text-green-400', this.activeColor === 'white' && this.running);
        }
        if (this._blackLabelEl) {
            this._blackLabelEl.classList.toggle('text-green-400', this.activeColor === 'black' && this.running);
        }
    }

    _playSound(type) {
        try {
            if (!this._audioCtx) {
                this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = this._audioCtx;
            if (ctx.state === 'suspended') ctx.resume();

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            switch (type) {
                case 'game-start':
                    osc.frequency.value = 523.25;
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0.3, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.3);
                    break;

                case 'low-time':
                    osc.frequency.value = 880;
                    osc.type = 'square';
                    gain.gain.setValueAtTime(0.15, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.15);
                    break;

                case 'timeout':
                    osc.frequency.value = 220;
                    osc.type = 'sawtooth';
                    gain.gain.setValueAtTime(0.4, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.8);
                    break;
            }
        } catch (e) {
            // Audio not supported or blocked
        }
    }

    saveState() {
        const state = {
            whiteTime: this.whiteTime,
            blackTime: this.blackTime,
            activeColor: this.activeColor,
            running: this.running,
            paused: this.paused,
            gameStarted: this.gameStarted,
            gameEnded: this.gameEnded,
            moveCount: this.moveCount,
            increment: this.increment,
            selectedControl: this._selectedControl,
            savedAt: performance.now(),
        };
        try {
            sessionStorage.setItem('chess_clock_state', JSON.stringify(state));
        } catch (e) {}
    }

    restoreState() {
        try {
            const raw = sessionStorage.getItem('chess_clock_state');
            if (!raw) return false;
            const state = JSON.parse(raw);
            if (!state.gameStarted || state.gameEnded) return false;

            const elapsed = performance.now() - state.savedAt;

            this.whiteTime = state.whiteTime;
            this.blackTime = state.blackTime;
            this.activeColor = state.activeColor;
            this.paused = state.paused;
            this.gameStarted = state.gameStarted;
            this.gameEnded = state.gameEnded;
            this.moveCount = state.moveCount;
            this.increment = state.increment;
            this._selectedControl = state.selectedControl;

            if (state.running && !state.paused) {
                if (this.activeColor === 'white') {
                    this.whiteTime = Math.max(0, this.whiteTime - elapsed);
                } else {
                    this.blackTime = Math.max(0, this.blackTime - elapsed);
                }

                if (this.whiteTime <= 0) {
                    this.whiteTime = 0;
                    this._handleTimeout('white');
                    return true;
                }
                if (this.blackTime <= 0) {
                    this.blackTime = 0;
                    this._handleTimeout('black');
                    return true;
                }

                this.running = true;
                this._lastTick = performance.now();
                this._startInterval();
            }

            this._render();
            return true;
        } catch (e) {
            return false;
        }
    }
}

window.ChessClock = ChessClock;
