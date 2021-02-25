var socket;

var canvas;
var ctx;

var player;
var players;
var board;

var startClient = function(){
	canvas = document.getElementById("Canvas");
	//canvas.style = "position: absolute; top: 0px; left: 0px; right: 0px; bottom: 0px; margin: auto;"
	ctx = canvas.getContext("2d");
	ctx.imageSmoothingEnabled = false;
	ctx.mozImageSmoothingEnabled = false;
	
	server_connect();
	
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
	socket = io.connect("http://localhost:23456", {
    reconnection: false });
	
	socket.on("connect", function(){
		
	});
	socket.on("playerJoin", function(playerJoining, serverPlayerList, serverBoard){
		
		players = serverPlayerList;
		
		if (typeof player === 'undefined'){
			player = playerJoining;
			board = serverBoard;
		}
	});
}

var update = function(){
	
}

var render = function(){
	ctx.fillStyle = "rgb(0, 0, 0)"; // one blank color for the canvas
	ctx.fillRect(0,0,canvas.width,canvas.height);
	ctx.fillStyle = "rgb(255, 0, 255)";
	if (typeof board !== 'undefined'){
		for (i=0;i<board.length;i++){
			for (j=0;j<board[i].length;j++){
					
				ctx.font = "12px Helvetica";
				ctx.fillText("Hi",i*32,j*32);
			}
		}
	}
}

startClient();