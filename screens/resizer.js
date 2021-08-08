const term = require('terminal-kit').terminal;


class ResizeNotifier {
	lastw = term.width;
	lasth = term.height;
	keeprunning = true;

	constructor(callback) {
		this.callback = callback;
	}

	StopLoop() {
		this.keeprunning = false;
	}

	StartSizeLoop() {
        this.keeprunning = true;

		setTimeout(() => {
			this.loop();
		}, 500);
	}

	loop() {
		if (this.lastw != term.width || this.lasth != term.height) {
			this.lastw = term.width;
			this.lasth = term.height;
			this.callback(this.lastw, this.lasth);
		}

		// keep the timer running.
		if (this.keeprunning) {
			this.StartSizeLoop();
		}
	}
}


module.exports = ResizeNotifier;
