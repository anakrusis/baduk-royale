var io = require('socket.io')(23456);
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt:""
});

class Player {
	constructor(id){
		this.id = id;
		this.color = [1, 1, 1];
		this.movetimer = 0;
	}
}

var init_board = function(width, height){
	board = [];
	
	for (i = 0; i < height; i++){
		
		board[i] = [];
		for (j = 0; j < width; j++){
			board[i][j] = -1;
		}
	}
}

console.log("Starting server...\n") // init server

var players = {};

init_board(19, 19);

rl.on('line', (line) => { // Command line parsing!
	firstArg = line.trim().split(' ')[0]
	switch (firstArg) {
		
		case "/list":
			for (index in players){
				console.log ( players[index].name + " (ID: " + players[index].id + ")" )
			}
			if (Object.keys(players).length == 0){
				console.log("No players online!")
			}
			console.log("");
			break;
			
		case "/stop":
			console.log("Stopping server...");
			process.exit(0);
			break;
			
		case "/draw":
			for (i=0; i<board.length; i++){
				
				var rowstring = "";
				for (j=0; j<board[i].length; j++){
					
					if (board[i][j] == -1) {
						rowstring += ".";
					}else{
						rowstring += "#";
					}
				}
				console.log(rowstring);
			}
	}
});

var update = function () {
	
}

io.on('connection', function (socket) {
	
	var playerJoining = new Player( newID() );
	players[playerJoining.id] = playerJoining;
	
	io.emit("playerJoin", playerJoining, players, board);
	console.log(playerJoining.name + " has joined the server (ID: " + playerJoining.id + ")" )
	
});

setInterval(()=> {update()}, 50);

var newID = function(){
	return Math.round(Math.random() * 100000);
}