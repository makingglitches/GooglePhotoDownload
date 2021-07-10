// simple script notifies subscribers when console window dimensions change.

// just call startTime() after calling addHandler() with a function(x,y) to receive the terminal size.

const term = require('terminal-kit').terminal;

runtimer = true;
timerhandle = null;
wx = 0;
wy = 0;

function timeout() {
	if (term.width != wx || term.height != wy) {
		wx = term.width;
		wy = term.height;
		for (var i in handles) {
			handles[i](wx, wy);
		}
	}

	if (runtimer) {
		timerhandle = setTimeout(timeout, 100);
	}
}

handles = [];

function addHandler(afunction) {
	handles.push(afunction);
}


function stopTimer() {
	clearTimeout(timerhandle);
	runtimer = false;
}

function startTimer() {
	clearTimeout(timerhandle);
	runtimer = true;
	timeout();
}

function clearHandlers() {
	handles = [];
}


module.exports = 
{
    clearHandlers : clearHandlers,
    addHandler : addHandler,
    stopTimer : stopTimer,
    startTimer : startTimer
}
