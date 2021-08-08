const fs = require('fs');
const term = require('terminal-kit').terminal;

async function getAccountDirectory(historyitems) {
	term.clear();

	var s = '';

    var history = historyitems ? historyitems:[];
    

	while (s == '') {
        
		term.green('Please enter path and press <enter>, arrow up/down for history, ');

		var s = await new Promise((resolve, reject) => {
			term.inputField({ cancelable: true }, function(error, input) {
				if (error) {
					reject(error);
				}

				resolve(input);
			});
		});

        if (s && fs.existsSync(s))
        {
            term('\n');
            
        }
        else if (s)
        {
            history.push(s);
            term.clear;
            s = '';
        }
        else 
        {
            term.red('\nCanceled');
        }
	}

	return s;
}

module.exports = getAccountDirectory;
