const bintree = require('./bintree');
const term = require('terminal-kit').terminal;
const screenupdater = require('./frameupdater/screensizeupdater')


tree ={}

bintree.addByExtension(tree,'/test/1.txt');
bintree.findByExtension(tree,'1.txt');


term.fullscreen();

function ontick(x,y)
{
    term.clear();
    console.log('x: '+ x+" y:"+y);
    displayFrame();
}


function pad(count)
{
    var i = 0;
    var str = '';

    while (i < count)
    {
        str+=" ";
        i++;
    }

    return str;
}

function centerText(str)
{
    var left = term.width / 2 - str.length/ 2;
    term(pad(left)+str);
    term ('\n');
    
}

nodownload = false;
dorefresh  = true;
currentscreen = 1;

function displayFrame()
{
    term.clear();

    term.red();
    centerText('Google Photo Downloader');
    centerText('Written by John R Sohn');

    if (currentscreen == 1)
    {
        term('\n\n\n');
        term.green();
        centerText('Please select operating mode.');
        term.singleLineMenu(['No Download', 'Download'], {align:'center'}, function(error, result)
        {
            currentscreen = 2;
            nodownload = result.selectedIndex == 1;    
            displayFrame();
        });
    }
    else if (currentscreen == 2)
    {
        term('\n\n\n');
        term.green();
        centerText('Please select operating mode.');
        term.singleLineMenu(['Refresh Items From Account', 'Use Cached Storeitems'], {align:'center'}, function(error, result)
        {
            currentscreen = 3;
            dorefresh = result.selectedIndex == 1;  
            displayFrame();  
        });

    }
    else if (currentscreen ==3)
    {
        term('\n\n\n');

        term.bold();
        term.white();
        centerText("Please connect your internet browser");
        centerText("to localhost:8080");
        centerText("and log into your google account.");
        term.blink();
        term('\n');
        centerText('Waiting...')
    }
}


screenupdater.clearHandlers();
screenupdater.addHandler(ontick);
screenupdater.startTimer();



function terminate() {
    screenupdater.stopTimer();
	term.grabInput( false ) ;
	setTimeout( function() { process.exit() } , 100 ) ;
}


term.grabInput();

term.on( 'key' , function( name , matches , data ) {
//	console.log( "'key' event:" , name ) ;
	if ( name === 'CTRL_C' ) { terminate() ; }
} ) ;







