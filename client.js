var socket;

var canvas;
var ctx;

var player;
var players;
var mostrecentmovesX = {}; var mostrecentmovesY = {};
var board;
var lastplayerid;    // used for the most recent turn thingy
var currentplayerid; // just cosmetic, used for the text drawing
var messagebuffer = "";   // text string for doing stuff
var textfadetimer;
var textsize = 50; var textcolor = "#ffffff";

var mouseX,mouseY,mouseDown=0;
var middleclickdown = false;
var keysDown = {};

var tilehoverX; var tilehoverY;
var animtick = 0;
var movetimer = 0; // In ticks like the server movetimer

TILE_SIZE = 32;
TEXT_FADE_TIME = 60;
CAM_MOV_SPEED = 5;

var cam_x = 0; var cam_y = 0; var cam_zoom = 1;

var kicked = false; // just a temp toggle switch thing for the kick messages

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
	
	if (socket){ socket.emit("mouse_ping"); };
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
	
	//canvas.style = "margin:auto;"
	
	ctx = canvas.getContext("2d");
	ctx.imageSmoothingEnabled = false;
	ctx.mozImageSmoothingEnabled = false;
	
	addEventListener("keydown", function (e) { // when a key is pressed
		keysDown[e.keyCode] = true;
		//event.preventDefault();
		tilehoverX = Math.floor((untra_x(mouseX)) / TILE_SIZE); tilehoverY = Math.floor((untra_y(mouseY) )/ TILE_SIZE);
	}, false);

	addEventListener("keyup", function (e) { // when a key is unpressed
		delete keysDown[e.keyCode];
	}, false);
	
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
				
				for (i = 0; i < screen.elements.length; i++){
		
					btn = screen.elements[i];
					if ( btn.x <= mouseX && mouseX <= btn.x + btn.width && 
						 btn.y <= mouseY && mouseY <= btn.y + btn.height ){

						btn.onClick();
						return;
					}				
				}
				
				if (socket){ socket.emit("placeStoneRequest", tilehoverX, tilehoverY); }
				
			// middle click (Drag viewport)
			}else if (e.button == 1){
				
			}
		});	
	}
	initGUI();
	screen = screen_MAIN;
	
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
    reconnection: false });
	
	socket.on("connect", function(){
		
		messagebuffer = "";
		
		var form = document.getElementById("form"); // text box for joining server goes away once you join
		form.style.display="none";;
		
		socket.on("disconnect", function(){
			var form = document.getElementById("form"); // text box comes back if you're disconnected
			form.style.display="block"
			socket.disconnect();
			
			player = undefined;
		});
		
	});
	
	socket.on("kick", function(){
		kicked = true;
	});
	
	socket.on("textMessage", function(serverText, serverTextDuration, serverTextSize, serverTextColor, recipient){
		if (kicked){
			kicked = false;
		}else{
			if (recipient == -1 || recipient == player.id){
				messagebuffer = serverText;
				textfadetimer = serverTextDuration;
				textsize      = serverTextSize;
				textcolor     = serverTextColor;
			}
		}
	});
	
	socket.on("boardUpdate", function(serverBoard){

		if (players[lastplayerid]){
			for (i=0; i<board.length; i++){
				for (j=0; j<board[i].length; j++){
			
					if (serverBoard[i][j] != board[i][j] && serverBoard[i][j] == lastplayerid){

						mostrecentmovesX[lastplayerid] = i; mostrecentmovesY[lastplayerid] = j; break;
					
					}
				}
			}
		}
		board = serverBoard;
	});
	socket.on("timerUpdate", function(serverTimer){
		movetimer = serverTimer;
	});
	
	socket.on("nextTurn", function(playerid){
		
		lastplayerid    = currentplayerid;
		currentplayerid = playerid;
		textfadetimer = TEXT_FADE_TIME;
		
	});
	
	socket.on("playerJoin", function(playerJoining, serverPlayerList, serverBoard, serverplayerid){
		messagebuffer = "";
		players = serverPlayerList;
		currentplayerid = serverplayerid;
		
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
	
	if (87 in keysDown || 38 in keysDown) { // up
		cam_y-=CAM_MOV_SPEED;
	}
	if (83 in keysDown || 40 in keysDown) { // down
		cam_y+=CAM_MOV_SPEED;
	}
	if (65 in keysDown || 37 in keysDown) { // left
		cam_x-=CAM_MOV_SPEED;
	}
	if (68 in keysDown || 39 in keysDown) { // right
		cam_x+=CAM_MOV_SPEED;
	}
	
	if (players && !kicked && socket){
		if (Object.keys(players).length == 1 && socket.connected){
			messagebuffer = "Waiting for another player to join..."; textsize = 30; textcolor = "#ffffff"; textfadetimer = 10000;
		}
	}
	
	animtick++;
	textfadetimer--;
	textfadetimer = Math.max(0, textfadetimer);
	
	for (i = 0; i < screen.elements.length; i++){
		screen.elements[i].update();
	}
}

var render = function(){
	
	var outerw  = window.innerWidth;
	var outerh = window.innerHeight;
	var window_aspect_ratio = outerh/outerw
	
	bodydiv = document.getElementById("bodydiv");
	canvas.width = bodydiv.offsetWidth - 30;
	canvas.height = canvas.width * (window_aspect_ratio)
	
	ctx.textAlign = "left";
	ctx.fillStyle = "rgb(230, 170, 100)"; // blank color for the canvas
	ctx.fillRect(0,0,canvas.width,canvas.height);
	ctx.lineWidth = 1;
	
	if (typeof board !== 'undefined' && typeof player !== 'undefined'){
		
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
						
						var cplayer = players[board[i][j]];
					
						ctx.beginPath();
						ctx.fillStyle = cplayer.color;
						ctx.arc( tra_x(i*TILE_SIZE + TILE_SIZE/2), tra_y(j*TILE_SIZE + TILE_SIZE/2), TILE_SIZE/2, 0, 6.28	 )
						ctx.fill()

						ctx.strokeStyle = "#000000"
						ctx.arc( tra_x(i*TILE_SIZE + TILE_SIZE/2), tra_y(j*TILE_SIZE + TILE_SIZE/2), TILE_SIZE/2, 0, 6.28	 )
						ctx.stroke();
						
						var recentx = mostrecentmovesX[ cplayer.id ]; var recenty = mostrecentmovesY[ cplayer.id ];
						
						if (i == recentx && j == recenty){
						
							ctx.beginPath();
							ctx.fillStyle = invertColor(cplayer.color);
							ctx.arc( tra_x(i*TILE_SIZE + TILE_SIZE/2), tra_y(j*TILE_SIZE + TILE_SIZE/2), TILE_SIZE/4, 0, 6.28	 )
							ctx.fill()
						
						}
					}
				} else{
					
				}
			}
		}
		ctx.beginPath();
		ctx.fillStyle = "#ffffff"
		if (currentplayerid == player.id){
			ctx.fillStyle = player.color + Math.floor( 16 + Math.floor(200 * Math.abs(Math.sin(animtick/10))) ).toString(16);
			ctx.arc( tra_x(tilehoverX*TILE_SIZE + TILE_SIZE/2), tra_y(tilehoverY*TILE_SIZE + TILE_SIZE/2), TILE_SIZE/2, 0, 6.28	 )
			ctx.fill()
		}
		ctx.strokeStyle = "#000000"
		ctx.arc( tra_x(tilehoverX*TILE_SIZE + TILE_SIZE/2), tra_y(tilehoverY*TILE_SIZE + TILE_SIZE/2), TILE_SIZE/2, 0, 6.28	 )
		ctx.stroke();
	}
	// buttons and stuff
	
	ctx.fillStyle = "rgb(255, 255, 255)";
	for (i = 0; i < screen.elements.length; i++){
		btn = screen.elements[i];
		ctx.font = "bold " + btn.fontsize + "px Courier New";
		if (btn.visible){
			ctx.fillStyle = btn.color;
			ctx.fillRect(btn.x, btn.y, btn.width, btn.height);
			for (s = 0; s < btn.text.length; s++){
				var txt = btn.text[s];
				ctx.fillStyle = "#eeffff";
				ctx.fillText(txt, btn.x+8, btn.y+32+(s*32));
			}
			ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);
		}
	}
	var count = 0;
	for (index in players){
		ctx.beginPath();
		if (players[index].id == currentplayerid){
			ctx.fillStyle = players[index].color + Math.floor( 16 + Math.floor(200 * Math.abs(Math.sin(animtick/10))) ).toString(16);
		}else{
			ctx.fillStyle = players[index].color;
		}
		
		ctx.arc( 56, 56+(count*32), 10, 0, 6.28);
		ctx.fill()
		count++;
	}
	
	if (textfadetimer > 0){
		ctx.fillStyle = textcolor + Math.min(255, Math.floor(16 + textfadetimer/TEXT_FADE_TIME * 240 )).toString(16);
		ctx.font = "bold " + (textsize * canvas.width/1000) + "px Verdana";
		ctx.textAlign = "center";
		
		outStr = messagebuffer
		
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
}

class TextBox {
	constructor ( x, y, text, width, height ){
		this.x = x;
		this.y = y;
		if (width) { this.width = width } else { this.width = 512 };
		if (height) { this.height = height } else { this.height = 64 };
		this.text = text;
		this.color = "#11001155";
		this.visible = true;
		this.fontsize = 20;
	}

	onClick(){
	
	}
	update(){

	}
}
var initGUI = function(){
	screen_MAIN = {
		elements: []
	}
	b = new TextBox(32, 32, [], 320, 512); // list of players box
	b.update = function(){
		
		this.visible = (canvas.width > 500 && players && socket.connected);
		if (players){ if (Object.keys(players).length <= 0){ this.visible = false; }};
		
		this.text = [];
		
		this.height = 0;
		var count = 0;
		for (index in players){
			this.text[count] = "   " + players[index].name + "(ID: " + players[index].id + ")";
			this.height += 40;
			
			if (player){
				if (player.id == players[index].id){
					this.text[count]+="(You)";
				}
			}
			count++;
		}
	
	}
	screen_MAIN.elements.push(b);
	
	t = new TextBox(32, 32, [], 128, 48); // move timer
	t.fontsize = 35;
	t.update = function(){
		this.visible = false;
		if (player){
			if (players[currentplayerid]){
			this.visible = (canvas.width > 400 && player.id == players[currentplayerid].id);
			}
		}
		this.y = canvas.height - 80
		minutetext = Math.floor(movetimer / (60*20)).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false});
		secondtext = Math.ceil(movetimer / (20)).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false});
		
		this.text[0] = minutetext + ":" + secondtext;
	}
	screen_MAIN.elements.push(t);
}
// The following two functions are by Onur Yıldırım from the thread https://stackoverflow.com/questions/35969656/how-can-i-generate-the-opposite-color-according-to-current-color
function invertColor(hex) {
    if (hex.indexOf('#') === 0) {
        hex = hex.slice(1);
    }
    // convert 3-digit hex to 6-digits.
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length !== 6) {
        throw new Error('Invalid HEX color.');
    }
    // invert color components
    var r = (255 - parseInt(hex.slice(0, 2), 16)).toString(16),
        g = (255 - parseInt(hex.slice(2, 4), 16)).toString(16),
        b = (255 - parseInt(hex.slice(4, 6), 16)).toString(16);
    // pad each with zeros and return
    return '#' + padZero(r) + padZero(g) + padZero(b);
}

function padZero(str, len) {
    len = len || 2;
    var zeros = new Array(len).join('0');
    return (zeros + str).slice(-len);
}

startClient();