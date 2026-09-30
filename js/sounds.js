// ===== Sound effects (bundled mp3 assets) =====
// Plays the local files in sounds/. Respects the user's sound setting.
const SoundManager = {
    _cache: {},
    _enabled: true,

    init() {
        this._enabled = DB.getSettings().sound !== false;
    },

    setEnabled(on) {
        this._enabled = !!on;
        DB.saveSettings({ sound: this._enabled });
    },

    isEnabled() { return this._enabled; },

    _play(file) {
        if (!this._enabled) return;
        try {
            let audio = this._cache[file];
            if (!audio) {
                audio = new Audio('sounds/' + file);
                this._cache[file] = audio;
            }
            audio.currentTime = 0;
            const promise = audio.play();
            if (promise && promise.catch) promise.catch(() => { /* autoplay blocked until first gesture */ });
        } catch (e) { /* audio unavailable */ }
    },

    move()       { this._play('move.mp3'); },
    capture()    { this._play('capture.mp3'); },
    check()      { this._play('check.mp3'); },
    gameStart()  { this._play('game-start.mp3'); },
    uiClick()    { this._play('ui-click.mp3'); },
};

window.SoundManager = SoundManager;
