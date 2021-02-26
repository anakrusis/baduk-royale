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
		this.color = "#000000";
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

var COLORS = [ "#000000", "#ffffff", "#ff0000", "#008000", "#0000ff", "#ffff00" ]

console.log("Starting server...\n") // init server

var players = {};
var playerscounter = 0;

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
					
					if (board[j][i] == -1) {
						rowstring += ".";
					}else{
						rowstring += "#"; // TODO add a unique single-character for every player just for this command
					}
				}
				console.log(rowstring);
			}
			console.log("");
			break;
	}
});

var update = function () {
	
}

io.on('connection', function (socket) {
	
	var playerJoining = new Player( newID() );
	
	if (playerscounter >= COLORS.length){
		playerJoining.color = "#" + Math.floor(Math.random()*16777215).toString(16);
	}else{
		playerJoining.color = COLORS[ playerscounter ];
	}
	playerscounter++;
	
	players[playerJoining.id] = playerJoining;
	
	io.emit("playerJoin", playerJoining, players, board);
	console.log(playerJoining.name + " has joined the server (ID: " + playerJoining.id + ")" )
	
	socket.on("playerAddSocket", function (playerid, socketid) {
		players[playerid].socket = socketid;
	});
	
	socket.on("placeStoneRequest", function(x, y){
		// bounds check
		if (x >= 0 && x < board[0].length && y >= 0 && y < board.length){
		
			var placer = getPlayerFromSocket(socket);
			board[x][y] = placer.id;
			
			io.emit("boardUpdate", board);
		
		}
	});
	
	socket.on("disconnect", function () {

		playerLeaving = getPlayerFromSocket(socket);
		 
		if (playerLeaving != -1){
			onPlayerLeave(playerLeaving);
		}
		
	});
});

setInterval(()=> {update()}, 50);

var newID = function(){
	return Math.round(Math.random() * 100000);
}

var getPlayerFromSocket = function(socket_in){
	for (i in players){
		if (socket_in.id == players[i].socket) {
			return players[i];
		}
	}
	return -1;
}
var onPlayerLeave = function(p){
	
	for (i=0; i<board.length; i++){
		for (j=0; j<board[i].length; j++){
	
			if (board[i][j] == p.id){

				board[i][j] = -1;
			
			}
		}
	}
	io.emit("boardUpdate", board);
	
	var ind = p.id;
	console.log( p.name + " has left the server (ID: " + ind + ")")
	delete players[p.id];
	
	io.emit("playerLeave", ind, players);
}