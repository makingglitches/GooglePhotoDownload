var term = require('terminal-kit').terminal;



async function modeSelectScreen()
{

    var mode = 0;

    term.cyan( 'Please select from the following options' ) ;

    var items = [
	'1. Download with Refresh:  Grab a list of all items connected to an account and download' ,
	'2. Download Only:  Load items from local store from previous session, finish these.' ,
	'3. No Download:  Grab items from online account, add to store and check against files.',
    '4. Exit'
    ] ;



  var mode = await  new Promise((resolve,reject) =>
        {
    term.singleColumnMenu( items , function( error , response ) {
	    term( '\n' ).eraseLineAfter.green(
		"#%s selected: %s (%s,%s)\n" ,
		response.selectedIndex ,
		response.selectedText ,
		response.x ,
		response.y
        
	) ;

    resolve(response.selectedIndex);
   
    
} ) ;
        });

        return mode;

}


var screens = 
{
    modeSelectScreen:modeSelectScreen
}

module.exports = screens;