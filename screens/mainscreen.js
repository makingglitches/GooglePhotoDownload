const term = require('terminal-kit').terminal;
const ResizeNotifier = require('./resizer');
const modesel = require('./modeselection');
const readline = require('readline');

const getAccountDirectory = require('./getaccountpath');




function hello(x,y)
{
    term.clear();
    term.green('hello hello hello');
 
}


async function run()

{

term.clear();


term.grabInput();

var noti = new ResizeNotifier(hello);
noti.StartSizeLoop();

var i = await modesel.modeSelectScreen();

console.log(i);

var s = await getAccountDirectory();

console.log(s);

}


run();