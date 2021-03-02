var socket;

var canvas;
var ctx;

var player;
var players;
var board;
var currentplayerid; // just cosmetic, used for the text drawing
var textfadetimer;

var mouseX,mouseY,mouseDown=0;
var middleclickdown = false;

var tilehoverX; var tilehoverY;
var animtick = 0;

TILE_SIZE = 32;
TEXT_FADE_TIME = 60;

var cam_x = 0; var cam_y = 0; var cam_zoom = 1;

var mousemove = function(e){
	newmousepos = getMousePos(e);
	newx = newmousepos[0]; newy = newmousepos[1];
	
	dx = newx - mouseX;
	dy = newy - mouseY;
	
	if (middleclickdown){
		cam_x -= dx;
		cam_y -= dy;
	}
	
	mouseX = newx; mouseY = newy;
	//console.log(mouseX + " " + mouseY);
	
	tilehoverX = Math.floor((untra_x(mouseX)) / TILE_SIZE); tilehoverY = Math.floor((untra_y(mouseY) )/ TILE_SIZE);
}

var mousedown = function(e){
	event.preventDefault();
	
	if (e.button == 1){
		middleclickdown = true;
	}
}

var mouseup = function(e){
	if (e.button == 1){
		middleclickdown = false;
	}
}

var startClient = function(){
	canvas = document.getElementById("Canvas");
	//canvas.style = "position: absolute; top: 0px; left: 0px; right: 0px; bottom: 0px; margin: auto;"
	
	canvas.style = "margin:auto;"
	
	ctx = canvas.getContext("2d");
	ctx.imageSmoothingEnabled = false;
	ctx.mozImageSmoothingEnabled = false;
	
	// TODO make use of these functions (very soon)
	
	if (ctx) {
		// React to mouse events on the canvas, and mouseup on the entire document
		canvas.addEventListener('mousedown', mousedown, false);
		canvas.addEventListener('mousemove', mousemove, false);
		window.addEventListener('mouseup',   mouseup, false);

		// React to touch events on the canvas
		//canvas.addEventListener('touchstart', touchstart, false);
		//canvas.addEventListener('touchmove', touchmove, false);
		canvas.addEventListener('click', function (e) {
			
			// left click (place stone)
			if (e.button == 0){
				socket.emit("placeStoneRequest", tilehoverX, tilehoverY);
				
			// middle click (Drag viewport)
			}else if (e.button == 1){
				
			}
		});	
	}
	
	// main loop
	var main = function () {
		var now = Date.now();
		var delta = now - then;
	
		update(delta);
		render();
		
		then = now;
		requestAnimationFrame(main);
	};
	var w = window;
	requestAnimationFrame = w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.msRequestAnimationFrame || w.mozRequestAnimationFrame;

	var then = performance.now();
	main();
}

var server_connect = function(){
	
	if (socket){
		socket.disconnect();
	}
	my_nama = document.getElementById("nameField").value;
	var ip = document.getElementById("ipField").value;
	
	socket = io.connect(ip, {
	//socket = io.connect("http://5.183.8.45:23456", {
    reconnection: false });
	
	socket.on("connect", function(){
		
		var form = document.getElementById("form"); // text box for joining server goes away once you join
		form.style.display="none";;
		
		socket.on("disconnect", function(){
			var form = document.getElementById("form"); // text box comes back if you're disconnected
			form.style.display="block"
			socket.disconnect();
		});
		
	});
	
	socket.on("boardUpdate", function(serverBoard){
		board = serverBoard;
	});
	
	socket.on("nextTurn", function(playerid){
		
		currentplayerid = playerid;
		textfadetimer = TEXT_FADE_TIME;
		
	});
	
	socket.on("playerJoin", function(playerJoining, serverPlayerList, serverBoard){
		
		players = serverPlayerList;
		
		if (typeof player === 'undefined'){
			player = playerJoining;
			board = serverBoard;
			
			cam_x = (serverBoard[0].length * TILE_SIZE)/2;
			cam_y = (serverBoard.length * TILE_SIZE)/2;
			
			player.socket = socket.id
			player.name   = my_nama
			socket.emit("playerAddSocketAndName", player.id, socket.id, my_nama)
		}
	});
	
	socket.on("playerLeave", function(ind, playersList){
		
		players = playersList
	});
}

var update = function(){
	animtick++;
	textfadetimer--;
	textfadetimer = Math.max(0, textfadetimer);
}

var render = function(){
	ctx.textAlign = "left";
	ctx.fillStyle = "rgb(230, 170, 100)"; // blank color for the canvas
	ctx.fillRect(0,0,canvas.width,canvas.height);
	ctx.lineWidth = 1;
	
	if (typeof board !== 'undefined'){
		
		ctx.strokeStyle = "rgb(0, 0, 0)";
		for (i=0;i<board.length-1;i++){
			for (j=0;j<board[i].length-1;j++){
				
				ctx.beginPath();
				ctx.rect(tra_x(i*TILE_SIZE + TILE_SIZE/2 ), tra_y(j*TILE_SIZE + TILE_SIZE/2), TILE_SIZE, TILE_SIZE);
				ctx.closePath();
				ctx.stroke();
				
		
			}
		}
		
		for (i=0;i<board.length;i++){
			for (j=0;j<board[i].length;j++){
					
				if (board[i][j] != -1){
					
					if (players[board[i][j]]){
					
						ctx.beginPath();
						ctx.fillStyle = players[board[i][j]].color;
						ctx.arc( tra_x(i*TILE_SIZE + TILE_SIZE/2), tra_y(j*TILE_SIZE + TILE_SIZE/2), TILE_SIZE/2, 0, 6.28	 )
						ctx.fill()

						ctx.strokeStyle = "#000000"
						ctx.arc( tra_x(i*TILE_SIZE + TILE_SIZE/2), tra_y(j*TILE_SIZE + TILE_SIZE/2), TILE_SIZE/2, 0, 6.28	 )
						ctx.stroke();
					}
				} else{
					
				}
			}
		}
		ctx.beginPath();
		ctx.fillStyle = "#ffffff"
		ctx.fillStyle = player.color + Math.floor( 16 + Math.floor(200 * Math.abs(Math.sin(animtick/10))) ).toString(16);
		ctx.arc( tra_x(tilehoverX*TILE_SIZE + TILE_SIZE/2), tra_y(tilehoverY*TILE_SIZE + TILE_SIZE/2), TILE_SIZE/2, 0, 6.28	 )
		ctx.fill()
		
		ctx.strokeStyle = "#000000"
		ctx.arc( tra_x(tilehoverX*TILE_SIZE + TILE_SIZE/2), tra_y(tilehoverY*TILE_SIZE + TILE_SIZE/2), TILE_SIZE/2, 0, 6.28	 )
		ctx.stroke();
		//ctx.drawImage(IMG_PIECE, tra_x(tilehoverX*TILE_SIZE), tra_y(tilehoverY*TILE_SIZE));
	}
	var texty = 16
	ctx.fillStyle = "rgb(255, 255, 255)";
	ctx.font = "16px Helvetica";
	for (index in players){
		
		ctx.fillText ( players[index].name + " (ID: " + players[index].id + ")", 0, texty )
		
		texty += 32
	}
	if (textfadetimer > 0 && players[currentplayerid]){
		ctx.fillStyle = players[currentplayerid].color + Math.floor(16 + textfadetimer/TEXT_FADE_TIME * 240 ).toString(16);
		ctx.font = "bold 60px Verdana";
		ctx.textAlign = "center";
		
		outStr = players[currentplayerid].name + "'s turn!"
		
		ctx.fillText(outStr, canvas.width / 2, canvas.height / 2);
		ctx.fillStyle = "rgba(0, 0, 0, " + textfadetimer/TEXT_FADE_TIME + ")";
		ctx.strokeText(outStr, canvas.width / 2, canvas.height / 2);
	}
}

var tra_x = function(x){ // translate x based on camera values
	var originx = canvas.width / 2;
	return ((x-cam_x)*cam_zoom) + originx
}
var tra_y = function(y){ // translate y based on camera values
	var originy = canvas.height / 2;
	return ((y-cam_y)*cam_zoom) + originy
}

var untra_x = function(x){ // these two convert screen pos back to ingame pos (for cursor clicking and stuff)
	var originx = canvas.width / 2;
	return ((x - originx)/cam_zoom) + cam_x
}
var untra_y = function(y){
	var originy = canvas.height / 2;
	return ((y - originy)/cam_zoom) + cam_y
}

// this function is from https://zipso.net/a-simple-touchscreen-sketchpad-using-javascript-and-html5/
function getMousePos(e) {
	
	rect = canvas.getBoundingClientRect()
	var x = e.clientX - rect.left
	var y = e.clientY - rect.top
	
	output = [];
	output.push(x); output.push(y); return output;
	
/* 	if (!e)
	 var e = event;

	if (e.offsetX) {
		mouseX = e.offsetX;
		mouseY = e.offsetY;
	}
	else if (e.layerX) {
		mouseX = e.layerX;
		mouseY = e.layerY;
	} */
}

startClient();