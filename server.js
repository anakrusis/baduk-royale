var config = require('./config.js');
var io = require('socket.io')(config.PORT);
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt:""
});

class Player {
	constructor(id){
		this.name="player";
		this.id = id;
		this.color = "#000000";
		this.turns_until_kick = 3;
		this.other_kick_timer = config.KICK_TIME_IN_SECONDS * config.TICKS_PER_SECOND;
		this.active = true;
	}
}

var init_board = function(width, height){
	board = [];
	
	for (i = 0; i < width; i++){
		
		board[i] = [];
		for (j = 0; j < height; j++){
			board[i][j] = -1;
		}
	}
	io.emit("boardUpdate", board);
}

var COLORS = [ "#000000", "#ffffff", "#ff0000", "#008000", "#0000ff", "#ffff00" ]

console.log("Starting server...\n") // init server

var players = {};
var currentplayerid;
var playerorder = [];
var playerorderindex = 0; // index into playerorder

var playerscounter = 0;
var movetimer = config.TICKS_PER_SECOND * config.TURN_TIME_IN_SECONDS;

init_board(config.BOARD_WIDTH, config.BOARD_HEIGHT);

rl.on('line', (line) => { // Command line parsing!
	firstArg = line.trim().split(' ')[0]
	switch (firstArg) {
		
		case "/list":
			if (Object.keys(players).length == 0){
				console.log("No players online!")
			}else{
				console.log("Players online:");
			}
			for (index in players){
				console.log ( players[index].name + " (ID: " + players[index].id + ")" );
			}
			
			console.log("Move timer(ticks): " + movetimer);console.log("");
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
			
		case "/kick":
			arg = line.trim().substring(6);
			if (parseInt(arg, 10) != NaN){
				id = parseInt(arg, 10);
				if ( players[id] ){
					
					onKick(id, "none");
					
				}else{
					console.log("Invalid player ID!\n");
				}
			}else{
				console.log("Invalid player ID: not an integer!\n");
			}
			break;
			
		case "/next":
			onNextTurn();
			break;
	}
});

var onKick = function(id, reason){
	const sockete = io.of("/").connected[ players[id].socket ];	
	sockete.emit("kick");	
	onPlayerLeave(players[id]);			
	io.emit("playerLeave", id, players);			
	if (sockete){
		sockete.emit("textMessage", "You have been kicked! (Reason: " + reason + ")", 10000, 30, "#f80000", id);
		sockete.disconnect();
	}
}

var update = function () {
	if (players[currentplayerid]){
		players[currentplayerid].other_kick_timer--;
		
		if (players[currentplayerid].other_kick_timer <= 0){
			onKick(currentplayerid, "idle");
		}
	}
	
	if (Object.keys(players).length > 1){
		movetimer--;
		io.emit("timerUpdate", movetimer);
		
		if (movetimer <= 0){
			players[currentplayerid].turns_until_kick--;
			if (players[currentplayerid].turns_until_kick <= 0){
				onKick(currentplayerid, "passed 3 turns");
			}
			onNextTurn();
		}
	}
}

io.on('connection', function (socket) {
	if (Object.keys(players).length < config.MAX_PLAYERS){
		
		playerJoining = new Player( newID() );
		
		if (playerscounter >= COLORS.length){
			var colornum = Math.floor(Math.random()*16777215);
			var myHex = ("000000" + colornum.toString(16)).substr(-6); playerJoining.color = "#" + myHex;
		}else{
			playerJoining.color = COLORS[ playerscounter ];
		}
		
		io.emit("playerJoin", playerJoining, players, board, currentplayerid);
		
		socket.on("playerAddSocketAndName", function (playerid, socketid, nama) {
			
			playerscounter++;
		
			players[playerJoining.id] = playerJoining;
		
			playerorder.push(playerJoining.id);
			
			players[playerid].socket = socketid;
			players[playerid].name   = nama;
		
			if (Object.keys(players).length == 1){
				currentplayerid = playerJoining.id;
			}
			
			console.log(playerJoining.name + " has joined the server (ID: " + playerJoining.id + ")" )
			io.emit("playerJoin", playerJoining, players, board, currentplayerid);
			
			if (Object.keys(players).length == 1){
				onNextTurn();
			}
		});
		
		socket.on("placeStoneRequest", function(x, y){
			// player amount check
			if (Object.keys(players).length > 1){
				// bounds check
				if (x >= 0 && x < board.length && y >= 0 && y < board[0].length){
					// empty tile check
					if (board[x][y] == -1){
							
						onPlace(socket, x,y);
						
						io.emit("boardUpdate", board);
						
						
					}
				}
			}
		});
		
		// this is simply used to detect AFK players whos mouse never touches the canvas
		socket.on("mouse_ping", function(){
			var ping_perpetrator = getPlayerFromSocket(socket);
			ping_perpetrator.other_kick_timer = config.KICK_TIME_IN_SECONDS * config.TICKS_PER_SECOND;
		});
		
		socket.on("disconnect", function () {

			playerLeaving = getPlayerFromSocket(socket);
			 
			if (playerLeaving != -1){
				onPlayerLeave(playerLeaving);
			}
			
		});
	}else{
		socket.emit("textMessage", "Server is full!", 10000, 50, "#f80000", -1);
		socket.disconnect();		
	}
});

setInterval(()=> {update()}, 1000 / config.TICKS_PER_SECOND);

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

var onPlace = function(socket, x,y){
	var placer = getPlayerFromSocket(socket);
	currentplayerid = playerorder[playerorderindex];
	
	// COMMENT OUT THIS ONE LINE IF YOU WANT TO TEST WITHOUT TURNS
	if (placer.id != currentplayerid){ return; }
	
	board[x][y] = placer.id;
	
	checkContiguousAdjacencies(x,y,x,y-1,placer.id);
	checkContiguousAdjacencies(x,y,x,y+1,placer.id);
	checkContiguousAdjacencies(x,y,x+1,y,placer.id);
	checkContiguousAdjacencies(x,y,x-1,y,placer.id);
	
	// Dede meaning the move is suicidal and should not be allowed
	dede = true; attacker = -2; dedesCheckedX = []; dedesCheckedY = [];
	checkIfDede(x, y, placer.id);
	
	if (!dede) { placer.turns_until_kick = config.TIME_OUT_TURN_COUNT; onNextTurn(); } else { board[x][y] = -1; console.log("move is suicidal") };
}

var checkIfDede = function(x, y, victimcolor){

	//console.log("x:" + x + ", y:" + y + ", victim:" + victimcolor + ", attacker:" + attacker)

	// if this tile is already a member of the Dedes Checked group then we just stop.
	for (i=0; i<dedesCheckedX.length; i++){
		if (dedesCheckedX[i] == x && dedesCheckedY[i] == y){
			//console.log("tile already checked")
			return;
		}
	}
	
	if (getTile2(x,y) == -1){ dede=false; return; }
	if (getTile2(x,y) == attacker || getTile2(x,y) == null ){ return; };
	
	if ( getTile2(x+1,y) != -1 && getTile2(x+1,y) != victimcolor && getTile2(x+1,y)!= null && attacker == -2){
		attacker = getTile2(x+1,y);
	}
	if ( getTile2(x-1,y) != -1 && getTile2(x-1,y) != victimcolor && getTile2(x-1,y)!= null && attacker == -2){
		attacker = getTile2(x-1,y);
	}
	if ( getTile2(x,y+1) != -1 && getTile2(x,y+1) != victimcolor && getTile2(x,y+1)!= null && attacker == -2){
		attacker = getTile2(x,y+1);
	}
	if ( getTile2(x,y-1) != -1 && getTile2(x,y-1) != victimcolor && getTile2(x,y-1)!= null && attacker == -2){
		attacker = getTile2(x,y-1);
	}
	
	if ( (getTile2(x+1,y) == -1) ) { dede=false; return; }
	if ( (getTile2(x-1,y) == -1) ) { dede=false; return; }
	if ( (getTile2(x,y+1) == -1) ) { dede=false; return; }
	if ( (getTile2(x,y-1) == -1) ) { dede=false; return; }
	
	dedesCheckedX.push(x); dedesCheckedY.push(y);
	
	checkIfDede(x+1,y,victimcolor);
	checkIfDede(x-1,y,victimcolor);
	checkIfDede(x,y+1,victimcolor);
	checkIfDede(x,y-1,victimcolor);
}

var checkContiguousAdjacencies = function(attackerx,attackery,victimx,victimy, attackercolor){
	surrounded = true;
	
	contiguousX = []; contiguousY = [];
	checkAdjacencies(victimx, victimy, getTile(victimx,victimy,attackercolor), attackercolor );
	
	if (surrounded){
		
		for (i=0; i<contiguousX.length; i++){

			board[ contiguousX[i] ][ contiguousY[i] ] = -1;
		
		}
	}
}

var checkAdjacencies = function(x,y, victimcolor, attackercolor){
	
	if ( victimcolor == attackercolor || victimcolor == -1 || attackercolor == -1 ){ surrounded=false; return; }
	
	// if this tile is already a member of the Contiguous group then we just stop.
	for (i=0; i<contiguousX.length; i++){
		if (contiguousX[i] == x && contiguousY[i] == y){
			return;
		}
	}
	// if any libertys on the group then the group is not surrounded!
	if ( getTile(x,y,attackercolor) == attackercolor ){ return; }
	if ( getTile(x,y+1,attackercolor) == -1 ){ surrounded=false; return; }
	if ( getTile(x,y-1,attackercolor) == -1 ){ surrounded=false; return; }
	if ( getTile(x+1,y,attackercolor) == -1 ){ surrounded=false; return; }
	if ( getTile(x-1,y,attackercolor) == -1 ){ surrounded=false; return; }
	
	contiguousX.push(x); contiguousY.push(y);
	
	checkAdjacencies(x,y+1,victimcolor,attackercolor);
	checkAdjacencies(x,y-1,victimcolor,attackercolor);
	checkAdjacencies(x+1,y,victimcolor,attackercolor);
	checkAdjacencies(x-1,y,victimcolor,attackercolor);
}

var getTile = function(x,y, attackercolor){
	if (x >= 0 && x < board.length && y >= 0 && y < board[0].length){
		return board[x][y];
	}else{
		return attackercolor;
	}
}
var getTile2 = function(x,y){
	if (x >= 0 && x < board.length && y >= 0 && y < board[0].length){
		return board[x][y];
	}else{
		return null;
	}	
}

var onNextTurn = function(){
	
	if (Object.keys(players).length != 0){ // empty server will not do turns
	
		movetimer = config.TICKS_PER_SECOND * config.TURN_TIME_IN_SECONDS;
		
		for (i=1;i<playerorder.length+1;i++){
			nextindex = (playerorderindex + i) % playerorder.length;

			tempid = playerorder[nextindex];
			if (players[tempid]){
				break;
			}
		}
		playerorderindex = nextindex;

		currentplayerid = playerorder[playerorderindex];
		
		console.log( players[currentplayerid].name + "'s turn! (ID: " + players[currentplayerid].id + ")" );
		
		io.emit("textMessage", players[currentplayerid].name + "'s turn!", 60, 50, players[currentplayerid].color, -1);
		io.emit("nextTurn", currentplayerid);
	}
}

var onPlayerLeave = function(p){
	
	currentplayerid = playerorder[playerorderindex];
	if (p.id == currentplayerid){
		onNextTurn();
	}
	
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